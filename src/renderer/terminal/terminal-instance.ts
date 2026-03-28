import { Terminal } from '@xterm/xterm';
import { WebglAddon } from '@xterm/addon-webgl';
import { FitAddon } from '@xterm/addon-fit';
import type { ProfileConfig } from '../../shared/types.js';

// Track active WebGL contexts across all terminal instances
let activeWebGLContexts = 0;
const MAX_WEBGL_CONTEXTS = 16;


export class TerminalInstance {
  readonly terminal: Terminal;
  private fitAddon: FitAddon;
  private webglAddon: WebglAddon | null = null;
  private terminalId: string | null = null;
  private container: HTMLElement;
  private usingWebGL = false;
  private _userTyped = false;
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  onPromptReady: (() => void) | null = null;
  onUserInput: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.terminal = new Terminal({
      allowTransparency: false,
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#c0c0c0',
        cursor: '#c0c0c0',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(100, 140, 255, 0.3)',
      },
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      scrollback: 5000,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(container);

    // Force thin scrollbar — xterm uses custom scrollbar elements
    setTimeout(() => {
      const scrollbar = container.querySelector('.scrollbar.vertical') as HTMLElement;
      if (scrollbar) {
        scrollbar.style.width = '4px';
        scrollbar.style.right = '0';
        const slider = scrollbar.querySelector('.slider') as HTMLElement;
        if (slider) {
          slider.style.width = '4px';
          slider.style.borderRadius = '2px';
          slider.style.background = 'rgba(255,255,255,0.1)';
          slider.style.left = '0';
        }
      }
      // Also hide native scrollbar on viewport
      const viewport = container.querySelector('.xterm-viewport') as HTMLElement;
      if (viewport) viewport.style.overflowY = 'hidden';
    }, 100);

    // Do NOT load WebGL by default — it doesn't support transparent backgrounds.
    // We use the canvas renderer which does support allowTransparency.
  }

  private tryWebGL(): void {
    if (activeWebGLContexts >= MAX_WEBGL_CONTEXTS) {
      return; // Fall back to canvas renderer
    }

    try {
      this.webglAddon = new WebglAddon();
      this.webglAddon.onContextLoss(() => {
        this.disposeWebGL();
      });
      this.terminal.loadAddon(this.webglAddon);
      activeWebGLContexts++;
      this.usingWebGL = true;
    } catch {
      this.webglAddon = null;
      this.usingWebGL = false;
    }
  }

  private disposeWebGL(): void {
    if (this.webglAddon) {
      try {
        this.webglAddon.dispose();
      } catch {
        // ignore
      }
      this.webglAddon = null;
      if (this.usingWebGL) {
        activeWebGLContexts = Math.max(0, activeWebGLContexts - 1);
        this.usingWebGL = false;
      }
    }
  }

  attachPty(terminalId: string): void {
    this.terminalId = terminalId;

    this.terminal.onData((data: string) => {
      if (this.terminalId) {
        window.amadeus.terminal.write(this.terminalId, data);
      }
      // Detect user pressing Enter (command execution)
      if (data.includes('\r') || data.includes('\n')) {
        this._userTyped = true;
        this.onUserInput?.();
      }
    });

    this.terminal.onResize(({ cols, rows }) => {
      if (this.terminalId) {
        window.amadeus.terminal.resize(this.terminalId, cols, rows);
      }
    });

    // Ctrl+V to paste, Ctrl+C to copy (when there's a selection)
    this.terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.type !== 'keydown') return true;
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === 'v') {
          e.preventDefault();
          this.pasteClipboard();
          return false;
        }
        if (e.key === 'c' && this.terminal.hasSelection()) {
          e.preventDefault();
          this.copySelection();
          return false;
        }
      }
      return true;
    });
  }

  write(data: string): void {
    this.terminal.write(data);
    if (!this._userTyped) return;

    // After user typed, wait for output to stop for 2s = command done
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      this._userTyped = false;
      this.onPromptReady?.();
    }, 2000);
  }

  fit(): void {
    try {
      this.fitAddon.fit();
    } catch {
      // ignore layout errors during fit
    }
  }

  applyProfile(profile: ProfileConfig): void {
    this.terminal.options.fontSize = profile.font_size;
    this.terminal.options.fontFamily = profile.font;

    const cursorStyleMap = {
      block: 'block' as const,
      underline: 'underline' as const,
      bar: 'bar' as const,
    };
    this.terminal.options.cursorStyle = cursorStyleMap[profile.cursor_style] ?? 'block';

    this.terminal.options.theme = {
      background: profile.background?.color || '#000000',
      foreground: profile.text_color || '#c0c0c0',
      cursor: profile.cursor_color || '#c0c0c0',
      cursorAccent: '#000000',
      selectionBackground: 'rgba(100, 140, 255, 0.3)',
    };
  }

  focus(): void {
    this.terminal.focus();
  }

  blur(): void {
    this.terminal.blur();
  }

  copySelection(): void {
    const sel = this.terminal.getSelection();
    if (sel) {
      navigator.clipboard.writeText(sel).catch(() => {
        // clipboard write may fail in restricted context
      });
    }
  }

  pasteClipboard(): void {
    navigator.clipboard.readText().then(text => {
      if (this.terminalId) {
        window.amadeus.terminal.write(this.terminalId, text);
      }
    }).catch(() => {
      // ignore clipboard read errors
    });
  }

  getTerminalId(): string | null {
    return this.terminalId;
  }

  dispose(): void {
    this.disposeWebGL();
    try {
      this.terminal.dispose();
    } catch {
      // ignore
    }
  }
}
