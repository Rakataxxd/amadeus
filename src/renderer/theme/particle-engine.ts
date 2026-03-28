export type ParticlePreset = 'none' | 'snow' | 'fireflies' | 'matrix' | 'starfield' | 'sakura' | 'embers' | 'bubbles' | 'rain';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
  char?: string;
  rotation?: number;
  rotSpeed?: number;
}

interface PresetConfig {
  count: number;
  init: (w: number, h: number) => Particle;
  update: (p: Particle, dt: number, w: number, h: number) => void;
  draw: (ctx: CanvasRenderingContext2D, p: Particle) => void;
}

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

function randomChar(): string {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const PRESETS: Record<Exclude<ParticlePreset, 'none'>, PresetConfig> = {
  snow: {
    count: 60,
    init: (w, h) => ({
      x: rand(0, w), y: rand(-20, h),
      vx: rand(-0.3, 0.3), vy: rand(0.3, 1.2),
      size: rand(2, 5), opacity: rand(0.3, 0.8),
      life: 0, maxLife: Infinity,
      color: '#ffffff',
    }),
    update: (p, dt, w, h) => {
      p.x += p.vx * dt * 60 + Math.sin(p.y * 0.01) * 0.3;
      p.y += p.vy * dt * 60;
      if (p.y > h + 10) { p.y = -10; p.x = rand(0, w); }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    },
    draw: (ctx, p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    },
  },

  fireflies: {
    count: 30,
    init: (w, h) => ({
      x: rand(0, w), y: rand(0, h),
      vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5),
      size: rand(1.5, 3), opacity: rand(0.1, 0.8),
      life: 0, maxLife: rand(3, 8),
      color: '#ffee88',
    }),
    update: (p, dt, w, h) => {
      p.life += dt;
      p.vx += rand(-0.05, 0.05);
      p.vy += rand(-0.05, 0.05);
      p.vx = Math.max(-1, Math.min(1, p.vx));
      p.vy = Math.max(-1, Math.min(1, p.vy));
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.opacity = 0.3 + 0.5 * Math.sin(p.life * 2);
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      if (p.life > p.maxLife) { p.life = 0; p.x = rand(0, w); p.y = rand(0, h); }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    },
  },

  matrix: {
    count: 50,
    init: (w, h) => ({
      x: Math.floor(rand(0, w / 14)) * 14, y: rand(-h, 0),
      vx: 0, vy: rand(2, 6),
      size: 14, opacity: rand(0.4, 1),
      life: 0, maxLife: Infinity,
      color: '#00ff41',
      char: randomChar(),
    }),
    update: (p, dt, w, h) => {
      p.y += p.vy * dt * 60;
      p.life += dt;
      if (p.life > 0.15) { p.char = randomChar(); p.life = 0; }
      if (p.y > h + 20) { p.y = rand(-40, -10); p.x = Math.floor(rand(0, w / 14)) * 14; }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.font = `${p.size}px monospace`;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillText(p.char!, p.x, p.y);
      ctx.shadowBlur = 0;
    },
  },

  starfield: {
    count: 80,
    init: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const angle = rand(0, Math.PI * 2);
      const dist = rand(0, 5);
      return {
        x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle) * rand(0.5, 2), vy: Math.sin(angle) * rand(0.5, 2),
        size: rand(0.5, 1.5), opacity: 0.1,
        life: 0, maxLife: Infinity,
        color: '#ffffff',
      };
    },
    update: (p, dt, w, h) => {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 1 + dt * 0.5;
      p.vy *= 1 + dt * 0.5;
      p.size = Math.min(3, p.size + dt * 0.3);
      p.opacity = Math.min(1, p.opacity + dt * 0.4);
      if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
        const cx = w / 2, cy = h / 2;
        const angle = rand(0, Math.PI * 2);
        p.x = cx + Math.cos(angle) * rand(0, 5);
        p.y = cy + Math.sin(angle) * rand(0, 5);
        p.vx = Math.cos(angle) * rand(0.5, 2);
        p.vy = Math.sin(angle) * rand(0.5, 2);
        p.size = rand(0.5, 1.5);
        p.opacity = 0.1;
      }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    },
  },

  sakura: {
    count: 25,
    init: (w, _h) => ({
      x: rand(-10, w + 10), y: rand(-20, -5),
      vx: rand(0.2, 0.8), vy: rand(0.5, 1.5),
      size: rand(4, 8), opacity: rand(0.4, 0.8),
      life: 0, maxLife: Infinity,
      color: '#ffb7c5',
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.02, 0.02),
    }),
    update: (p, dt, w, h) => {
      p.x += p.vx * dt * 60 + Math.sin(p.y * 0.015) * 0.5;
      p.y += p.vy * dt * 60;
      p.rotation! += p.rotSpeed! * dt * 60;
      if (p.y > h + 20) { p.y = rand(-20, -5); p.x = rand(-10, w + 10); }
    },
    draw: (ctx, p) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation!);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity * 0.6;
      ctx.fill();
      ctx.restore();
    },
  },

  embers: {
    count: 40,
    init: (w, h) => ({
      x: rand(0, w), y: h + rand(5, 20),
      vx: rand(-0.3, 0.3), vy: rand(-1.5, -0.5),
      size: rand(1, 3), opacity: rand(0.5, 1),
      life: 0, maxLife: rand(3, 7),
      color: Math.random() > 0.5 ? '#ff6b35' : '#ffa500',
    }),
    update: (p, dt, w, h) => {
      p.life += dt;
      p.x += p.vx * dt * 60 + Math.sin(p.life * 3) * 0.2;
      p.y += p.vy * dt * 60;
      p.opacity = Math.max(0, 1 - p.life / p.maxLife);
      p.size = Math.max(0.3, p.size - dt * 0.1);
      if (p.life > p.maxLife) {
        p.x = rand(0, w); p.y = h + rand(5, 20);
        p.life = 0; p.opacity = rand(0.5, 1);
        p.size = rand(1, 3); p.vy = rand(-1.5, -0.5);
      }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    },
  },

  bubbles: {
    count: 20,
    init: (w, h) => ({
      x: rand(0, w), y: h + rand(10, 30),
      vx: rand(-0.2, 0.2), vy: rand(-0.8, -0.3),
      size: rand(4, 12), opacity: rand(0.1, 0.3),
      life: 0, maxLife: Infinity,
      color: '#88ccff',
    }),
    update: (p, dt, w, h) => {
      p.x += p.vx * dt * 60 + Math.sin(p.y * 0.02) * 0.3;
      p.y += p.vy * dt * 60;
      if (p.y < -20) { p.y = h + rand(10, 30); p.x = rand(0, w); p.size = rand(4, 12); }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = p.opacity * 0.6;
      ctx.fill();
    },
  },

  rain: {
    count: 100,
    init: (w, h) => ({
      x: rand(0, w), y: rand(-h, 0),
      vx: rand(-0.5, -0.2), vy: rand(6, 12),
      size: rand(1, 2), opacity: rand(0.2, 0.5),
      life: 0, maxLife: Infinity,
      color: '#7ec8e3',
    }),
    update: (p, dt, w, h) => {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      if (p.y > h + 10) { p.y = rand(-20, -5); p.x = rand(0, w); }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
      ctx.stroke();
    },
  },
};

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private preset: ParticlePreset = 'none';
  private config: PresetConfig | null = null;
  private rafId: number | null = null;
  private lastTime = 0;
  private _color: string | null = null;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'particle-layer';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  setPreset(name: ParticlePreset): void {
    if (name === this.preset) return;
    this.preset = name;
    this.particles = [];

    if (name === 'none') {
      this.config = null;
      this.stop();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.config = PRESETS[name];
    this.syncSize();
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (let i = 0; i < this.config.count; i++) {
      const p = this.config.init(w, h);
      if (this._color) p.color = this._color;
      this.particles.push(p);
    }
    this.start();
  }

  setColor(color: string | null): void {
    this._color = color;
    if (color) {
      for (const p of this.particles) p.color = color;
    }
  }

  private syncSize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private start(): void {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.syncSize();
      this.tick(dt);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  private stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(dt: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!this.config) return;

    for (const p of this.particles) {
      this.config.update(p, dt, w, h);
      this.config.draw(ctx, p);
    }
    ctx.globalAlpha = 1;
  }

  dispose(): void {
    this.stop();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
