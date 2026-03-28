import { TerminalTitlebar } from './terminal-titlebar.js';
import { TerminalInstance } from './terminal-instance.js';
import type { ProfileConfig } from '../../shared/types.js';
import { ShaderCompositor } from '../theme/shader-compositor.js';

export class TerminalContainer {
  readonly element: HTMLElement;
  readonly shellId: string;
  terminalId: string | null = null;
  readonly elevated: boolean;

  bgOffsetX = 0;
  bgOffsetY = 0;
  bgScale = 1;

  onClose: (() => void) | null = null;

  private titlebar: TerminalTitlebar;
  private body: HTMLElement;
  private bgLayer: HTMLElement;
  private bgImageEl: HTMLElement;
  private overlayLayer: HTMLElement;
  private xtermLayer: HTMLElement;
  private termInstance: TerminalInstance | null = null;
  private compositor: ShaderCompositor | null = null;

  constructor(shellId: string, shellName: string, profileName: string, elevated: boolean) {
    this.shellId = shellId;
    this.elevated = elevated;

    // Root widget element
    this.element = document.createElement('div');
    this.element.className = 'terminal-widget';

    // Titlebar
    this.titlebar = new TerminalTitlebar(shellName, profileName, elevated);
    this.titlebar.onClose = () => this.onClose?.();
    this.titlebar.onMinimize = () => {
      // Toggle visibility
      this.body.style.display = this.body.style.display === 'none' ? '' : 'none';
    };
    this.element.appendChild(this.titlebar.element);

    // Body
    this.body = document.createElement('div');
    this.body.className = 'terminal-body';

    this.bgLayer = document.createElement('div');
    this.bgLayer.className = 'bg-layer';

    this.bgImageEl = document.createElement('img');
    this.bgImageEl.className = 'bg-image';
    (this.bgImageEl as HTMLImageElement).alt = '';
    this.bgLayer.appendChild(this.bgImageEl);

    this.overlayLayer = document.createElement('div');
    this.overlayLayer.className = 'overlay-layer';

    this.xtermLayer = document.createElement('div');
    this.xtermLayer.className = 'xterm-layer';

    // xterm goes first (bottom), then bg image and overlay on top with pointer-events: none
    this.body.appendChild(this.xtermLayer);
    this.body.appendChild(this.bgLayer);
    this.body.appendChild(this.overlayLayer);
    this.element.appendChild(this.body);

    // Resize handles
    this.addResizeHandles();

    // Right-click context menu
    this.addContextMenu();
  }

