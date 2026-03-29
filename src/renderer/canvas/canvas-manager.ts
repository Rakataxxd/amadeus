import { TerminalContainer } from '../terminal/terminal-container.js';
import { ThemeEngine } from '../theme/theme-engine.js';
import { SnapEngine } from './snap-engine.js';
import { ZManager } from './z-manager.js';
import { DragEngine } from './drag-engine.js';
import { ResizeEngine } from './resize-engine.js';
import type { AmadeusConfig, LayoutTerminal } from '../../shared/types.js';
import type { Rect } from './snap-engine.js';

interface PendingContainer {
  container: TerminalContainer;
  shellId: string;
}

export class CanvasManager {
  private canvasEl: HTMLElement;
  private containers: TerminalContainer[] = [];
  private activeContainer: TerminalContainer | null = null;

  // FIFO queue — indexed by order of creation, NOT by shellId
  private pendingContainers: PendingContainer[] = [];

  private themeEngine = new ThemeEngine();
  private snapEngine = new SnapEngine();
  private zManager = new ZManager();
  private dragEngine: DragEngine;
  private resizeEngine: ResizeEngine;

  private config: AmadeusConfig | null = null;
  onFocusChange: ((container: TerminalContainer) => void) | null = null;

  constructor(canvasEl: HTMLElement) {
    this.canvasEl = canvasEl;
    this.dragEngine = new DragEngine(canvasEl, this.snapEngine);
    this.resizeEngine = new ResizeEngine(canvasEl);

    // Provide other rects to drag engine (exclude active dragged element)
    this.dragEngine.setRectProvider(() => {
      return this.containers
        .filter(c => c !== this.activeContainer)
        .map(c => c.getPixelRect());
    });

    this.dragEngine.onDragEnd = () => { /* fit after drag */ };
    this.resizeEngine.onResizeEnd = (el) => {
      const container = this.containers.find(c => c.element === el);
      container?.fit();
    };

    this.resizeEngine.getOtherRects = () => {
      return this.containers
        .filter(c => c.element !== this.activeContainer?.element)
        .map(c => c.getPixelRect());
    };

  }

  createTerminal(shellId: string, elevated: boolean): void {
    const config = this.config;
    const shellName = config?.shells[shellId]
      ? shellId
      : shellId;
    const profileName = config?.shells[shellId]?.profile
      ?? config?.general.default_profile
      ?? 'default';

    const container = new TerminalContainer(shellId, shellName, profileName, elevated);
    this.setupContainer(container);

    // Default position: slightly cascaded
    const offset = this.containers.length * 30;
    const canvasW = this.canvasEl.clientWidth || 800;
    const canvasH = this.canvasEl.clientHeight || 600;
    container.element.style.left = `${offset}px`;
    container.element.style.top = `${offset}px`;
    container.element.style.width = `${Math.min(600, canvasW - offset)}px`;
    container.element.style.height = `${Math.min(400, canvasH - offset)}px`;

    this.canvasEl.appendChild(container.element);
    this.containers.push(container);
    this.zManager.register(container.element);
    this.zManager.bringToFront(container.element);

    // Initialize xterm
    const inst = container.initTerminal();
    inst.onUserInput = () => container.setStatusBusy();
    inst.onPromptReady = () => container.setStatusDone();

    // Apply theme if config available
    if (config) {
      this.themeEngine.applyToContainer(container, shellId);
    }

    // Add to FIFO pending queue
    this.pendingContainers.push({ container, shellId });

    // Request PTY creation
    window.amadeus.terminal.create(shellId, elevated);

    this.setActive(container);
  }

