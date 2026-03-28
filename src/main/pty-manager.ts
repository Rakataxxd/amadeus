import { fork, ChildProcess } from 'child_process';
import * as path from 'path';
import { ShellConfig } from '../shared/types.js';

// Uses a child Node.js process to run node-pty, avoiding Electron ABI mismatch
export class PtyManager {
  private worker: ChildProcess | null = null;
  private terminals = new Map<string, { shellId: string; pid?: number }>();
  private nextId = 1;
  private ready = false;
  private pendingCreates: Array<() => void> = [];

  onData: (terminalId: string, data: string) => void = () => {};
  onExit: (terminalId: string, exitCode: number) => void = () => {};
  onError: (terminalId: string, message: string) => void = () => {};
  onCreated: (terminalId: string, shellId: string, pid: number) => void = () => {};

  start(): void {
    // Fork the worker using system Node (not Electron's node)
    // The compiled worker will be at dist/main/main/pty-worker.js
    let workerPath = path.join(__dirname, 'pty-worker.js');

    // In packaged app, the worker is in app.asar but we need the unpacked version
    // (system Node can't read from inside asar)
    if (workerPath.includes('app.asar')) {
      workerPath = workerPath.replace('app.asar', 'app.asar.unpacked');
    }

    this.worker = fork(workerPath, [], {
      execPath: 'node',
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      silent: true,
    });

    this.worker.on('message', (msg: any) => {
      switch (msg.type) {
        case 'ready':
          this.ready = true;
          // Process any pending creates
          for (const fn of this.pendingCreates) fn();
          this.pendingCreates = [];
          break;
        case 'created':
          this.terminals.set(msg.id, {
            ...this.terminals.get(msg.id)!,
            pid: msg.pid,
          });
          this.onCreated(msg.id, this.terminals.get(msg.id)!.shellId, msg.pid);
          break;
        case 'data':
          this.onData(msg.id, msg.data);
          break;
        case 'exit':
          this.terminals.delete(msg.id);
          this.onExit(msg.id, msg.exitCode);
          break;
        case 'error':
          this.onError(msg.id, msg.message);
          break;
      }
    });

    this.worker.on('error', (err) => {
      console.error('PTY worker error:', err);
    });

    this.worker.stderr?.on('data', (data: Buffer) => {
      console.error('PTY worker stderr:', data.toString());
    });
  }

  create(shellId: string, shellConfig: ShellConfig, elevated: boolean, cwd?: string): string {
    const terminalId = `term-${this.nextId++}`;
    if (elevated) console.warn(`Elevated terminals not yet implemented, spawning ${shellId} normally`);

    this.terminals.set(terminalId, { shellId });

    const doCreate = () => {
      this.worker?.send({
        type: 'create',
        id: terminalId,
        command: shellConfig.command,
        args: shellConfig.args,
        env: shellConfig.env || {},
        cwd: cwd || undefined,
      });
    };

    if (this.ready) {
      doCreate();
    } else {
      this.pendingCreates.push(doCreate);
    }

    return terminalId;
  }

  write(terminalId: string, data: string): void {
    this.worker?.send({ type: 'write', id: terminalId, data });
  }

  resize(terminalId: string, cols: number, rows: number): void {
    this.worker?.send({ type: 'resize', id: terminalId, cols, rows });
  }

  close(terminalId: string): void {
    this.worker?.send({ type: 'close', id: terminalId });
    this.terminals.delete(terminalId);
  }

  getPid(terminalId: string): number | undefined {
    return this.terminals.get(terminalId)?.pid;
  }

  closeAll(): void {
    for (const [id] of this.terminals) {
      this.close(id);
    }
    this.worker?.kill();
    this.worker = null;
  }
}
