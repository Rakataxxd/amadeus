import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
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

  // Anime themes resource path (works in dev and packaged)
  ipcMain.handle('app:getAnimeThemesPath', () => {
    const isDev = !app.isPackaged;
    const basePath = isDev
      ? path.join(app.getAppPath(), 'resources', 'anime-themes')
      : path.join(process.resourcesPath, 'resources', 'anime-themes');
    return basePath.replace(/\\/g, '/');
  });

  // Session persistence
  const sessionFile = path.join(app.getPath('userData'), 'session.json');

  ipcMain.handle('session:save', (_e, data: unknown) => {
    try { fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2), 'utf-8'); } catch { /* ignore */ }
  });

  ipcMain.handle('session:load', () => {
    try {
      if (fs.existsSync(sessionFile)) return JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    } catch { /* ignore */ }
    return null;
  });

  // Save window bounds on close
  mainWindow.on('close', () => {
    try {
      const bounds = mainWindow!.getBounds();
      const maximized = mainWindow!.isMaximized();
      const winState = { bounds, maximized };
      const existing = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile, 'utf-8')) : {};
      existing.windowState = winState;
      fs.writeFileSync(sessionFile, JSON.stringify(existing, null, 2), 'utf-8');
    } catch { /* ignore */ }
  });

  // Restore window bounds
  try {
    if (fs.existsSync(sessionFile)) {
      const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      if (session.windowState) {
        const { bounds, maximized } = session.windowState;
        if (bounds) mainWindow.setBounds(bounds);
        if (maximized) mainWindow.maximize();
      }
    }
  } catch { /* ignore */ }

  // Custom themes storage
  const customThemesFile = path.join(app.getPath('userData'), 'custom-themes.json');

  ipcMain.handle('themes:loadCustom', () => {
    try {
      if (fs.existsSync(customThemesFile)) {
        return JSON.parse(fs.readFileSync(customThemesFile, 'utf-8'));
      }
    } catch { /* ignore */ }
    return {};
  });

  ipcMain.handle('themes:saveCustom', (_e, themes: Record<string, unknown>) => {
    fs.writeFileSync(customThemesFile, JSON.stringify(themes, null, 2), 'utf-8');
  });

  ipcMain.handle('themes:deleteCustom', (_e, name: string) => {
    try {
      if (fs.existsSync(customThemesFile)) {
        const themes = JSON.parse(fs.readFileSync(customThemesFile, 'utf-8'));
        delete themes[name];
        fs.writeFileSync(customThemesFile, JSON.stringify(themes, null, 2), 'utf-8');
      }
    } catch { /* ignore */ }
  });

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
