import type { BackgroundConfig } from '../../shared/types.js';

export class BackgroundLayer {
  private el: HTMLElement;
  private imgEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.el = containerEl;

    // Try to find existing children by class, or create them
    const existing = containerEl.querySelector('.bg-image') as HTMLElement | null;
    if (existing) {
      this.imgEl = existing;
    } else {
      this.imgEl = document.createElement('div');
      this.imgEl.className = 'bg-image';
      this.el.appendChild(this.imgEl);
    }
  }

  apply(config: BackgroundConfig): void {
    this.el.style.backgroundColor = config.color || 'transparent';

    if (config.image) {
      this.imgEl.style.backgroundImage = `url("${config.image}")`;
      this.imgEl.style.backgroundSize = config.image_size || 'cover';
      this.imgEl.style.backgroundPosition = config.image_position || 'center';
      this.imgEl.style.opacity = String(config.image_opacity ?? 1);
      this.imgEl.style.filter = config.image_blur ? `blur(${config.image_blur}px)` : '';
    } else {
      this.imgEl.style.backgroundImage = '';
      this.imgEl.style.opacity = '1';
      this.imgEl.style.filter = '';
    }
  }

  setOffset(x: number, y: number, scale: number): void {
    this.imgEl.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  get imageElement(): HTMLElement {
    return this.imgEl;
  }
}
