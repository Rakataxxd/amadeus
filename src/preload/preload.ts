import { contextBridge, ipcRenderer } from 'electron';

// IPC channel constants inlined to avoid sandbox require restrictions.
// Keep in sync with src/shared/ipc-channels.ts.
const IPC = {
  PTY_CREATE: 'pty:create',
  PTY_CREATED: 'pty:created',
  PTY_DATA: 'pty:data',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_CLOSE: 'pty:close',
  PTY_EXITED: 'pty:exited',
  CONFIG_UPDATED: 'config:updated',
  CONFIG_GET: 'config:get',
  CONFIG_CURRENT: 'config:current',
  LAYOUT_SAVE: 'layout:save',
  LAYOUT_LOAD: 'layout:load',
  LAYOUT_DATA: 'layout:data',
  SHELL_LIST: 'shell:list',
  SHELL_AVAILABLE: 'shell:available',
  ERROR: 'error',
} as const;

contextBridge.exposeInMainWorld('amadeus', {
  terminal: {
    create: (shellId: string, elevated: boolean) => ipcRenderer.send(IPC.PTY_CREATE, { shellId, elevated }),
    write: (terminalId: string, data: string) => ipcRenderer.send(IPC.PTY_WRITE, { terminalId, data }),
    resize: (terminalId: string, cols: number, rows: number) => ipcRenderer.send(IPC.PTY_RESIZE, { terminalId, cols, rows }),
    close: (terminalId: string) => ipcRenderer.send(IPC.PTY_CLOSE, { terminalId }),
    onData: (callback: (terminalId: string, data: string) => void) => ipcRenderer.on(IPC.PTY_DATA, (_e, { terminalId, data }) => callback(terminalId, data)),
    onCreated: (callback: (info: any) => void) => ipcRenderer.on(IPC.PTY_CREATED, (_e, info) => callback(info)),
    onExited: (callback: (terminalId: string, exitCode: number) => void) => ipcRenderer.on(IPC.PTY_EXITED, (_e, { terminalId, exitCode }) => callback(terminalId, exitCode)),
  },
  config: {
    get: () => ipcRenderer.send(IPC.CONFIG_GET),
    onUpdate: (callback: (config: any) => void) => ipcRenderer.on(IPC.CONFIG_UPDATED, (_e, { config }) => callback(config)),
    onCurrent: (callback: (config: any) => void) => ipcRenderer.on(IPC.CONFIG_CURRENT, (_e, { config }) => callback(config)),
  },
  layout: {
    save: (name: string, layout: any) => ipcRenderer.send(IPC.LAYOUT_SAVE, { name, terminals: layout }),
    load: (name: string) => ipcRenderer.send(IPC.LAYOUT_LOAD, { name }),
    onData: (callback: (name: string, terminals: any[]) => void) => ipcRenderer.on(IPC.LAYOUT_DATA, (_e, { name, terminals }) => callback(name, terminals)),
  },
  shell: {
    list: () => ipcRenderer.send(IPC.SHELL_LIST),
    onAvailable: (callback: (shells: any[]) => void) => ipcRenderer.on(IPC.SHELL_AVAILABLE, (_e, { shells }) => callback(shells)),
  },
  onError: (callback: (error: any) => void) => ipcRenderer.on(IPC.ERROR, (_e, error) => callback(error)),
});
