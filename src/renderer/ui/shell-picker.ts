import type { ShellInfo } from '../../shared/types.js';

export class ShellPicker {
  private el: HTMLElement;
  private listEl: HTMLElement;
  private shells: ShellInfo[] = [];
  private selectCallback: ((shell: ShellInfo) => void) | null = null;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundClickOutside: (e: MouseEvent) => void;

  constructor(el: HTMLElement) {
    this.el = el;
    this.el.className = 'hidden';

    // Header
    const header = document.createElement('div');
    header.className = 'shell-picker-header';
    header.textContent = 'Open Terminal';

    this.listEl = document.createElement('div');
    this.listEl.className = 'shell-picker-list';

    this.el.appendChild(header);
    this.el.appendChild(this.listEl);

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundClickOutside = this.onClickOutside.bind(this);
  }

  setShells(shells: ShellInfo[]): void {
    this.shells = shells;
    this.render();
  }

  onSelect(callback: (shell: ShellInfo) => void): void {
    this.selectCallback = callback;
  }

  show(): void {
    if (this.shells.length === 0) {
      // If no shells loaded, show anyway (may load later)
    }
    this.render();
    this.el.classList.remove('hidden');
    document.addEventListener('keydown', this.boundKeyDown);
    // Delay so the click that triggered show() doesn't immediately close
    setTimeout(() => {
      document.addEventListener('mousedown', this.boundClickOutside);
    }, 0);
  }

  hide(): void {
    this.el.classList.add('hidden');
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('mousedown', this.boundClickOutside);
  }

  private render(): void {
    this.listEl.innerHTML = '';

    if (this.shells.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 12px 16px; color: rgba(150,150,180,0.6); font-size: 13px;';
      empty.textContent = 'No shells configured.';
      this.listEl.appendChild(empty);
      return;
    }

    for (const shell of this.shells) {
      const item = document.createElement('div');
      item.className = 'shell-option';

      if (shell.elevated) {
        const shield = document.createElement('span');
        shield.className = 'shield-icon';
        shield.textContent = '🛡';
        shield.title = 'Elevated';
        item.appendChild(shield);
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'shell-name';
      nameEl.textContent = shell.name;
      item.appendChild(nameEl);

      if (shell.profile) {
        const profileEl = document.createElement('span');
        profileEl.className = 'shell-profile';
        profileEl.textContent = shell.profile;
        item.appendChild(profileEl);
      }

      item.addEventListener('click', () => {
        this.selectCallback?.(shell);
        this.hide();
      });

      this.listEl.appendChild(item);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
    }
  }

  private onClickOutside(e: MouseEvent): void {
    if (!this.el.contains(e.target as Node)) {
      this.hide();
    }
  }
}