  createTerminalFromLayout(lt: LayoutTerminal): void {
    // Skip terminals with invalid dimensions (from hidden workspaces)
    if (lt.width <= 0 || lt.height <= 0) return;

    const config = this.config;
    const shellId = lt.shell;
    const elevated = config?.shells[shellId]?.elevated ?? false;
    const profileName = config?.shells[shellId]?.profile
      ?? config?.general.default_profile
      ?? 'default';

    const container = new TerminalContainer(shellId, shellId, profileName, elevated);
    this.setupContainer(container);

    // Use percentages directly so terminals scale with window size
    container.element.style.left = `${lt.x}%`;
    container.element.style.top = `${lt.y}%`;
    container.element.style.width = `${lt.width}%`;
    container.element.style.height = `${lt.height}%`;

    container.bgOffsetX = lt.bg_offset_x ?? 0;
    container.bgOffsetY = lt.bg_offset_y ?? 0;
    container.bgScale = lt.bg_scale ?? 1;

    this.canvasEl.appendChild(container.element);
    this.containers.push(container);
    this.zManager.register(container.element);
    this.zManager.setZ(container.element, lt.z);

    const inst = container.initTerminal();
    inst.onUserInput = () => container.setStatusBusy();
    inst.onPromptReady = () => container.setStatusDone();

    if (config) {
      this.themeEngine.applyToContainer(container, shellId);
    }

    // If restoring with a CWD different from home dir, auto-run claude
    if (lt.cwd) {
      // Check if CWD looks like a project folder (not just C:\Users\X)
      const parts = lt.cwd.replace(/\\/g, '/').replace(/\/+$/, '').split('/');
      // Home dir is typically 3 parts: C:/Users/Name
      if (parts.length > 3) {
        container.autoCommand = 'claude --dangerously-skip-permissions\r';
      }
    }

    // Restore visual settings
    if (lt.visual) {
      container.applyVisualSettings(lt.visual);
    }
    if (lt.customName) {
      container.setCustomName(lt.customName);
    }

    // FIFO: push to pending
    this.pendingContainers.push({ container, shellId });

    if (lt.cwd) {
      window.amadeus.terminal.create(shellId, elevated, lt.cwd);
    } else {
      window.amadeus.terminal.create(shellId, elevated);
    }
    this.setActive(container);
  }

  hasPending(): boolean {
    return this.pendingContainers.length > 0;
  }

  /**
   * Called when PTY_CREATED arrives.
   * Uses FIFO order — NOT keyed by shellId.
   */
  attachPty(terminalId: string, _shellId: string): void {
    if (this.pendingContainers.length === 0) return;

    const { container } = this.pendingContainers.shift()!;
    container.terminalId = terminalId;
    const instance = container.getTerminalInstance();
    instance?.attachPty(terminalId);
    container.fit();

    // Execute auto-command after shell initializes (session restore)
    if (container.autoCommand) {
      const cmd = container.autoCommand;
      container.autoCommand = '';
      setTimeout(() => {
        window.amadeus.terminal.write(terminalId, cmd);
      }, 800);
    }
  }

  writeToTerminal(terminalId: string, data: string): void {
    const container = this.containers.find(c => c.terminalId === terminalId);
    container?.getTerminalInstance()?.write(data);
  }

  handleTerminalExit(terminalId: string): void {
    const container = this.containers.find(c => c.terminalId === terminalId);
    if (container) {
      this.removeContainer(container);
    }
  }

  closeActiveTerminal(): void {
    if (this.activeContainer) {
      const termId = this.activeContainer.terminalId;
      if (termId) {
        window.amadeus.terminal.close(termId);
      }
      this.removeContainer(this.activeContainer);
    }
  }

  focusNext(): void {
    if (this.containers.length === 0) return;
    const idx = this.activeContainer
      ? this.containers.indexOf(this.activeContainer)
      : -1;
    const next = this.containers[(idx + 1) % this.containers.length];
    this.setActive(next);
  }

  focusPrev(): void {
    if (this.containers.length === 0) return;
    const idx = this.activeContainer
      ? this.containers.indexOf(this.activeContainer)
      : 0;
    const prev = this.containers[(idx - 1 + this.containers.length) % this.containers.length];
    this.setActive(prev);
  }

  saveLayout(name: string): void {
    const canvasW = this.canvasEl.clientWidth || 1;
    const canvasH = this.canvasEl.clientHeight || 1;

    const terminals: LayoutTerminal[] = this.containers.map(c => {
      const rect = c.getPixelRect();
      return {
        shell: c.shellId,
        x: (rect.left / canvasW) * 100,
        y: (rect.top / canvasH) * 100,
        width: (rect.width / canvasW) * 100,
        height: (rect.height / canvasH) * 100,
        z: this.zManager.getZ(c.element),
        bg_offset_x: c.bgOffsetX,
        bg_offset_y: c.bgOffsetY,
        bg_scale: c.bgScale,
      };
    });

    window.amadeus.layout.save(name, terminals);
  }

  loadLayout(name: string): void {
    window.amadeus.layout.load(name);
  }

