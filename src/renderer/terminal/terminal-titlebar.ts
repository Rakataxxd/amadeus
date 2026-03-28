export class TerminalTitlebar {
  readonly element: HTMLElement;
  private label: HTMLElement;
  private statusDot: HTMLElement;
  private _customName = '';
  private _defaultName = '';
  private _busy = false;
  private _bellTimeout: ReturnType<typeof setTimeout> | null = null;
  onClose: (() => void) | null = null;
  onMinimize: (() => void) | null = null;

  constructor(shellName: string, profileName: string, elevated: boolean) {
    this.element = document.createElement('div');
    this.element.className = 'terminal-titlebar';

    this.statusDot = document.createElement('span');
    this.statusDot.className = 'titlebar-status idle';

    this.label = document.createElement('span');
    this.label.className = 'titlebar-label';

    const shieldHtml = elevated ? ' <span class="shield-icon" title="Elevated">🛡</span>' : '';
    this._defaultName = `${shellName}${shieldHtml} <span class="titlebar-profile">${profileName}</span>`;
    this.label.innerHTML = this._defaultName;

    // Double-click titlebar to rename
    this.element.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('.titlebar-btn')) return;
      e.stopPropagation();
      this.startRename();
    });

    const controls = document.createElement('div');
    controls.className = 'titlebar-controls';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'titlebar-btn btn-minimize';
    minimizeBtn.title = 'Minimize';
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onMinimize?.();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'titlebar-btn btn-close';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onClose?.();
    });

    controls.appendChild(this.statusDot);
    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);

    this.element.appendChild(this.label);
    this.element.appendChild(controls);
  }

  setColor(color: string): void {
    this.element.style.background = color;
  }

  setBusy(): void {
    if (this._busy) return;
    this._busy = true;
    this.statusDot.className = 'titlebar-status busy';
  }

  setDone(): void {
    if (!this._busy) return;
    this._busy = false;
    this.statusDot.className = 'titlebar-status done';
    // Flash the titlebar
    this.element.classList.add('titlebar-flash');
    // Remove flash and go idle after 4s
    if (this._bellTimeout) clearTimeout(this._bellTimeout);
    this._bellTimeout = setTimeout(() => {
      this.statusDot.className = 'titlebar-status idle';
      this.element.classList.remove('titlebar-flash');
      this._bellTimeout = null;
    }, 4000);
  }

  setIdle(): void {
    this._busy = false;
    this.statusDot.className = 'titlebar-status idle';
  }

  setStatusColor(color: string): void {
    this.statusDot.style.setProperty('--status-done-color', color);
  }

  setName(name: string): void {
    this._customName = name;
    this.label.textContent = name || '';
    if (!name) this.label.innerHTML = this._defaultName;
  }

  getName(): string {
    return this._customName;
  }

  private startRename(): void {
    const input = document.createElement('input');
    input.className = 'titlebar-rename-input';
    input.value = this._customName || this.label.textContent || '';
    input.select();

    const finish = () => {
      const val = input.value.trim();
      if (val) {
        this._customName = val;
        this.label.textContent = val;
      } else {
        this._customName = '';
        this.label.innerHTML = this._defaultName;
      }
      if (input.parentElement) input.parentElement.replaceChild(this.label, input);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      if (e.key === 'Escape') { e.preventDefault(); this._customName = this._customName; if (input.parentElement) input.parentElement.replaceChild(this.label, input); }
    });
    input.addEventListener('blur', finish);

    this.label.parentElement!.replaceChild(input, this.label);
    input.focus();
  }
}
