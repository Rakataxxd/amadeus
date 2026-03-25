export class TerminalTitlebar {
  readonly element: HTMLElement;
  private label: HTMLElement;
  onClose: (() => void) | null = null;
  onMinimize: (() => void) | null = null;

  constructor(shellName: string, profileName: string, elevated: boolean) {
    this.element = document.createElement('div');
    this.element.className = 'terminal-titlebar';

    this.label = document.createElement('span');
    this.label.className = 'titlebar-label';

    const shieldHtml = elevated ? ' <span class="shield-icon" title="Elevated">🛡</span>' : '';
    this.label.innerHTML = `${shellName}${shieldHtml} <span class="titlebar-profile">${profileName}</span>`;

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

    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);

    this.element.appendChild(this.label);
    this.element.appendChild(controls);
  }

  setColor(color: string): void {
    this.element.style.background = color;
  }
}
