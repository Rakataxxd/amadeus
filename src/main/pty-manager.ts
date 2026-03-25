import * as pty from 'node-pty';
import * as os from 'os';
import { ShellConfig } from '../shared/types.js';

export class PtyManager {
  private ptys = new Map<string, { id: string; shellId: string; process: pty.IPty; elevated: boolean }>();
  private nextId = 1;

  onData: (terminalId: string, data: string) => void = () => {};
  onExit: (terminalId: string, exitCode: number) => void = () => {};
  onError: (terminalId: string, message: string) => void = () => {};

  create(shellId: string, shellConfig: ShellConfig, elevated: boolean): string | null {
    const terminalId = `term-${this.nextId++}`;
    if (elevated) console.warn(`Elevated terminals not yet implemented, spawning ${shellId} normally`);
    try {
      const env = { ...process.env, ...shellConfig.env } as Record<string, string>;
      const proc = pty.spawn(shellConfig.command, shellConfig.args, {
        name: 'xterm-256color', cols: 80, rows: 24, cwd: os.homedir(), env,
      });
      this.ptys.set(terminalId, { id: terminalId, shellId, process: proc, elevated });
      proc.onData((data) => this.onData(terminalId, data));
      proc.onExit(({ exitCode }) => { this.ptys.delete(terminalId); this.onExit(terminalId, exitCode); });
      return terminalId;
    } catch (err: any) {
      this.onError(terminalId, `Failed to spawn ${shellId}: ${err.message}`);
      return null;
    }
  }

  write(terminalId: string, data: string): void { this.ptys.get(terminalId)?.process.write(data); }
  resize(terminalId: string, cols: number, rows: number): void { try { this.ptys.get(terminalId)?.process.resize(cols, rows); } catch {} }
  close(terminalId: string): void { const m = this.ptys.get(terminalId); if (m) { m.process.kill(); this.ptys.delete(terminalId); } }
  getPid(terminalId: string): number | undefined { return this.ptys.get(terminalId)?.process.pid; }
  closeAll(): void { for (const [id] of this.ptys) this.close(id); }
}
