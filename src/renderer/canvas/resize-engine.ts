const MIN_WIDTH = 200;
const MIN_HEIGHT = 100;

export class ResizeEngine {
  private canvas: HTMLElement;

  private resizing = false;
  private target: HTMLElement | null = null;
  private direction = '';

  private startMouseX = 0;
  private startMouseY = 0;
  private startLeft = 0;
  private startTop = 0;
  private startWidth = 0;
  private startHeight = 0;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  onResizeEnd: ((el: HTMLElement) => void) | null = null;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
  }

  startResize(el: HTMLElement, direction: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizing = true;
    this.target = el;
    this.direction = direction;
    this.startMouseX = event.clientX;
    this.startMouseY = event.clientY;
    this.startLeft = parseInt(el.style.left) || el.offsetLeft;
    this.startTop = parseInt(el.style.top) || el.offsetTop;
    this.startWidth = el.clientWidth;
    this.startHeight = el.clientHeight;

    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.resizing || !this.target) return;

    const dx = e.clientX - this.startMouseX;
    const dy = e.clientY - this.startMouseY;
    const dir = this.direction;

    const canvasW = this.canvas.clientWidth;
    const canvasH = this.canvas.clientHeight;

    let newLeft = this.startLeft;
    let newTop = this.startTop;
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;

    // East (right edge)
    if (dir.includes('e')) {
      newWidth = Math.max(MIN_WIDTH, this.startWidth + dx);
      newWidth = Math.min(newWidth, canvasW - newLeft);
    }

    // West (left edge)
    if (dir.includes('w')) {
      const delta = Math.min(dx, this.startWidth - MIN_WIDTH);
      newLeft = this.startLeft + delta;
      newWidth = this.startWidth - delta;
      if (newLeft < 0) {
        newWidth += newLeft;
        newLeft = 0;
      }
    }

    // South (bottom edge)
    if (dir.includes('s')) {
      newHeight = Math.max(MIN_HEIGHT, this.startHeight + dy);
      newHeight = Math.min(newHeight, canvasH - newTop);
    }

    // North (top edge)
    if (dir.includes('n')) {
      const delta = Math.min(dy, this.startHeight - MIN_HEIGHT);
      newTop = this.startTop + delta;
      newHeight = this.startHeight - delta;
      if (newTop < 0) {
        newHeight += newTop;
        newTop = 0;
      }
    }

    this.target.style.left = `${newLeft}px`;
    this.target.style.top = `${newTop}px`;
    this.target.style.width = `${newWidth}px`;
    this.target.style.height = `${newHeight}px`;
  }

  private onMouseUp(): void {
    this.resizing = false;
    if (this.target) {
      this.onResizeEnd?.(this.target);
    }
    this.target = null;
    this.direction = '';
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
  }
}
