// pty-worker.ts — Runs as a child process using system Node.js
// This avoids ABI mismatch between node-pty and Electron's Node.js
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// In packaged app, node-pty is in app.asar.unpacked/node_modules/
// We need to resolve the correct path before requiring it
function loadNodePty(): typeof import('node-pty') {
  // Try unpacked path first (packaged app)
  const unpackedPath = path.join(__dirname, '..', '..', '..', 'app.asar.unpacked', 'node_modules', 'node-pty');
  if (fs.existsSync(unpackedPath)) {
    return require(unpackedPath);
  }
  // Fallback to normal require (dev mode)
  return require('node-pty');
}

const pty = loadNodePty();

interface CreateMsg {
  type: 'create';
  id: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
}


interface WriteMsg {
  type: 'write';
  id: string;
  data: string;
}

interface ResizeMsg {
  type: 'resize';
  id: string;
  cols: number;
  rows: number;
}

interface CloseMsg {
  type: 'close';
  id: string;
}

type InMsg = CreateMsg | WriteMsg | ResizeMsg | CloseMsg;

const ptys = new Map<string, any>();

process.on('message', (msg: InMsg) => {
  switch (msg.type) {
    case 'create': {
      try {
        const env = { ...process.env, ...msg.env } as Record<string, string>;
        const cwd = msg.cwd && fs.existsSync(msg.cwd) ? msg.cwd : os.homedir();
        const proc = pty.spawn(msg.command, msg.args, {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd,
          env,
        });
        ptys.set(msg.id, proc);
        proc.onData((data) => {
          process.send!({ type: 'data', id: msg.id, data });
        });
        proc.onExit(({ exitCode }) => {
          ptys.delete(msg.id);
          process.send!({ type: 'exit', id: msg.id, exitCode });
        });
        process.send!({ type: 'created', id: msg.id, pid: proc.pid });
      } catch (err: any) {
        process.send!({ type: 'error', id: msg.id, message: err.message });
      }
      break;
    }
    case 'write': {
      ptys.get(msg.id)?.write(msg.data);
      break;
    }
    case 'resize': {
      try { ptys.get(msg.id)?.resize(msg.cols, msg.rows); } catch {}
      break;
    }
    case 'close': {
      const p = ptys.get(msg.id);
      if (p) { p.kill(); ptys.delete(msg.id); }
      break;
    }
  }
});

process.send!({ type: 'ready' });
