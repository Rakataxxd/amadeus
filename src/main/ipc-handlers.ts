import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-channels.js';
import { PtyManager } from './pty-manager.js';
import { ConfigManager } from './config-parser.js';
import { LayoutStore } from './layout-store.js';
import { ShellInfo } from '../shared/types.js';

export function registerIpcHandlers(
  ptyManager: PtyManager, configManager: ConfigManager,
  layoutStore: LayoutStore, getWindow: () => BrowserWindow | null
): void {
  const send = (channel: string, data: any) => getWindow()?.webContents.send(channel, data);

  ipcMain.on(IPC.PTY_CREATE, (_e, { shellId, elevated }) => {
    console.log('[IPC] PTY_CREATE received:', shellId, elevated);
    const config = configManager.current;
    const shellConfig = config.shells[shellId];
    if (!shellConfig) { console.log('[IPC] Unknown shell:', shellId); send(IPC.ERROR, { source: 'pty', message: `Unknown shell: ${shellId}` }); return; }
    console.log('[IPC] Creating PTY for:', shellConfig.command);
    ptyManager.create(shellId, shellConfig, elevated);
  });

  ipcMain.on(IPC.PTY_WRITE, (_e, { terminalId, data }) => ptyManager.write(terminalId, data));
  ipcMain.on(IPC.PTY_RESIZE, (_e, { terminalId, cols, rows }) => ptyManager.resize(terminalId, cols, rows));
  ipcMain.on(IPC.PTY_CLOSE, (_e, { terminalId }) => ptyManager.close(terminalId));

  ptyManager.onCreated = (terminalId, shellId, pid) => { console.log('[IPC] PTY created:', terminalId, shellId, pid); send(IPC.PTY_CREATED, { terminalId, shellId, pid }); };
  ptyManager.onData = (terminalId, data) => send(IPC.PTY_DATA, { terminalId, data });
  ptyManager.onExit = (terminalId, exitCode) => { console.log('[IPC] PTY exited:', terminalId, exitCode); send(IPC.PTY_EXITED, { terminalId, exitCode }); };
  ptyManager.onError = (terminalId, message) => { console.error('[IPC] PTY error:', terminalId, message); send(IPC.ERROR, { source: 'pty', terminalId, message }); };

  ipcMain.on(IPC.CONFIG_GET, () => send(IPC.CONFIG_CURRENT, { config: configManager.current }));
  configManager.onUpdate((config) => send(IPC.CONFIG_UPDATED, { config }));

  ipcMain.on(IPC.LAYOUT_SAVE, (_e, { name, terminals }) => layoutStore.save(name, terminals));
  ipcMain.on(IPC.LAYOUT_LOAD, (_e, { name }) => { const terminals = layoutStore.load(name); send(IPC.LAYOUT_DATA, { name, terminals }); });

  ipcMain.on(IPC.SHELL_LIST, () => {
    const config = configManager.current;
    const shells: ShellInfo[] = Object.entries(config.shells).map(([id, shell]) => ({
      id, name: id.charAt(0).toUpperCase() + id.slice(1),
      command: shell.command, elevated: shell.elevated, profile: shell.profile,
    }));
    send(IPC.SHELL_AVAILABLE, { shells });
  });
}
