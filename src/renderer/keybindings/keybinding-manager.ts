import type { KeybindingConfig } from '../../shared/types.js';

type ActionName = keyof KeybindingConfig;

export class KeybindingManager {
  private bindings = new Map<string, ActionName>();
  private handlers = new Map<ActionName, (() => void)[]>();

  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  applyConfig(config: KeybindingConfig): void {
    this.bindings.clear();
    for (const [action, shortcut] of Object.entries(config) as [ActionName, string][]) {
      if (shortcut) {
        const normalized = this.normalizeShortcut(shortcut);
        this.bindings.set(normalized, action);
      }
    }
  }

  on(action: ActionName, handler: () => void): void {
    const list = this.handlers.get(action) ?? [];
    list.push(handler);
    this.handlers.set(action, list);
  }

  normalizeShortcut(shortcut: string): string {
    return shortcut
      .toLowerCase()
      .split('+')
      .map(p => p.trim())
      .sort()
      .join('+');
  }

  private onKeyDown(e: KeyboardEvent): void {
    const combo = this.buildCombo(e);
    const action = this.bindings.get(combo);
    if (!action) return;

    const list = this.handlers.get(action);
    if (!list) return;

    e.preventDefault();
    e.stopPropagation();
    for (const handler of list) {
      handler();
    }
  }

  private buildCombo(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');

    // Key name normalization
    let key = e.key.toLowerCase();
    // Normalize special keys
    if (key === ' ') key = 'space';
    if (key === 'arrowup') key = 'up';
    if (key === 'arrowdown') key = 'down';
    if (key === 'arrowleft') key = 'left';
    if (key === 'arrowright') key = 'right';

    // Don't double-add modifier keys as the main key
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
    }

    return parts.sort().join('+');
  }

  dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
  }
}
