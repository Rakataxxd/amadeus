import { SnapEngine } from './snap-engine.js';
import type { Rect } from './snap-engine.js';

export class DragEngine {
  private snapEngine: SnapEngine;
  private canvas: HTMLElement;
  private rectProvider: (() => Rect[]) | null = null;

  // Active drag state
  private dragging = false;
  private target: HTMLElement | null = null;
  private startMouseX = 0;
  private startMouseY = 0;
  private startElLeft = 0;
  private startElTop = 0;

  // Snap guides
  private guideV: HTMLElement | null = null;
  private guideH: HTMLElement | null = null;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  onDragEnd: ((el: HTMLElement) => void) | null = null;

  constructor(canvas: HTMLElement, snapEngine: SnapEngine) {
    this.canvas = canvas;
    this.snapEngine = snapEngine;

    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
  }

  setRectProvider(fn: () => Rect[]): void {
    this.rectProvider = fn;
  }

  startDrag(el: HTMLElement, event: MouseEvent): void {
    event.preventDefault();
    this.dragging = true;
    this.target = el;
    this.startMouseX = event.clientX;
    this.startMouseY = event.clientY;
    this.startElLeft = parseInt(el.style.left) || 0;
    this.startElTop = parseInt(el.style.top) || 0;

    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragging || !this.target) return;

    const dx = e.clientX - this.startMouseX;
    const dy = e.clientY - this.startMouseY;

    let newLeft = this.startElLeft + dx;
    let newTop = this.startElTop + dy;

    const canvasW = this.canvas.clientWidth;
    const canvasH = this.canvas.clientHeight;
    const elW = this.target.clientWidth;
    const elH = this.target.clientHeight;

    // Clamp to canvas bounds
    newLeft = Math.max(0, Math.min(canvasW - elW, newLeft));
    newTop = Math.max(0, Math.min(canvasH - elH, newTop));

    // Get other rects (exclude current element)
    const others = this.rectProvider ? this.rectProvider() : [];
    const rect: Rect = { left: newLeft, top: newTop, width: elW, height: elH };

    const result = this.snapEngine.snap(rect, others, canvasW, canvasH, e.shiftKey);

    this.target.style.left = `${result.x}px`;
    this.target.style.top = `${result.y}px`;

    this.updateGuides(result.guideX, result.guideY);
  }

  private onMouseUp(): void {
    this.dragging = false;
    this.clearGuides();
    if (this.target) {
      this.onDragEnd?.(this.target);
    }
    this.target = null;
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
  }

  private updateGuides(guideX: number | null, guideY: number | null): void {
    if (guideX !== null) {
      if (!this.guideV) {
        this.guideV = document.createElement('div');
        this.guideV.className = 'snap-guide snap-guide-v';
        this.canvas.appendChild(this.guideV);
      }
      this.guideV.style.left = `${guideX}px`;
    } else {
      this.clearGuideV();
    }

    if (guideY !== null) {
      if (!this.guideH) {
        this.guideH = document.createElement('div');
        this.guideH.className = 'snap-guide snap-guide-h';
        this.canvas.appendChild(this.guideH);
      }
      this.guideH.style.top = `${guideY}px`;
    } else {
      this.clearGuideH();
    }
  }

  private clearGuideV(): void {
    if (this.guideV && this.canvas.contains(this.guideV)) {
      this.canvas.removeChild(this.guideV);
    }
    this.guideV = null;
  }

  private clearGuideH(): void {
    if (this.guideH && this.canvas.contains(this.guideH)) {
      this.canvas.removeChild(this.guideH);
    }
    this.guideH = null;
  }

  private clearGuides(): void {
    this.clearGuideV();
    this.clearGuideH();
  }
}
