import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { ConfigManager } from './config-parser.js';
import { PtyManager } from './pty-manager.js';
import { LayoutStore } from './layout-store.js';
import { registerIpcHandlers } from './ipc-handlers.js';

let mainWindow: BrowserWindow | null = null;
const configManager = new ConfigManager();
const ptyManager = new PtyManager();
const layoutStore = new LayoutStore();

function createWindow(): void {
  configManager.load();
  configManager.watch();
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, frame: false, transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });
  registerIpcHandlers(ptyManager, configManager, layoutStore, () => mainWindow);
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.on('closed', () => { mainWindow = null; ptyManager.closeAll(); configManager.stopWatching(); });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
