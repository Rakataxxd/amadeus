export class ImageDragger {
  private el: HTMLElement;
  private enabled = false;
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private offsetX = 0;
  private offsetY = 0;
  private scale = 1;

  onOffsetChange: ((x: number, y: number, scale: number) => void) | null = null;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor(el: HTMLElement) {
    this.el = el;

    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;

    if (enabled) {
      this.el.addEventListener('mousedown', this.boundMouseDown);
      this.el.addEventListener('wheel', this.boundWheel, { passive: false });
    } else {
      this.el.removeEventListener('mousedown', this.boundMouseDown);
      this.el.removeEventListener('wheel', this.boundWheel);
    }
  }

  setOffset(x: number, y: number, scale: number): void {
    this.offsetX = x;
    this.offsetY = y;
    this.scale = scale;
  }

  private onMouseDown(e: MouseEvent): void {
    if (!e.altKey || e.button !== 0) return;
    e.preventDefault();
    this.dragging = true;
    this.startX = e.clientX - this.offsetX;
    this.startY = e.clientY - this.offsetY;

    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;
    this.offsetX = e.clientX - this.startX;
    this.offsetY = e.clientY - this.startY;
    this.onOffsetChange?.(this.offsetX, this.offsetY, this.scale);
  }

  private onMouseUp(): void {
    this.dragging = false;
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
  }

  private onWheel(e: WheelEvent): void {
    if (!e.altKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    this.scale = Math.min(3.0, Math.max(0.1, this.scale + delta));
    this.onOffsetChange?.(this.offsetX, this.offsetY, this.scale);
  }

  dispose(): void {
    this.setEnabled(false);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
  }
}
