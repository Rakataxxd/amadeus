import { TerminalTitlebar } from './terminal-titlebar.js';
import { TerminalInstance } from './terminal-instance.js';
import type { ProfileConfig, TerminalVisualSettings } from '../../shared/types.js';
import { ParticleEngine, type ParticlePreset } from '../theme/particle-engine.js';

export class TerminalContainer {
  readonly element: HTMLElement;
  readonly shellId: string;
  terminalId: string | null = null;
  readonly elevated: boolean;

  bgOffsetX = 0;
  bgOffsetY = 0;
  bgScale = 1;
  lastCwd = '';
  autoCommand = '';
  private _savedHeight = '';

  onClose: (() => void) | null = null;

  private titlebar: TerminalTitlebar;
  private body: HTMLElement;
  private bgLayer: HTMLElement;
  private bgImageEl: HTMLElement;
  private overlayLayer: HTMLElement;
  private xtermLayer: HTMLElement;
  private termInstance: TerminalInstance | null = null;
  private particleEngine: ParticleEngine;
  private _visualSettings: TerminalVisualSettings = {};

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
      const minimized = this.element.classList.toggle('minimized');
      this.body.style.display = minimized ? 'none' : '';
      if (minimized) {
        this._savedHeight = this.element.style.height;
        this.element.style.height = '28px';
        this.element.style.minHeight = '28px';
      } else {
        this.element.style.height = this._savedHeight || '400px';
        this.element.style.minHeight = '100px';
        this.termInstance?.fit();
      }
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

    // xterm goes first (bottom), then particles, bg image, overlay on top
    this.body.appendChild(this.xtermLayer);
    this.particleEngine = new ParticleEngine(this.body);
    this.body.appendChild(this.bgLayer);
    this.body.appendChild(this.overlayLayer);
    this.element.appendChild(this.body);

    // Resize handles
    this.addResizeHandles();

    // Right-click context menu
    this.addContextMenu();

    // Image dragging with Alt+Click
    this.setupImageDrag();
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

