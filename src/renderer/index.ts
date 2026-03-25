import { CanvasManager } from './canvas/canvas-manager.js';
import { KeybindingManager } from './keybindings/keybinding-manager.js';
import { ShellPicker } from './ui/shell-picker.js';
import { SettingsPanel } from './ui/settings-panel.js';
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
        create: (shellId: string, elevated: boolean) => void;
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
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ────────────────────────────────────────────────────────────────────────────
function bootstrap(): void {
  const canvasEl = document.getElementById('canvas');
  const pickerEl = document.getElementById('shell-picker');

  if (!canvasEl || !pickerEl) {
    console.error('Amadeus: required DOM elements not found');
    return;
  }

  const canvas = new CanvasManager(canvasEl);
  const keybindings = new KeybindingManager();
  const shellPicker = new ShellPicker(pickerEl);

  // ── Config ────────────────────────────────────────────────────────────────
  const applyConfig = (config: AmadeusConfig): void => {
    canvas.applyConfig(config);
    keybindings.applyConfig(config.keybindings);

    // If a start layout is specified, load it
    if (config.general?.start_layout) {
      canvas.loadLayout(config.general.start_layout);
    }
  };

  window.amadeus.config.onCurrent((config) => applyConfig(config));
  window.amadeus.config.onUpdate((config) => applyConfig(config));

  // Request config immediately
  window.amadeus.config.get();

  // ── Terminal data/lifecycle ───────────────────────────────────────────────
  window.amadeus.terminal.onData((terminalId, data) => {
    canvas.writeToTerminal(terminalId, data);
  });

  window.amadeus.terminal.onCreated((info: TerminalInfo) => {
    canvas.attachPty(info.terminalId, info.shellId);
  });

  window.amadeus.terminal.onExited((terminalId) => {
    canvas.handleTerminalExit(terminalId);
  });

  // ── Keybindings ───────────────────────────────────────────────────────────
  keybindings.on('new_terminal', () => shellPicker.show());

  keybindings.on('close_terminal', () => canvas.closeActiveTerminal());

  keybindings.on('next_terminal', () => canvas.focusNext());

  keybindings.on('prev_terminal', () => canvas.focusPrev());

  keybindings.on('save_layout', () => {
    const name = prompt('Save layout as:');
    if (name) canvas.saveLayout(name);
  });

  keybindings.on('load_layout', () => {
    const name = prompt('Load layout name:');
    if (name) canvas.loadLayout(name);
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

  keybindings.on('copy', () => canvas.copyFromActive());

  keybindings.on('paste', () => canvas.pasteToActive());

  // ── Shell picker ──────────────────────────────────────────────────────────
  window.amadeus.shell.onAvailable((shells: ShellInfo[]) => {
    shellPicker.setShells(shells);
  });

  shellPicker.onSelect((shell: ShellInfo) => {
    canvas.createTerminal(shell.id, shell.elevated);
  });

  // Request shell list
  window.amadeus.shell.list();

  // ── Settings panel ───────────────────────────────────────────────────────
  const settingsPanel = new SettingsPanel();

  settingsPanel.onChange = (changes) => {
    const container = canvas.getActiveContainer();
    if (!container) return;
    const inst = container.getTerminalInstance();
    const el = container.element;

    // Background
    if (changes.bgColor !== undefined) {
      const body = el.querySelector('.terminal-body') as HTMLElement;
      if (body) body.style.backgroundColor = changes.bgColor;
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
      inst.terminal.options.theme = { ...inst.terminal.options.theme, foreground: changes.textColor, background: 'transparent' };
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
      inst.terminal.options.theme = { ...inst.terminal.options.theme, cursor: changes.cursorColor, background: 'transparent' };
    }
    if (changes.textGlow !== undefined) {
      const body = el.querySelector('.terminal-body') as HTMLElement;
      if (body) body.style.textShadow = changes.textGlow || '';
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