  private addResizeHandles(): void {
    const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    for (const dir of directions) {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${dir}`;
      handle.dataset['direction'] = dir;
      this.element.appendChild(handle);
    }
  }

  private addContextMenu(): void {
    this.element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const menu = document.createElement('div');
      menu.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        background: #1a1a2e;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 6px;
        padding: 4px 0;
        z-index: 99999;
        min-width: 120px;
        font-size: 13px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.7);
      `;

      const copyItem = document.createElement('div');
      copyItem.textContent = 'Copy';
      copyItem.style.cssText = 'padding: 8px 14px; cursor: pointer; color: rgba(200,200,220,0.9);';
      copyItem.addEventListener('mouseenter', () => { copyItem.style.background = 'rgba(100,140,255,0.15)'; });
      copyItem.addEventListener('mouseleave', () => { copyItem.style.background = ''; });
      copyItem.addEventListener('click', () => {
        this.termInstance?.copySelection();
        document.body.removeChild(menu);
      });

      const pasteItem = document.createElement('div');
      pasteItem.textContent = 'Paste';
      pasteItem.style.cssText = 'padding: 8px 14px; cursor: pointer; color: rgba(200,200,220,0.9);';
      pasteItem.addEventListener('mouseenter', () => { pasteItem.style.background = 'rgba(100,140,255,0.15)'; });
      pasteItem.addEventListener('mouseleave', () => { pasteItem.style.background = ''; });
      pasteItem.addEventListener('click', () => {
        this.termInstance?.pasteClipboard();
        document.body.removeChild(menu);
      });

      menu.appendChild(copyItem);
      menu.appendChild(pasteItem);
      document.body.appendChild(menu);

      const removeMenu = (ev: MouseEvent) => {
        if (!menu.contains(ev.target as Node)) {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
          document.removeEventListener('mousedown', removeMenu);
        }
      };
      setTimeout(() => document.addEventListener('mousedown', removeMenu), 0);
    });
  }

  initTerminal(): TerminalInstance {
    this.termInstance = new TerminalInstance(this.xtermLayer);

    if (this.compositor) {
      this.compositor.startRenderLoop(() =>
        this.xtermLayer.querySelector('canvas') as HTMLCanvasElement | null,
      );
    }

    return this.termInstance;
  }

  getTerminalInstance(): TerminalInstance | null {
    return this.termInstance;
  }

  applyProfile(profile: ProfileConfig): void {
    // Border and frame — always applied regardless of shader mode
    this.element.style.borderColor = profile.border_color || 'rgba(255,255,255,0.12)';
    this.element.style.borderWidth = `${profile.border_width ?? 1}px`;
    this.element.style.borderRadius = `${profile.border_radius ?? 8}px`;
    if (profile.box_shadow) this.element.style.boxShadow = profile.box_shadow;
    if (profile.titlebar_color) this.titlebar.setColor(profile.titlebar_color);
    if (profile.css_animation) this.element.style.animation = profile.css_animation;

    const shadersActive =
      (profile.background_shader?.enabled && !!profile.background_shader.fragment) ||
      (profile.post_shader?.enabled && !!profile.post_shader.fragment);

    if (shadersActive) {
      // ── Shader path ──────────────────────────────────────────────────────
      if (!this.compositor) {
        try {
          this.compositor = new ShaderCompositor(this.body);
        } catch {
          // WebGL2 unavailable — fall through to DOM path
        }
      }

      if (this.compositor) {
        this.bgLayer.style.display = 'none';
        this.overlayLayer.style.backgroundImage = '';
        this.body.style.backgroundColor = profile.background?.color || '#1a1a2e';

        this.compositor.setShaders(profile);
        this.compositor.setImages(
          profile.background?.image || '',
          profile.overlay?.image || '',
        );

        this.xtermLayer.style.opacity = '0';

        if (this.termInstance) {
          this.compositor.startRenderLoop(() =>
            this.xtermLayer.querySelector('canvas') as HTMLCanvasElement | null,
          );
        }

        this.termInstance?.applyProfile(profile);
        return;
      }
    }

    // ── DOM path (no shaders or WebGL2 unavailable) ───────────────────────
    if (this.compositor) {
      this.compositor.dispose();
      this.compositor = null;
      this.xtermLayer.style.opacity = '';
      this.bgLayer.style.display = '';
    }

    this.body.style.backgroundColor = profile.background?.color || '#1a1a2e';
    this.bgLayer.style.backgroundColor = 'transparent';

    const bg = profile.background;
    if (bg?.image) {
      (this.bgImageEl as HTMLImageElement).src = bg.image;
      this.bgImageEl.style.objectFit = bg.image_size === 'contain' ? 'contain' : bg.image_size === 'cover' ? 'cover' : 'contain';
      this.bgImageEl.style.objectPosition = bg.image_position || 'center';
      this.bgImageEl.style.opacity = String(bg.image_opacity ?? 0.3);
      this.bgImageEl.style.filter = bg.image_blur ? `blur(${bg.image_blur}px)` : '';
      this.bgImageEl.style.display = '';
    } else {
      (this.bgImageEl as HTMLImageElement).src = '';
      this.bgImageEl.style.display = 'none';
    }

    const ov = profile.overlay;
    if (ov?.image) {
      this.overlayLayer.style.backgroundImage = `url("${ov.image}")`;
      this.overlayLayer.style.opacity = String(ov.opacity ?? 0.3);
    } else {
      this.overlayLayer.style.backgroundImage = '';
    }

    this.termInstance?.applyProfile(profile);
  }

  setPosition(xPct: number, yPct: number, wPct: number, hPct: number): void {
    this.element.style.left = `${xPct}%`;
    this.element.style.top = `${yPct}%`;
    this.element.style.width = `${wPct}%`;
    this.element.style.height = `${hPct}%`;
  }

  getPosition(): { x: number; y: number; width: number; height: number } {
    const parent = this.element.parentElement;
    if (!parent) return { x: 0, y: 0, width: 40, height: 40 };

    const pW = parent.clientWidth || 1;
    const pH = parent.clientHeight || 1;
    const rect = this.element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    return {
      x: ((rect.left - parentRect.left) / pW) * 100,
      y: ((rect.top - parentRect.top) / pH) * 100,
      width: (rect.width / pW) * 100,
      height: (rect.height / pH) * 100,
    };
  }

  getPixelRect(): { left: number; top: number; width: number; height: number } {
    const r = this.element.getBoundingClientRect();
    const parent = this.element.parentElement;
    const pr = parent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return {
      left: r.left - pr.left,
      top: r.top - pr.top,
      width: r.width,
      height: r.height,
    };
  }

  focus(): void {
    this.element.classList.add('focused');
    this.termInstance?.focus();
  }

  blur(): void {
    this.element.classList.remove('focused');
    this.termInstance?.blur();
  }

  fit(): void {
    this.termInstance?.fit();
  }

  copySelection(): void {
    this.termInstance?.copySelection();
  }

  pasteClipboard(): void {
    this.termInstance?.pasteClipboard();
  }

  dispose(): void {
    this.compositor?.dispose();
    this.compositor = null;
    this.termInstance?.dispose();
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