  private setupImageDrag(): void {
    let dragging = false;
    let startX = 0;
    let startY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      startX = e.clientX - this.bgOffsetX;
      startY = e.clientY - this.bgOffsetY;
      // Temporarily enable pointer events on image
      this.bgImageEl.style.pointerEvents = 'auto';
      this.bgImageEl.style.cursor = 'move';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      this.bgOffsetX = e.clientX - startX;
      this.bgOffsetY = e.clientY - startY;
      this.bgImageEl.style.transform = `translate(${this.bgOffsetX}px, ${this.bgOffsetY}px) scale(${this.bgScale})`;
    };

    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      this.bgImageEl.style.pointerEvents = 'none';
      this.bgImageEl.style.cursor = '';
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this.bgScale = Math.max(0.1, Math.min(5.0, this.bgScale + delta));
      this.bgImageEl.style.transform = `translate(${this.bgOffsetX}px, ${this.bgOffsetY}px) scale(${this.bgScale})`;
    };

    this.body.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    this.body.addEventListener('wheel', onWheel, { passive: false });
  }

  /** Read CWD from the terminal buffer by finding the last prompt line */
  getCurrentCwd(): string {
    if (!this.termInstance) return this.lastCwd;
    const buf = this.termInstance.terminal.buffer.active;
    const cursorAbsY = buf.baseY + buf.cursorY;
    // Scan from cursor position upward, checking up to 20 lines
    for (let i = cursorAbsY; i >= Math.max(0, cursorAbsY - 20); i--) {
      const line = buf.getLine(i);
      if (!line) continue;
      const text = line.translateToString(true).trim();
      if (!text) continue;
      // cmd.exe: "C:\path>" or "C:\path>some command"
      const cmdMatch = text.match(/^([A-Z]:\\[^>]*?)>/i);
      if (cmdMatch) return cmdMatch[1];
      // PowerShell: "PS C:\path>" or "PS C:\path> command"
      const psMatch = text.match(/^PS\s+([A-Z]:\\[^>]*?)>/i);
      if (psMatch) return psMatch[1];
    }
    return this.lastCwd;
  }

  initTerminal(): TerminalInstance {
    this.termInstance = new TerminalInstance(this.xtermLayer);

    // Default particles if none set
    if (!this._visualSettings.particles) {
      this.setParticles('matrix');
    }

    return this.termInstance;
  }

  getTerminalInstance(): TerminalInstance | null {
    return this.termInstance;
  }

  applyProfile(profile: ProfileConfig): void {
    // Border
    this.element.style.borderColor = profile.border_color || 'rgba(255,255,255,0.12)';
    this.element.style.borderWidth = `${profile.border_width ?? 1}px`;
    this.element.style.borderRadius = `${profile.border_radius ?? 8}px`;

    // Box shadow
    if (profile.box_shadow) {
      this.element.style.boxShadow = profile.box_shadow;
    }

    // Titlebar color
    if (profile.titlebar_color) {
      this.titlebar.setColor(profile.titlebar_color);
    }

    // Background color goes on the body (behind xterm), NOT on bgLayer (which is on top)
    this.body.style.backgroundColor = profile.background?.color || '#1a1a2e';
    this.bgLayer.style.backgroundColor = 'transparent';

    // Background image — rendered as <img> on top of xterm with pointer-events:none
    const bg = profile.background;
    if (bg?.image) {
      (this.bgImageEl as HTMLImageElement).src = bg.image;
      this.bgImageEl.style.objectFit = bg.image_size === 'contain' ? 'contain' : bg.image_size === 'cover' ? 'cover' : 'contain';
      this.bgImageEl.style.objectPosition = bg.image_position || 'center';
      this.bgImageEl.style.opacity = String(bg.image_opacity ?? 0.3);
      this.bgImageEl.style.filter = bg.image_blur ? `blur(${bg.image_blur}px)` : '';
    } else {
      (this.bgImageEl as HTMLImageElement).src = '';
      this.bgImageEl.style.display = 'none';
    }

    // Overlay
    const ov = profile.overlay;
    if (ov?.image) {
      this.overlayLayer.style.backgroundImage = `url("${ov.image}")`;
      this.overlayLayer.style.opacity = String(ov.opacity ?? 0.3);
    } else {
      this.overlayLayer.style.backgroundImage = '';
    }

    // Custom CSS animation
    if (profile.css_animation) {
      this.element.style.animation = profile.css_animation;
    }

    // Apply profile to terminal instance
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

  setParticles(preset: ParticlePreset): void {
    this.particleEngine.setPreset(preset);
    this._visualSettings.particles = preset;
  }

  setParticleColor(color: string | null): void {
    this.particleEngine.setColor(color);
    if (color) this._visualSettings.particleColor = color;
  }

  setParticleOpacity(opacity: number): void {
    this.particleEngine.setOpacity(opacity);
    this._visualSettings.particleOpacity = opacity;
  }

  setParticleSpeed(speed: number): void {
    this.particleEngine.setSpeed(speed);
    this._visualSettings.particleSpeed = speed;
  }

  updateVisual(key: string, value: any): void {
    (this._visualSettings as any)[key] = value;
  }

  getVisualSettings(): TerminalVisualSettings {
    return { ...this._visualSettings };
  }

  getCustomName(): string {
    return this.titlebar.getName();
  }

  setCustomName(name: string): void {
    this.titlebar.setName(name);
  }

  setStatusBusy(): void { this.titlebar.setBusy(); }
  setStatusDone(): void { this.titlebar.setDone(); }
  setStatusIdle(): void { this.titlebar.setIdle(); }
  setStatusBarColor(color: string): void {
    this.titlebar.setStatusColor(color);
    this._visualSettings.statusBarColor = color;
  }

  applyVisualSettings(vs: TerminalVisualSettings): void {
    this._visualSettings = { ...vs };
  }

  dispose(): void {
    this.particleEngine.dispose();
    this.termInstance?.dispose();
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}
