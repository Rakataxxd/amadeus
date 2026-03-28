export type ParticlePreset = 'none' | 'snow' | 'fireflies' | 'matrix' | 'starfield' | 'sakura' | 'embers' | 'bubbles' | 'rain' | 'lightning' | 'smoke' | 'confetti' | 'stardust' | 'hearts' | 'leaves' | 'ash' | 'binary' | 'galaxy';

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

  lightning: {
    count: 5,
    init: (w, h) => ({
      x: rand(0, w), y: 0,
      vx: 0, vy: 0,
      size: rand(1, 2), opacity: 0,
      life: rand(0, 5), maxLife: rand(3, 6),
      color: '#aaccff',
      char: '',
    }),
    update: (p, dt, w, h) => {
      p.life += dt;
      if (p.life > p.maxLife) {
        p.life = 0;
        p.maxLife = rand(3, 6);
        p.x = rand(0, w);
        p.opacity = 1;
        // Build lightning bolt path
        let path = `${p.x},0`;
        let cx = p.x, cy = 0;
        while (cy < h) {
          cx += rand(-30, 30);
          cy += rand(15, 40);
          path += `|${cx},${Math.min(cy, h)}`;
        }
        p.char = path;
      }
      if (p.opacity > 0) p.opacity = Math.max(0, p.opacity - dt * 4);
    },
    draw: (ctx, p) => {
      if (p.opacity <= 0 || !p.char) return;
      const segs = p.char.split('|').map(s => { const [x, y] = s.split(','); return { x: +x, y: +y }; });
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(segs[0].x, segs[0].y);
      for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    },
  },

  smoke: {
    count: 25,
    init: (w, h) => ({
      x: rand(w * 0.2, w * 0.8), y: h + rand(10, 30),
      vx: rand(-0.3, 0.3), vy: rand(-0.8, -0.3),
      size: rand(15, 35), opacity: rand(0.05, 0.15),
      life: 0, maxLife: rand(5, 10),
      color: '#888888',
    }),
    update: (p, dt, w, h) => {
      p.life += dt;
      p.x += p.vx * dt * 60 + Math.sin(p.life) * 0.3;
      p.y += p.vy * dt * 60;
      p.size += dt * 3;
      p.opacity = Math.max(0, 0.15 * (1 - p.life / p.maxLife));
      if (p.life > p.maxLife) {
        p.x = rand(w * 0.2, w * 0.8); p.y = h + rand(10, 30);
        p.life = 0; p.size = rand(15, 35); p.opacity = rand(0.05, 0.15);
      }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    },
  },

  confetti: {
    count: 50,
    init: (w, _h) => {
      const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6ec7', '#a855f7', '#ff8c00'];
      return {
        x: rand(0, w), y: rand(-20, -5),
        vx: rand(-1, 1), vy: rand(1, 3),
        size: rand(4, 8), opacity: rand(0.7, 1),
        life: 0, maxLife: Infinity,
        color: colors[Math.floor(rand(0, colors.length))],
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.1, 0.1),
      };
    },
    update: (p, dt, w, h) => {
      p.x += p.vx * dt * 60 + Math.sin(p.y * 0.02) * 0.5;
      p.y += p.vy * dt * 60;
      p.rotation! += p.rotSpeed! * dt * 60;
      if (p.y > h + 20) { p.y = rand(-20, -5); p.x = rand(0, w); }
    },
    draw: (ctx, p) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation!);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    },
  },

  stardust: {
    count: 60,
    init: (w, h) => ({
      x: rand(0, w), y: rand(0, h),
      vx: rand(-0.3, 0.3), vy: rand(-0.5, -0.1),
      size: rand(1, 3), opacity: rand(0.3, 0.9),
      life: 0, maxLife: rand(2, 5),
      color: '#ffffcc',
      rotation: rand(0, Math.PI * 2),
    }),
    update: (p, dt, w, h) => {
      p.life += dt;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.opacity = 0.9 * Math.sin((p.life / p.maxLife) * Math.PI);
      p.rotation! += dt * 2;
      if (p.life > p.maxLife) {
        p.x = rand(0, w); p.y = rand(0, h);
        p.life = 0; p.maxLife = rand(2, 5);
      }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      // 4-point star
      const s = p.size;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation!);
      ctx.beginPath();
      ctx.moveTo(0, -s * 2);
      ctx.lineTo(s * 0.4, -s * 0.4);
      ctx.lineTo(s * 2, 0);
      ctx.lineTo(s * 0.4, s * 0.4);
      ctx.lineTo(0, s * 2);
      ctx.lineTo(-s * 0.4, s * 0.4);
      ctx.lineTo(-s * 2, 0);
      ctx.lineTo(-s * 0.4, -s * 0.4);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    },
  },

  hearts: {
    count: 20,
    init: (w, h) => ({
      x: rand(0, w), y: h + rand(10, 30),
      vx: rand(-0.3, 0.3), vy: rand(-0.8, -0.3),
      size: rand(5, 12), opacity: rand(0.3, 0.7),
      life: 0, maxLife: rand(4, 8),
      color: '#ff4477',
      rotation: rand(-0.2, 0.2),
    }),
    update: (p, dt, w, h) => {
      p.life += dt;
      p.x += p.vx * dt * 60 + Math.sin(p.life * 1.5) * 0.4;
      p.y += p.vy * dt * 60;
      p.opacity = Math.max(0, 0.7 * (1 - p.life / p.maxLife));
      if (p.life > p.maxLife) {
        p.x = rand(0, w); p.y = h + rand(10, 30);
        p.life = 0; p.opacity = rand(0.3, 0.7);
      }
    },
    draw: (ctx, p) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.scale(p.size / 10, p.size / 10);
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.bezierCurveTo(-5, -10, -12, -3, 0, 7);
      ctx.bezierCurveTo(12, -3, 5, -10, 0, -3);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    },
  },

  leaves: {
    count: 20,
    init: (w, _h) => {
      const colors = ['#c0392b', '#e67e22', '#f1c40f', '#d35400', '#a04000'];
      return {
        x: rand(-10, w + 10), y: rand(-20, -5),
        vx: rand(0.3, 1), vy: rand(0.5, 1.5),
        size: rand(6, 12), opacity: rand(0.5, 0.9),
        life: 0, maxLife: Infinity,
        color: colors[Math.floor(rand(0, colors.length))],
        rotation: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.03, 0.03),
      };
    },
    update: (p, dt, w, h) => {
      p.x += p.vx * dt * 60 + Math.sin(p.y * 0.01) * 0.8;
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
      ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      // leaf vein
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.stroke();
      ctx.restore();
    },
  },

  ash: {
    count: 40,
    init: (w, _h) => ({
      x: rand(0, w), y: rand(-20, -5),
      vx: rand(-0.2, 0.2), vy: rand(0.3, 0.8),
      size: rand(1, 3), opacity: rand(0.2, 0.5),
      life: 0, maxLife: Infinity,
      color: '#999999',
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.01, 0.01),
    }),
    update: (p, dt, w, h) => {
      p.x += p.vx * dt * 60 + Math.sin(p.y * 0.008 + p.x * 0.005) * 0.4;
      p.y += p.vy * dt * 60;
      p.rotation! += p.rotSpeed! * dt * 60;
      if (p.y > h + 10) { p.y = rand(-20, -5); p.x = rand(0, w); }
    },
    draw: (ctx, p) => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation!);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    },
  },

  binary: {
    count: 40,
    init: (w, h) => ({
      x: Math.floor(rand(0, w / 14)) * 14, y: rand(-h, 0),
      vx: 0, vy: rand(1.5, 4),
      size: 13, opacity: rand(0.3, 0.8),
      life: 0, maxLife: Infinity,
      color: '#00ccff',
      char: Math.random() > 0.5 ? '1' : '0',
    }),
    update: (p, dt, w, h) => {
      p.y += p.vy * dt * 60;
      p.life += dt;
      if (p.life > 0.2) { p.char = Math.random() > 0.5 ? '1' : '0'; p.life = 0; }
      if (p.y > h + 20) { p.y = rand(-40, -10); p.x = Math.floor(rand(0, w / 14)) * 14; }
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.font = `${p.size}px monospace`;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fillText(p.char!, p.x, p.y);
      ctx.shadowBlur = 0;
    },
  },

  galaxy: {
    count: 120,
    init: (w, h) => {
      const cx = w / 2, cy = h / 2;
      const arm = rand(0, Math.PI * 2);
      const dist = rand(5, Math.min(w, h) * 0.4);
      const angle = arm + dist * 0.015;
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: angle, // store angle
        vy: dist,   // store distance
        size: rand(0.5, 2),
        opacity: rand(0.3, 0.9),
        life: 0, maxLife: Infinity,
        color: rand(0, 1) > 0.7 ? '#aaccff' : rand(0, 1) > 0.5 ? '#ffddaa' : '#ffffff',
      };
    },
    update: (p, dt, w, h) => {
      const cx = w / 2, cy = h / 2;
      p.vx += dt * 0.15; // rotate angle
      const angle = p.vx + p.vy * 0.015;
      p.x = cx + Math.cos(angle) * p.vy;
      p.y = cy + Math.sin(angle) * p.vy;
      p.opacity = 0.4 + 0.4 * Math.sin(p.vx * 2);
    },
    draw: (ctx, p) => {
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
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
  private _speed = 1;

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

  setOpacity(opacity: number): void {
    this.canvas.style.opacity = String(opacity);
  }

  setSpeed(speed: number): void {
    this._speed = speed;
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

    const scaledDt = dt * this._speed;
    for (const p of this.particles) {
      this.config.update(p, scaledDt, w, h);
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
