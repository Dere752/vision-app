import type { BoundingBox } from '../types';

/**
 * Per-axis EMA smoother with velocity estimation for prediction.
 * Gives boxes a physically-attached look without full Kalman matrix math.
 */
export class BBoxSmoother {
  private s: { x: number; y: number; w: number; h: number } | null = null;
  private v = { vx: 0, vy: 0, vw: 0, vh: 0 };
  private lastT = 0;
  readonly alpha: number;

  constructor(alpha = 0.35) {
    this.alpha = alpha;
  }

  update(box: BoundingBox): BoundingBox {
    const now = performance.now();
    const dt = this.lastT ? Math.min((now - this.lastT) / 1000, 0.15) : 0;
    this.lastT = now;

    if (!this.s) {
      this.s = { x: box.x, y: box.y, w: box.width, h: box.height };
      return box;
    }

    const a = this.alpha;
    const av = 0.25; // velocity smoothing

    if (dt > 0) {
      this.v.vx = av * (box.x - this.s.x) / dt + (1 - av) * this.v.vx;
      this.v.vy = av * (box.y - this.s.y) / dt + (1 - av) * this.v.vy;
      this.v.vw = av * (box.width - this.s.w) / dt + (1 - av) * this.v.vw;
      this.v.vh = av * (box.height - this.s.h) / dt + (1 - av) * this.v.vh;
    }

    this.s.x = a * box.x + (1 - a) * this.s.x;
    this.s.y = a * box.y + (1 - a) * this.s.y;
    this.s.w = a * box.width + (1 - a) * this.s.w;
    this.s.h = a * box.height + (1 - a) * this.s.h;

    return { x: this.s.x, y: this.s.y, width: this.s.w, height: this.s.h };
  }

  predict(): BoundingBox | null {
    if (!this.s) return null;
    const dt = Math.min((performance.now() - this.lastT) / 1000, 0.10);
    return {
      x: this.s.x + this.v.vx * dt,
      y: this.s.y + this.v.vy * dt,
      width: Math.max(0.001, this.s.w + this.v.vw * dt),
      height: Math.max(0.001, this.s.h + this.v.vh * dt),
    };
  }

  get current(): BoundingBox | null {
    if (!this.s) return null;
    return { x: this.s.x, y: this.s.y, width: this.s.w, height: this.s.h };
  }
}

/** Scalar EMA for single values (FPS, confidence, etc.) */
export class ScalarSmoother {
  private val: number | null = null;
  constructor(private alpha = 0.2) {}
  update(v: number): number {
    this.val = this.val === null ? v : this.alpha * v + (1 - this.alpha) * this.val;
    return this.val;
  }
  get value() { return this.val ?? 0; }
}
