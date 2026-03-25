import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcSnap, SnapEngine } from '../../src/renderer/canvas/snap-engine.js';
import type { Rect } from '../../src/renderer/canvas/snap-engine.js';

const CANVAS_W = 1200;
const CANVAS_H = 800;
const THRESHOLD = 10;

describe('calcSnap — pure function', () => {
  it('snaps to left canvas edge when within threshold', () => {
    const rect: Rect = { left: 7, top: 100, width: 300, height: 200 };
    const result = calcSnap(rect, [], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapX, true, 'should snap on X axis');
    assert.equal(result.x, 0, 'should snap left to 0');
    assert.equal(result.guideX, 0, 'guide should be at 0');
  });

  it('does NOT snap to left canvas edge when beyond threshold', () => {
    const rect: Rect = { left: 50, top: 100, width: 300, height: 200 };
    const result = calcSnap(rect, [], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapX, false, 'should not snap on X axis');
    assert.equal(result.x, 50, 'x should remain unchanged');
    assert.equal(result.guideX, null, 'no guide should show');
  });

  it('snaps to right canvas edge when within threshold', () => {
    // right edge at 1200 — rect.left = 1200 - 300 + 8 = 908 (right = 1208, diff = 8)
    const rect: Rect = { left: 908, top: 100, width: 300, height: 200 };
    const result = calcSnap(rect, [], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapX, true, 'should snap on X axis');
    assert.equal(result.x, CANVAS_W - rect.width, 'should snap right to canvas edge');
    assert.equal(result.guideX, CANVAS_W, 'guide should be at canvas right edge');
  });

  it('snaps to top canvas edge when within threshold', () => {
    const rect: Rect = { left: 100, top: 5, width: 300, height: 200 };
    const result = calcSnap(rect, [], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapY, true, 'should snap on Y axis');
    assert.equal(result.y, 0, 'should snap top to 0');
    assert.equal(result.guideY, 0);
  });

  it('does NOT snap to top canvas edge when beyond threshold', () => {
    const rect: Rect = { left: 100, top: 50, width: 300, height: 200 };
    const result = calcSnap(rect, [], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapY, false);
    assert.equal(result.y, 50);
  });

  it('snaps to adjacent terminal (our left to their right)', () => {
    const other: Rect = { left: 0, top: 50, width: 300, height: 200 };
    // Our left = 308 (other.right = 300, diff = 8)
    const rect: Rect = { left: 308, top: 50, width: 300, height: 200 };
    const result = calcSnap(rect, [other], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapX, true, 'should snap adjacent terminal');
    assert.equal(result.x, 300, 'should snap left to other.right');
    assert.equal(result.guideX, 300);
  });

  it('snaps to adjacent terminal (our right to their left)', () => {
    const other: Rect = { left: 400, top: 50, width: 300, height: 200 };
    // Our right = 408 (other.left = 400, diff = 8) → our left = 108
    const rect: Rect = { left: 108, top: 50, width: 300, height: 200 };
    const result = calcSnap(rect, [other], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapX, true, 'should snap adjacent terminal right-to-left');
    assert.equal(result.x, 100, 'should snap right to other.left');
    assert.equal(result.guideX, 400);
  });

  it('does NOT snap adjacent terminal when beyond threshold', () => {
    const other: Rect = { left: 0, top: 50, width: 300, height: 200 };
    // Our left = 350 (other.right = 300, diff = 50 > THRESHOLD)
    const rect: Rect = { left: 350, top: 50, width: 300, height: 200 };
    const result = calcSnap(rect, [other], CANVAS_W, CANVAS_H, THRESHOLD);
    // Canvas right = 1200, rect right = 650 → far from canvas right
    // Canvas left = 0, rect left = 350 → far
    // So no snap at all
    assert.equal(result.snapX, false, 'should not snap when beyond threshold');
    assert.equal(result.x, 350, 'x should remain unchanged');
  });

  it('snaps to adjacent terminal vertically (our top to their bottom)', () => {
    const other: Rect = { left: 50, top: 0, width: 300, height: 200 };
    // Our top = 207 (other.bottom = 200, diff = 7)
    const rect: Rect = { left: 50, top: 207, width: 300, height: 200 };
    const result = calcSnap(rect, [other], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapY, true, 'should snap vertically');
    assert.equal(result.y, 200, 'should snap top to other.bottom');
    assert.equal(result.guideY, 200);
  });

  it('snaps to alignment (our left aligns with other left)', () => {
    const other: Rect = { left: 100, top: 0, width: 300, height: 200 };
    // Our left = 107 (other.left = 100, diff = 7)
    const rect: Rect = { left: 107, top: 300, width: 250, height: 200 };
    const result = calcSnap(rect, [other], CANVAS_W, CANVAS_H, THRESHOLD);
    assert.equal(result.snapX, true, 'should snap on alignment');
    assert.equal(result.x, 100);
  });
});

describe('SnapEngine — class', () => {
  it('returns no-snap when snap_enabled is false', () => {
    const engine = new SnapEngine();
    engine.applyConfig({
      snap_enabled: false,
      snap_threshold: 10,
      snap_to_grid: false,
      grid_size: 20,
    });
    const rect: Rect = { left: 5, top: 5, width: 300, height: 200 };
    const result = engine.snap(rect, [], CANVAS_W, CANVAS_H);
    assert.equal(result.snapX, false);
    assert.equal(result.snapY, false);
    assert.equal(result.x, 5);
    assert.equal(result.y, 5);
  });

  it('returns no-snap when shift key held', () => {
    const engine = new SnapEngine();
    engine.applyConfig({
      snap_enabled: true,
      snap_threshold: 10,
      snap_to_grid: false,
      grid_size: 20,
    });
    const rect: Rect = { left: 3, top: 3, width: 300, height: 200 };
    const result = engine.snap(rect, [], CANVAS_W, CANVAS_H, true);
    assert.equal(result.snapX, false, 'shift key should disable snap');
    assert.equal(result.snapY, false);
  });

  it('snaps when enabled and no shift key', () => {
    const engine = new SnapEngine();
    engine.applyConfig({
      snap_enabled: true,
      snap_threshold: 10,
      snap_to_grid: false,
      grid_size: 20,
    });
    const rect: Rect = { left: 6, top: 6, width: 300, height: 200 };
    const result = engine.snap(rect, [], CANVAS_W, CANVAS_H, false);
    assert.equal(result.snapX, true, 'should snap to left edge');
    assert.equal(result.snapY, true, 'should snap to top edge');
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);
  });

  it('returns no-snap before config applied', () => {
    const engine = new SnapEngine();
    const rect: Rect = { left: 3, top: 3, width: 300, height: 200 };
    const result = engine.snap(rect, [], CANVAS_W, CANVAS_H);
    assert.equal(result.snapX, false);
    assert.equal(result.snapY, false);
  });
});
