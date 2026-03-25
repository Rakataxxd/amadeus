import type { CanvasConfig } from '../../shared/types.js';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SnapResult {
  x: number;
  y: number;
  snapX: boolean;
  snapY: boolean;
  guideX: number | null;
  guideY: number | null;
}

/**
 * Pure snap calculation function — exported for testing.
 * Returns the snapped position and which guides to show.
 */
export function calcSnap(
  rect: Rect,
  others: Rect[],
  canvasW: number,
  canvasH: number,
  threshold: number
): SnapResult {
  let { left, top } = rect;
  const right = left + rect.width;
  const bottom = top + rect.height;

  let snapX = false;
  let snapY = false;
  let guideX: number | null = null;
  let guideY: number | null = null;
  let bestDX = threshold + 1;
  let bestDY = threshold + 1;

  // ---- Snap to canvas edges ----
  // Left edge
  const dLeft = Math.abs(left);
  if (dLeft < bestDX) {
    bestDX = dLeft;
    snapX = true;
    guideX = 0;
    left = 0;
  }

  // Right edge
  const dRight = Math.abs(right - canvasW);
  if (dRight < bestDX) {
    bestDX = dRight;
    snapX = true;
    guideX = canvasW;
    left = canvasW - rect.width;
  }

  // Top edge
  const dTop = Math.abs(top);
  if (dTop < bestDY) {
    bestDY = dTop;
    snapY = true;
    guideY = 0;
    top = 0;
  }

  // Bottom edge
  const dBottom = Math.abs(bottom - canvasH);
  if (dBottom < bestDY) {
    bestDY = dBottom;
    snapY = true;
    guideY = canvasH;
    top = canvasH - rect.height;
  }

  // ---- Snap to other terminal edges ----
  for (const other of others) {
    const oRight = other.left + other.width;
    const oBottom = other.top + other.height;

    // --- X axis ---
    // Our left snaps to other's right (adjacent, right-to-left layout)
    const dAdjacentLR = Math.abs(left - oRight);
    if (dAdjacentLR < bestDX) {
      bestDX = dAdjacentLR;
      snapX = true;
      guideX = oRight;
      left = oRight;
    }

    // Our right snaps to other's left (adjacent, left-to-right layout)
    const dAdjacentRL = Math.abs(right - other.left);
    if (dAdjacentRL < bestDX) {
      bestDX = dAdjacentRL;
      snapX = true;
      guideX = other.left;
      left = other.left - rect.width;
    }

    // Our left aligns with other's left
    const dAlignLeft = Math.abs(left - other.left);
    if (dAlignLeft < bestDX) {
      bestDX = dAlignLeft;
      snapX = true;
      guideX = other.left;
      left = other.left;
    }

    // Our right aligns with other's right
    const dAlignRight = Math.abs(right - oRight);
    if (dAlignRight < bestDX) {
      bestDX = dAlignRight;
      snapX = true;
      guideX = oRight;
      left = oRight - rect.width;
    }

    // --- Y axis ---
    // Our top snaps to other's bottom (adjacent, bottom-to-top layout)
    const dAdjacentTB = Math.abs(top - oBottom);
    if (dAdjacentTB < bestDY) {
      bestDY = dAdjacentTB;
      snapY = true;
      guideY = oBottom;
      top = oBottom;
    }

    // Our bottom snaps to other's top (adjacent, top-to-bottom layout)
    const dAdjacentBT = Math.abs(bottom - other.top);
    if (dAdjacentBT < bestDY) {
      bestDY = dAdjacentBT;
      snapY = true;
      guideY = other.top;
      top = other.top - rect.height;
    }

    // Our top aligns with other's top
    const dAlignTop = Math.abs(top - other.top);
    if (dAlignTop < bestDY) {
      bestDY = dAlignTop;
      snapY = true;
      guideY = other.top;
      top = other.top;
    }

    // Our bottom aligns with other's bottom
    const dAlignBottom = Math.abs(bottom - oBottom);
    if (dAlignBottom < bestDY) {
      bestDY = dAlignBottom;
      snapY = true;
      guideY = oBottom;
      top = oBottom - rect.height;
    }
  }

  // If no snap within threshold, revert
  if (bestDX > threshold) {
    snapX = false;
    guideX = null;
    left = rect.left;
  }
  if (bestDY > threshold) {
    snapY = false;
    guideY = null;
    top = rect.top;
  }

  return { x: left, y: top, snapX, snapY, guideX, guideY };
}

export class SnapEngine {
  private config: CanvasConfig | null = null;

  applyConfig(canvasConfig: CanvasConfig): void {
    this.config = canvasConfig;
  }

  snap(
    rect: Rect,
    others: Rect[],
    canvasW: number,
    canvasH: number,
    shiftKey = false
  ): SnapResult {
    const noSnap: SnapResult = {
      x: rect.left,
      y: rect.top,
      snapX: false,
      snapY: false,
      guideX: null,
      guideY: null,
    };

    if (!this.config) return noSnap;
    if (!this.config.snap_enabled) return noSnap;
    if (shiftKey) return noSnap; // Holding shift disables snap

    const threshold = this.config.snap_threshold ?? 10;
    return calcSnap(rect, others, canvasW, canvasH, threshold);
  }
}
