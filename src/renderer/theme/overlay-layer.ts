import type { OverlayConfig } from '../../shared/types.js';

export class OverlayLayer {
  private el: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.el = containerEl;
  }

  apply(config: OverlayConfig): void {
    if (config.image) {
      this.el.style.backgroundImage = `url("${config.image}")`;
      this.el.style.opacity = String(config.opacity ?? 0.3);
      this.el.style.backgroundRepeat = 'repeat';
    } else {
      this.el.style.backgroundImage = '';
      this.el.style.opacity = '0';
    }
  }
}
