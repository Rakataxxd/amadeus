import { CanvasManager } from './canvas/canvas-manager.js';
import { KeybindingManager } from './keybindings/keybinding-manager.js';
import { ShellPicker } from './ui/shell-picker.js';
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
    window.amadeus.terminal.create(shell.id, shell.elevated);
  });

  // Request shell list
  window.amadeus.shell.list();

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
