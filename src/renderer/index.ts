import { CanvasManager } from './canvas/canvas-manager.js';
import { KeybindingManager } from './keybindings/keybinding-manager.js';
import { ShellPicker } from './ui/shell-picker.js';
import { SettingsPanel } from './ui/settings-panel.js';
import { WorkspaceManager } from './ui/workspace-manager.js';
import type {
  AmadeusConfig,
  ShellInfo,
  TerminalInfo,
} from '../shared/types.js';

// ────────────────────────────────────────────────────────────────────────────
// Window type augmentation for the contextBridge API
// ────────────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    amadeus: {
      terminal: {
        create: (shellId: string, elevated: boolean, cwd?: string) => void;
        write: (terminalId: string, data: string) => void;
        resize: (terminalId: string, cols: number, rows: number) => void;
        close: (terminalId: string) => void;
        onData: (cb: (terminalId: string, data: string) => void) => void;
        onCreated: (cb: (info: TerminalInfo) => void) => void;
        onExited: (cb: (terminalId: string, exitCode: number) => void) => void;
      };
      config: {
        get: () => void;
        onUpdate: (cb: (config: AmadeusConfig) => void) => void;
        onCurrent: (cb: (config: AmadeusConfig) => void) => void;
      };
      layout: {
        save: (name: string, layout: unknown) => void;
        load: (name: string) => void;
        onData: (cb: (name: string, terminals: unknown[]) => void) => void;
      };
      shell: {
        list: () => void;
        onAvailable: (cb: (shells: ShellInfo[]) => void) => void;
      };
      onError: (cb: (error: unknown) => void) => void;
      app: {
        getAnimeThemesPath: () => Promise<string>;
      };
      session: {
        save: (data: any) => Promise<void>;
        load: () => Promise<any>;
      };
      themes: {
        loadCustom: () => Promise<Record<string, any>>;
        saveCustom: (themes: Record<string, any>) => Promise<void>;
        deleteCustom: (name: string) => Promise<void>;
      };
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ────────────────────────────────────────────────────────────────────────────
function bootstrap(): void {
  const canvasEl = document.getElementById('canvas');
  const pickerEl = document.getElementById('shell-picker');
  const tabsContainer = document.getElementById('tabs-container');

  if (!canvasEl || !pickerEl || !tabsContainer) {
    console.error('Amadeus: required DOM elements not found');
    return;
  }

  // ── Workspace / tab manager ───────────────────────────────────────────────
  const workspaceManager = new WorkspaceManager(canvasEl, tabsContainer);

  // Map of workspace id -> CanvasManager
  const canvasManagers = new Map<number, CanvasManager>();

  // Track last applied config for new workspaces
  let lastConfig: AmadeusConfig | null = null;

  // Create the initial CanvasManager for workspace 1
  const initialWs = workspaceManager.getActiveWorkspace()!;
  const initialCanvas = new CanvasManager(initialWs);
  canvasManagers.set(workspaceManager.getActiveId(), initialCanvas);

  let activeCanvas = initialCanvas;

  const getCanvas = (): CanvasManager => activeCanvas;

  // New tab button
  document.getElementById('btn-new-tab')?.addEventListener('click', () => {
    const id = workspaceManager.createWorkspace();
    const ws = workspaceManager.getActiveWorkspace()!;
    const cm = new CanvasManager(ws);
    if (lastConfig) cm.applyConfig(lastConfig);
    canvasManagers.set(id, cm);
    activeCanvas = cm;
  });

  // Tab changed
  workspaceManager.onTabChanged = (tabId) => {
    const cm = canvasManagers.get(tabId);
    if (cm) activeCanvas = cm;
  };

  const keybindings = new KeybindingManager();
  const shellPicker = new ShellPicker(pickerEl);

  // ── Config ────────────────────────────────────────────────────────────────
  const applyConfig = (config: AmadeusConfig): void => {
    lastConfig = config;
    // Apply to all existing canvas managers
    for (const cm of canvasManagers.values()) {
      cm.applyConfig(config);
    }
    keybindings.applyConfig(config.keybindings);

    // If a start layout is specified, load it on the active canvas
    if (config.general?.start_layout) {
      getCanvas().loadLayout(config.general.start_layout);
    }
  };

  window.amadeus.config.onCurrent((config) => applyConfig(config));
  window.amadeus.config.onUpdate((config) => applyConfig(config));

  // Request config immediately
  window.amadeus.config.get();

  // ── Layout listener (registered once) ────────────────────────────────────
  initialCanvas.initLayoutListener();

  // ── Terminal data/lifecycle ───────────────────────────────────────────────
  window.amadeus.terminal.onData((terminalId, data) => {
    for (const cm of canvasManagers.values()) {
      cm.writeToTerminal(terminalId, data);
    }
  });

  window.amadeus.terminal.onCreated((info: TerminalInfo) => {
    // The active canvas is the one that issued the create request
    activeCanvas.attachPty(info.terminalId, info.shellId);
  });

  window.amadeus.terminal.onExited((terminalId) => {
    for (const cm of canvasManagers.values()) {
      cm.handleTerminalExit(terminalId);
    }
  });

  // ── Keybindings ───────────────────────────────────────────────────────────
  keybindings.on('new_terminal', () => shellPicker.show());

  keybindings.on('close_terminal', () => getCanvas().closeActiveTerminal());

  keybindings.on('next_terminal', () => getCanvas().focusNext());

  keybindings.on('prev_terminal', () => getCanvas().focusPrev());

  keybindings.on('save_layout', () => {
    const name = prompt('Save layout as:');
    if (name) getCanvas().saveLayout(name);
  });

  keybindings.on('load_layout', () => {
    const name = prompt('Load layout name:');
    if (name) getCanvas().loadLayout(name);
  });

  keybindings.on('fullscreen', () => {
    // Toggle fullscreen via the document API
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // ignore fullscreen errors
      });
    } else {
      document.exitFullscreen().catch(() => {
        // ignore
      });
    }
  });

  keybindings.on('reload_config', () => {
    window.amadeus.config.get();
  });

  keybindings.on('copy', () => getCanvas().copyFromActive());

  keybindings.on('paste', () => getCanvas().pasteToActive());

  // ── Shell picker ──────────────────────────────────────────────────────────
  window.amadeus.shell.onAvailable((shells: ShellInfo[]) => {
    shellPicker.setShells(shells);
  });

  shellPicker.onSelect((shell: ShellInfo) => {
    getCanvas().createTerminal(shell.id, shell.elevated);
  });

  // Request shell list
  window.amadeus.shell.list();

  // ── Settings panel ───────────────────────────────────────────────────────
  const settingsPanel = new SettingsPanel();

  settingsPanel.onChange = (changes) => {
    const canvas = getCanvas();
    const container = canvas.getActiveContainer();
    if (!container) return;
    applyVisualChanges(container, changes);
  };

  const applyVisualChanges = (container: any, changes: any) => {
    const inst = container.getTerminalInstance();
    const el = container.element;

    // Background
    if (changes.bgColor !== undefined) {
      const body = el.querySelector('.terminal-body') as HTMLElement;
      if (body) body.style.backgroundColor = changes.bgColor;
      if (inst) inst.terminal.options.theme = { ...inst.terminal.options.theme, background: changes.bgColor };
    }
    if (changes.bgImage !== undefined) {
      const bgImg = el.querySelector('.bg-image') as HTMLImageElement;
      if (bgImg) {
        let src = changes.bgImage.replace(/\\/g, '/');
        if (!src.startsWith('file:///') && !src.startsWith('http')) src = 'file:///' + src;
        bgImg.src = src;
        bgImg.style.display = '';
      }
    }
    if (changes.bgOpacity !== undefined) {
      const bgImg = el.querySelector('.bg-image') as HTMLElement;
      if (bgImg) bgImg.style.opacity = String(changes.bgOpacity);
    }
    if (changes.bgSize !== undefined) {
      const bgImg = el.querySelector('.bg-image') as HTMLImageElement;
      if (bgImg) bgImg.style.objectFit = changes.bgSize === 'cover' ? 'cover' : 'contain';
    }
    if (changes.bgPosition !== undefined) {
      const bgImg = el.querySelector('.bg-image') as HTMLElement;
      if (bgImg) bgImg.style.objectPosition = changes.bgPosition;
    }

    // Overlay
    if (changes.overlayImage !== undefined) {
      const ov = el.querySelector('.overlay-layer') as HTMLElement;
      if (ov) ov.style.backgroundImage = `url("${changes.overlayImage.replace(/\\/g, '/')}")`;
    }
    if (changes.overlayOpacity !== undefined) {
      const ov = el.querySelector('.overlay-layer') as HTMLElement;
      if (ov) ov.style.opacity = String(changes.overlayOpacity);
    }
    if (changes.scanlines !== undefined) {
      const body = el.querySelector('.terminal-body') as HTMLElement;
      if (body) {
        if (changes.scanlines) body.classList.add('scanlines');
        else body.classList.remove('scanlines');
      }
    }

    // Window
    if (changes.opacity !== undefined) el.style.opacity = String(changes.opacity);
    if (changes.blur !== undefined) el.style.backdropFilter = `blur(${changes.blur}px)`;
    if (changes.borderColor !== undefined) el.style.borderColor = changes.borderColor;
    if (changes.borderWidth !== undefined) el.style.borderWidth = `${changes.borderWidth}px`;
    if (changes.borderRadius !== undefined) el.style.borderRadius = `${changes.borderRadius}px`;
    if (changes.boxShadow !== undefined) el.style.boxShadow = changes.boxShadow;
    if (changes.titlebarColor !== undefined) {
      const tb = el.querySelector('.terminal-titlebar') as HTMLElement;
      if (tb) { tb.style.backgroundColor = changes.titlebarColor; tb.style.borderBottomColor = changes.titlebarColor; }
    }
    if (changes.padding !== undefined) {
      const xtermLayer = el.querySelector('.xterm-layer') as HTMLElement;
      if (xtermLayer) { xtermLayer.style.padding = `${changes.padding}px`; inst?.fit(); }
    }

    // Text
    if (changes.textColor !== undefined && inst) {
      inst.terminal.options.theme = { ...inst.terminal.options.theme, foreground: changes.textColor };
    }
    if (changes.fontSize !== undefined && inst) {
      inst.terminal.options.fontSize = changes.fontSize;
      inst.fit();
    }
    if (changes.font !== undefined && inst) {
      inst.terminal.options.fontFamily = `${changes.font}, monospace`;
    }
    if (changes.cursorStyle !== undefined && inst) {
      inst.terminal.options.cursorStyle = changes.cursorStyle;
    }
    if (changes.cursorColor !== undefined && inst) {
      inst.terminal.options.theme = { ...inst.terminal.options.theme, cursor: changes.cursorColor };
    }
    if (changes.textGlow !== undefined) {
      const body = el.querySelector('.terminal-body') as HTMLElement;
      if (body) body.style.textShadow = changes.textGlow || '';
    }

    // Particles
    if (changes.particles !== undefined) {
      container.setParticles(changes.particles as any);
    }
    if (changes.particleColor !== undefined) {
      container.setParticleColor(changes.particleColor);
    }

    // Custom CSS
    if (changes.customCSS !== undefined) {
      let styleEl = el.querySelector('.custom-css-style') as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.className = 'custom-css-style';
        el.appendChild(styleEl);
      }
      styleEl.textContent = changes.customCSS;
    }

    // Track all visual changes on the container for session persistence
    for (const [k, v] of Object.entries(changes)) {
      container.updateVisual(k, v);
    }
  };

  settingsPanel.onPickImage = async (type) => {
    // @ts-ignore
    const filePath: string = await window.amadeus.dialog.pickImage();
    if (filePath) {
      settingsPanel.setImagePath(filePath, type);
      if (type === 'background') {
        settingsPanel.onChange({ bgImage: filePath });
      } else {
        settingsPanel.onChange({ overlayImage: filePath });
      }
    }
  };

  // ── Toolbar buttons ──────────────────────────────────────────────────────
  const btnNew = document.getElementById('btn-new-terminal');
  if (btnNew) {
    btnNew.addEventListener('click', () => shellPicker.show());
  }

  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      const canvas = getCanvas();
      const container = canvas.getActiveContainer();
      if (!container) return;
      // Build a profile from current state
      const profile = canvas.getActiveProfile() || {} as any;
      settingsPanel.toggle(profile);
    });
  }

  // Window controls (minimize, maximize, close) via Electron ipcRenderer
  document.getElementById('btn-minimize')?.addEventListener('click', () => {
    // @ts-ignore — we add these to the preload
    window.amadeus.window?.minimize();
  });
  document.getElementById('btn-maximize')?.addEventListener('click', () => {
    // @ts-ignore
    window.amadeus.window?.toggleMaximize();
  });
  document.getElementById('btn-close')?.addEventListener('click', () => {
    // @ts-ignore
    window.amadeus.window?.close();
  });

  // ── Session persistence ──────────────────────────────────────────────────

  // Save session state before window closes
  const saveSession = () => {
    const wsState = workspaceManager.getSessionState();
    const workspacesData: { id: number; name: string; terminals: any[] }[] = [];

    for (const ws of wsState.workspaces) {
      const cm = canvasManagers.get(ws.id);
      workspacesData.push({
        id: ws.id,
        name: ws.name,
        terminals: cm ? cm.getSessionTerminals() : [],
      });
    }

    window.amadeus.session.save({
      activeWorkspaceId: wsState.activeId,
      workspaces: workspacesData,
    });
  };

  window.addEventListener('beforeunload', saveSession);

  // Restore session on startup
  (async () => {
    const session = await window.amadeus.session.load();
    if (!session?.workspaces?.length) return;

    // Wait for config to be applied first
    await new Promise<void>(resolve => {
      if (lastConfig) { resolve(); return; }
      const check = setInterval(() => {
        if (lastConfig) { clearInterval(check); resolve(); }
      }, 50);
      // Timeout after 2s
      setTimeout(() => { clearInterval(check); resolve(); }, 2000);
    });

    // Restore workspaces
    const idMap = workspaceManager.restoreWorkspaces({
      workspaces: session.workspaces.map((ws: any) => ({ id: ws.id, name: ws.name })),
      activeId: session.activeWorkspaceId,
    });

    // Remove the default canvas manager (from the initial workspace that was replaced)
    canvasManagers.clear();

    // Create canvas managers and terminals for each workspace
    for (const ws of session.workspaces) {
      const newId = idMap.get(ws.id);
      if (newId === undefined) continue;

      const wsEl = workspaceManager.getWorkspaceById(newId);
      if (!wsEl) continue;

      const cm = new CanvasManager(wsEl);
      if (lastConfig) cm.applyConfig(lastConfig);
      cm.initLayoutListener();
      canvasManagers.set(newId, cm);

      // Restore terminals in this workspace
      if (ws.terminals?.length) {
        for (const lt of ws.terminals) {
          cm.createTerminalFromLayout(lt);
        }
      }
    }

    // Apply saved visual settings to restored terminals (delay to let xterm init)
    setTimeout(() => {
      for (const [, cm] of canvasManagers) {
        cm.applyVisualSettingsAll((container: any, visual: any) => {
          applyVisualChanges(container, visual);
        });
      }
    }, 500);

    // Set active canvas
    const activeNewId = idMap.get(session.activeWorkspaceId);
    if (activeNewId !== undefined) {
      const cm = canvasManagers.get(activeNewId);
      if (cm) activeCanvas = cm;
    }
  })();

  // ── Error handling ────────────────────────────────────────────────────────
  window.amadeus.onError((error) => {
    console.error('Amadeus IPC error:', error);
  });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
