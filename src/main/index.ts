import { app, BrowserWindow, ipcMain, dialog } from 'electron';
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
  ptyManager.start();
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, frame: false, transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });
  registerIpcHandlers(ptyManager, configManager, layoutStore, () => mainWindow);

  // Debug logging
  console.log('[MAIN] Config loaded, shells:', Object.keys(configManager.current.shells));
  console.log('[MAIN] PTY worker started');

  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:toggleMaximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // File picker for background images
  ipcMain.handle('dialog:pickImage', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Elegir imagen de fondo',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return '';
    return result.filePaths[0];
  });

  mainWindow.loadFile(path.join(__dirname, '../../renderer/renderer/index.html'));
  // mainWindow.webContents.openDevTools({ mode: 'bottom' });
  mainWindow.on('closed', () => { mainWindow = null; ptyManager.closeAll(); configManager.stopWatching(); });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
