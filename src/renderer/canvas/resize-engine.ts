import type { Rect } from './snap-engine.js';

const MIN_WIDTH = 200;
const MIN_HEIGHT = 100;
const SNAP_THRESHOLD = 15;

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
  getOtherRects: (() => Rect[]) | null = null;

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

    // Snap edges to other terminals and canvas edges
    if (!e.shiftKey) {
      const others = this.getOtherRects?.() || [];
      const right = newLeft + newWidth;
      const bottom = newTop + newHeight;

      // Snap targets: canvas edges + other terminal edges
      const xEdges = [0, canvasW];
      const yEdges = [0, canvasH];
      for (const o of others) {
        xEdges.push(o.left, o.left + o.width);
        yEdges.push(o.top, o.top + o.height);
      }

      // Snap right edge (for e resize)
      if (dir.includes('e')) {
        for (const edge of xEdges) {
          if (Math.abs(right - edge) < SNAP_THRESHOLD) {
            newWidth = edge - newLeft;
            break;
          }
        }
      }

      // Snap left edge (for w resize)
      if (dir.includes('w')) {
        for (const edge of xEdges) {
          if (Math.abs(newLeft - edge) < SNAP_THRESHOLD) {
            newWidth += newLeft - edge;
            newLeft = edge;
            break;
          }
        }
      }

      // Snap bottom edge (for s resize)
      if (dir.includes('s')) {
        for (const edge of yEdges) {
          if (Math.abs(bottom - edge) < SNAP_THRESHOLD) {
            newHeight = edge - newTop;
            break;
          }
        }
      }

      // Snap top edge (for n resize)
      if (dir.includes('n')) {
        for (const edge of yEdges) {
          if (Math.abs(newTop - edge) < SNAP_THRESHOLD) {
            newHeight += newTop - edge;
            newTop = edge;
            break;
          }
        }
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
