import { Terminal } from '@xterm/xterm';
import { WebglAddon } from '@xterm/addon-webgl';
import { FitAddon } from '@xterm/addon-fit';
import type { ProfileConfig } from '../../shared/types.js';

// Track active WebGL contexts across all terminal instances
let activeWebGLContexts = 0;
const MAX_WEBGL_CONTEXTS = 16;

export class TerminalInstance {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private webglAddon: WebglAddon | null = null;
  private terminalId: string | null = null;
  private container: HTMLElement;
  private usingWebGL = false;

  constructor(container: HTMLElement) {
    this.container = container;

    this.terminal = new Terminal({
      allowTransparency: true,
      cursorBlink: true,
      theme: {
        background: 'transparent',
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

    this.tryWebGL();
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
    });

    this.terminal.onResize(({ cols, rows }) => {
      if (this.terminalId) {
        window.amadeus.terminal.resize(this.terminalId, cols, rows);
      }
    });
  }

  write(data: string): void {
    this.terminal.write(data);
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
      background: 'transparent',
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