  initLayoutListener(): void {
    window.amadeus.layout.onData((_, terminals) => {
      // Clear all current terminals
      for (const c of [...this.containers]) {
        this.removeContainer(c);
      }
      for (const lt of terminals as LayoutTerminal[]) {
        this.createTerminalFromLayout(lt);
      }
    });
  }

  applyConfig(config: AmadeusConfig): void {
    this.config = config;
    this.themeEngine.applyConfig(config);
    this.snapEngine.applyConfig(config.canvas);

    // Re-apply theme to all existing containers
    for (const c of this.containers) {
      this.themeEngine.applyToContainer(c, c.shellId);
    }
  }

  getActiveContainer(): TerminalContainer | null {
    return this.activeContainer;
  }

  getActiveProfile(): any {
    if (!this.activeContainer || !this.config) return null;
    const shellId = this.activeContainer.shellId;
    const profileName = this.config.shells[shellId]?.profile || this.config.general.default_profile;
    return this.config.profiles[profileName] || null;
  }

  copyFromActive(): void {
    this.activeContainer?.copySelection();
  }

  pasteToActive(): void {
    this.activeContainer?.pasteClipboard();
  }

  private setupContainer(container: TerminalContainer): void {
    container.onClose = () => {
      const termId = container.terminalId;
      if (termId) {
        window.amadeus.terminal.close(termId);
      }
      this.removeContainer(container);
    };

    // Click to focus + bring to front
    container.element.addEventListener('mousedown', () => {
      this.setActive(container);
      this.zManager.bringToFront(container.element);
    });

    // Drag via titlebar
    const titlebar = container.element.querySelector('.terminal-titlebar') as HTMLElement;
    if (titlebar) {
      titlebar.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).closest('.titlebar-btn')) return;
        this.dragEngine.startDrag(container.element, e);
      });
    }

    // Resize handles
    const handles = container.element.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      (handle as HTMLElement).addEventListener('mousedown', (e) => {
        const dir = (handle as HTMLElement).dataset['direction'] ?? '';
        this.resizeEngine.startResize(container.element, dir, e as MouseEvent);
      });
    });
  }

  private setActive(container: TerminalContainer): void {
    if (this.activeContainer && this.activeContainer !== container) {
      this.activeContainer.blur();
    }
    this.activeContainer = container;
    container.focus();
    this.onFocusChange?.(container);
  }

  private removeContainer(container: TerminalContainer): void {
    const idx = this.containers.indexOf(container);
    if (idx !== -1) {
      this.containers.splice(idx, 1);
    }

    // Remove from pending if still there
    const pIdx = this.pendingContainers.findIndex(p => p.container === container);
    if (pIdx !== -1) {
      this.pendingContainers.splice(pIdx, 1);
    }

    this.zManager.unregister(container.element);

    if (this.activeContainer === container) {
      this.activeContainer = null;
      if (this.containers.length > 0) {
        this.setActive(this.containers[this.containers.length - 1]);
      }
    }

    container.dispose();
  }

  /** Export terminal layout for session persistence */
  getSessionTerminals(): LayoutTerminal[] {
    const canvasW = this.canvasEl.clientWidth || 1;
    const canvasH = this.canvasEl.clientHeight || 1;
    return this.containers.map(c => {
      const rect = c.getPixelRect();
      return {
        shell: c.shellId,
        x: (rect.left / canvasW) * 100,
        y: (rect.top / canvasH) * 100,
        width: (rect.width / canvasW) * 100,
        height: (rect.height / canvasH) * 100,
        z: this.zManager.getZ(c.element),
        bg_offset_x: c.bgOffsetX,
        bg_offset_y: c.bgOffsetY,
        bg_scale: c.bgScale,
        cwd: c.getCurrentCwd() || undefined,
        customName: c.getCustomName() || undefined,
        visual: c.getVisualSettings(),
      };
    });
  }

  /** Apply saved visual settings to all containers via a callback */
  applyVisualSettingsAll(applyCb: (container: any, visual: any) => void): void {
    for (const c of this.containers) {
      const vs = c.getVisualSettings();
      if (vs && Object.keys(vs).length > 0) {
        applyCb(c, vs);
      }
    }
  }

  /** Check if this canvas has any terminals */
  hasTerminals(): boolean {
    return this.containers.length > 0;
  }

  getOtherRects(exclude: TerminalContainer): Rect[] {
    return this.containers
      .filter(c => c !== exclude)
      .map(c => c.getPixelRect());
  }
}
