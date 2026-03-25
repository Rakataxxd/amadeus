import type { ProfileConfig } from '../../shared/types.js';

export interface SettingsChange {
  bgImage?: string;
  bgColor?: string;
  bgOpacity?: number;
  bgSize?: string;
  bgPosition?: string;
  blur?: number;
  opacity?: number;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  titlebarColor?: string;
  textColor?: string;
  textGlow?: string;
  fontSize?: number;
  font?: string;
  cursorStyle?: 'block' | 'underline' | 'bar';
  cursorColor?: string;
  padding?: number;
  scanlines?: boolean;
  boxShadow?: string;
  overlayImage?: string;
  overlayOpacity?: number;
  customCSS?: string;
}

const THEME_PRESETS: Record<string, Partial<SettingsChange>> = {
  'Cyberpunk': { bgColor: '#0a0a0a', textColor: '#00ff41', textGlow: '0 0 8px rgba(0,255,65,0.5)', borderColor: '#00ff41', titlebarColor: '#0a1a0a', scanlines: true },
  'Anime Purple': { bgColor: '#1a0a2e', textColor: '#e8d5f5', textGlow: '0 0 8px rgba(147,51,234,0.3)', borderColor: '#9333ea', titlebarColor: '#2a1040' },
  'Naruto': { bgColor: '#1a0f00', textColor: '#fcd34d', textGlow: '0 0 8px rgba(245,158,11,0.4)', borderColor: '#f59e0b', titlebarColor: '#2d1600' },
  'Tokyo Night': { bgColor: '#1a1b26', textColor: '#a9b1d6', textGlow: '', borderColor: '#414868', titlebarColor: '#16161e' },
  'Dracula': { bgColor: '#282a36', textColor: '#f8f8f2', textGlow: '', borderColor: '#6272a4', titlebarColor: '#21222c' },
  'Monokai': { bgColor: '#272822', textColor: '#f8f8f2', textGlow: '', borderColor: '#75715e', titlebarColor: '#1e1f1c' },
  'Catppuccin': { bgColor: '#1e1e2e', textColor: '#cdd6f4', textGlow: '', borderColor: '#585b70', titlebarColor: '#181825' },
  'Rose Pine': { bgColor: '#191724', textColor: '#e0def4', textGlow: '0 0 6px rgba(235,111,146,0.2)', borderColor: '#524f67', titlebarColor: '#1f1d2e' },
  'Nord': { bgColor: '#2e3440', textColor: '#d8dee9', textGlow: '', borderColor: '#4c566a', titlebarColor: '#242933' },
  'Solarized Dark': { bgColor: '#002b36', textColor: '#839496', textGlow: '', borderColor: '#586e75', titlebarColor: '#001f27' },
  'Neon Pink': { bgColor: '#0d0015', textColor: '#ff6ec7', textGlow: '0 0 10px rgba(255,110,199,0.5)', borderColor: '#ff6ec7', titlebarColor: '#1a002a' },
  'Ocean Blue': { bgColor: '#0a192f', textColor: '#64ffda', textGlow: '0 0 6px rgba(100,255,218,0.3)', borderColor: '#233554', titlebarColor: '#060f1f' },
  'Blood Red': { bgColor: '#1a0000', textColor: '#ff4444', textGlow: '0 0 8px rgba(255,68,68,0.4)', borderColor: '#660000', titlebarColor: '#0d0000' },
};

export class SettingsPanel {
  private panel: HTMLElement;
  private visible = false;
  private currentProfile: ProfileConfig | null = null;
  onChange: (changes: SettingsChange) => void = () => {};
  onPickImage: (type: 'background' | 'overlay') => void = () => {};

  constructor() {
    this.panel = document.createElement('div');
    this.panel.id = 'settings-panel';
    this.panel.className = 'hidden';
    document.body.appendChild(this.panel);
  }

  show(profile: ProfileConfig): void {
    this.currentProfile = profile;
    this.visible = true;
    this.panel.classList.remove('hidden');
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.panel.classList.add('hidden');
  }

  toggle(profile: ProfileConfig): void {
    if (this.visible) this.hide();
    else this.show(profile);
  }

  private render(): void {
    const p = this.currentProfile!;
    this.panel.innerHTML = `
      <div class="sp-header">
        <span class="sp-title">Personalizar Terminal</span>
        <button class="sp-close">&times;</button>
      </div>
      <div class="sp-body">

        <!-- THEME PRESETS -->
        <div class="sp-section">
          <div class="sp-label">Temas</div>
          <div class="sp-presets">
            ${Object.keys(THEME_PRESETS).map(name => `
              <button class="sp-preset" data-theme="${name}">${name}</button>
            `).join('')}
          </div>
        </div>

        <!-- BACKGROUND -->
        <div class="sp-section">
          <div class="sp-label">Fondo</div>
          <button class="sp-btn sp-pick-bg">Elegir imagen de fondo...</button>
          <div class="sp-row">
            <label>Color de fondo</label>
            <input type="color" data-key="bgColor" value="${p.background?.color || '#1a1a2e'}">
          </div>
          <div class="sp-row">
            <label>Opacidad imagen</label>
            <input type="range" min="0" max="100" data-key="bgOpacity" value="${Math.round((p.background?.image_opacity ?? 0.2) * 100)}">
            <span class="sp-val">${Math.round((p.background?.image_opacity ?? 0.2) * 100)}%</span>
          </div>
          <div class="sp-row">
            <label>Tamaño imagen</label>
            <select data-key="bgSize">
              <option value="cover" ${p.background?.image_size === 'cover' ? 'selected' : ''}>Cover</option>
              <option value="contain" ${p.background?.image_size === 'contain' ? 'selected' : ''}>Contain</option>
              <option value="auto" ${p.background?.image_size === 'auto' ? 'selected' : ''}>Original</option>
              <option value="100% 100%">Stretch</option>
            </select>
          </div>
          <div class="sp-row">
            <label>Posición imagen</label>
            <select data-key="bgPosition">
              <option value="center center">Centro</option>
              <option value="right bottom">Abajo derecha</option>
              <option value="left bottom">Abajo izquierda</option>
              <option value="right top">Arriba derecha</option>
              <option value="left top">Arriba izquierda</option>
              <option value="center bottom">Abajo centro</option>
            </select>
          </div>
        </div>

        <!-- OVERLAY -->
        <div class="sp-section">
          <div class="sp-label">Overlay (capa decorativa)</div>
          <button class="sp-btn sp-pick-overlay">Elegir overlay (PNG transparente)...</button>
          <div class="sp-row">
            <label>Opacidad overlay</label>
            <input type="range" min="0" max="100" data-key="overlayOpacity" value="${Math.round((p.overlay?.opacity ?? 0.05) * 100)}">
            <span class="sp-val">${Math.round((p.overlay?.opacity ?? 0.05) * 100)}%</span>
          </div>
          <div class="sp-row">
            <label>Scanlines</label>
            <input type="checkbox" data-key="scanlines" class="sp-check">
          </div>
        </div>

        <!-- WINDOW -->
        <div class="sp-section">
          <div class="sp-label">Ventana</div>
          <div class="sp-row">
            <label>Opacidad</label>
            <input type="range" min="10" max="100" data-key="opacity" value="${Math.round((p.opacity ?? 0.9) * 100)}">
            <span class="sp-val">${Math.round((p.opacity ?? 0.9) * 100)}%</span>
          </div>
          <div class="sp-row">
            <label>Blur</label>
            <input type="range" min="0" max="30" data-key="blur" value="${p.blur ?? 10}">
            <span class="sp-val">${p.blur ?? 10}px</span>
          </div>
          <div class="sp-row">
            <label>Color borde</label>
            <input type="color" data-key="borderColor" value="${p.border_color || '#444444'}">
          </div>
          <div class="sp-row">
            <label>Grosor borde</label>
            <input type="range" min="0" max="4" data-key="borderWidth" value="${p.border_width ?? 1}">
            <span class="sp-val">${p.border_width ?? 1}px</span>
          </div>
          <div class="sp-row">
            <label>Radio borde</label>
            <input type="range" min="0" max="24" data-key="borderRadius" value="${p.border_radius ?? 8}">
            <span class="sp-val">${p.border_radius ?? 8}px</span>
          </div>
          <div class="sp-row">
            <label>Color titlebar</label>
            <input type="color" data-key="titlebarColor" value="${p.titlebar_color || '#444444'}">
          </div>
          <div class="sp-row">
            <label>Sombra</label>
            <select data-key="boxShadow">
              <option value="">Ninguna</option>
              <option value="0 4px 24px rgba(0,0,0,0.6)">Normal</option>
              <option value="0 8px 40px rgba(0,0,0,0.8)">Fuerte</option>
              <option value="0 0 20px rgba(100,140,255,0.3)">Glow azul</option>
              <option value="0 0 20px rgba(147,51,234,0.3)">Glow púrpura</option>
              <option value="0 0 20px rgba(0,255,65,0.3)">Glow verde</option>
              <option value="0 0 20px rgba(255,110,199,0.3)">Glow rosa</option>
              <option value="0 0 30px rgba(255,68,68,0.3)">Glow rojo</option>
            </select>
          </div>
          <div class="sp-row">
            <label>Padding</label>
            <input type="range" min="0" max="20" data-key="padding" value="0">
            <span class="sp-val">0px</span>
          </div>
        </div>

        <!-- TEXT -->
        <div class="sp-section">
          <div class="sp-label">Texto</div>
          <div class="sp-row">
            <label>Color texto</label>
            <input type="color" data-key="textColor" value="${p.text_color || '#c8c8d8'}">
          </div>
          <div class="sp-row">
            <label>Tamaño fuente</label>
            <input type="range" min="8" max="28" data-key="fontSize" value="${p.font_size ?? 14}">
            <span class="sp-val">${p.font_size ?? 14}px</span>
          </div>
          <div class="sp-row">
            <label>Fuente</label>
            <select data-key="font">
              ${['Cascadia Code','Consolas','Courier New','Fira Code','JetBrains Mono','Hack','Source Code Pro','Ubuntu Mono','IBM Plex Mono','Roboto Mono','Space Mono','Victor Mono','Iosevka'].map(f =>
                `<option ${p.font === f ? 'selected' : ''}>${f}</option>`
              ).join('')}
            </select>
          </div>
          <div class="sp-row">
            <label>Cursor</label>
            <select data-key="cursorStyle">
              <option value="block" ${p.cursor_style === 'block' ? 'selected' : ''}>Block</option>
              <option value="underline" ${p.cursor_style === 'underline' ? 'selected' : ''}>Underline</option>
              <option value="bar" ${p.cursor_style === 'bar' ? 'selected' : ''}>Bar</option>
            </select>
          </div>
          <div class="sp-row">
            <label>Color cursor</label>
            <input type="color" data-key="cursorColor" value="${p.cursor_color || '#ffffff'}">
          </div>
          <div class="sp-row">
            <label>Glow</label>
            <select data-key="textGlow">
              <option value="" ${!p.text_glow ? 'selected' : ''}>Ninguno</option>
              <option value="0 0 8px rgba(147,51,234,0.4)">Purple</option>
              <option value="0 0 8px rgba(0,255,65,0.5)">Matrix</option>
              <option value="0 0 8px rgba(236,72,153,0.4)">Pink</option>
              <option value="0 0 8px rgba(59,130,246,0.4)">Blue</option>
              <option value="0 0 10px rgba(245,158,11,0.5)">Orange</option>
              <option value="0 0 10px rgba(255,68,68,0.5)">Red</option>
              <option value="0 0 10px rgba(255,255,255,0.3)">White</option>
              <option value="0 0 12px rgba(0,255,255,0.5)">Cyan</option>
              <option value="0 0 15px rgba(255,110,199,0.6)">Neon Pink</option>
            </select>
          </div>
        </div>

        <!-- CUSTOM CSS -->
        <div class="sp-section">
          <div class="sp-label">CSS Personalizado</div>
          <textarea class="sp-textarea" data-key="customCSS" placeholder="/* CSS directo sobre el terminal */
.terminal-body {
  /* tus estilos aquí */
}">${p.custom_css || ''}</textarea>
          <button class="sp-btn sp-apply-css">Aplicar CSS</button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Close
    this.panel.querySelector('.sp-close')!.addEventListener('click', () => this.hide());

    // Theme presets
    this.panel.querySelectorAll('.sp-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).dataset['theme']!;
        const preset = THEME_PRESETS[name];
        if (preset) {
          this.onChange(preset);
          // Update UI controls to reflect preset
          if (preset.bgColor) this.updateInput('bgColor', preset.bgColor);
          if (preset.textColor) this.updateInput('textColor', preset.textColor);
          if (preset.borderColor) this.updateInput('borderColor', preset.borderColor);
          if (preset.titlebarColor) this.updateInput('titlebarColor', preset.titlebarColor);
        }
      });
    });

    // Pick background image
    this.panel.querySelector('.sp-pick-bg')?.addEventListener('click', () => this.onPickImage('background'));

    // Pick overlay image
    this.panel.querySelector('.sp-pick-overlay')?.addEventListener('click', () => this.onPickImage('overlay'));

    // Color inputs
    this.panel.querySelectorAll('input[type="color"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const key = (e.target as HTMLElement).dataset['key']!;
        this.emitChange(key, (e.target as HTMLInputElement).value);
      });
    });

    // Range inputs
    this.panel.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const el = e.target as HTMLInputElement;
        const key = el.dataset['key']!;
        const val = parseInt(el.value);
        const span = el.nextElementSibling as HTMLElement;

        if (key === 'opacity' || key === 'bgOpacity' || key === 'overlayOpacity') {
          if (span) span.textContent = `${val}%`;
          this.emitChange(key, val / 100);
        } else if (key === 'blur' || key === 'borderWidth' || key === 'borderRadius' || key === 'padding') {
          if (span) span.textContent = `${val}px`;
          this.emitChange(key, val);
        } else if (key === 'fontSize') {
          if (span) span.textContent = `${val}px`;
          this.emitChange(key, val);
        }
      });
    });

    // Select inputs
    this.panel.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', (e) => {
        const el = e.target as HTMLSelectElement;
        this.emitChange(el.dataset['key']!, el.value);
      });
    });

    // Checkbox inputs
    this.panel.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const el = e.target as HTMLInputElement;
        this.emitChange(el.dataset['key']!, el.checked);
      });
    });

    // Apply CSS button
    this.panel.querySelector('.sp-apply-css')?.addEventListener('click', () => {
      const ta = this.panel.querySelector('.sp-textarea') as HTMLTextAreaElement;
      if (ta) this.emitChange('customCSS', ta.value);
    });
  }

  private updateInput(key: string, value: string): void {
    const el = this.panel.querySelector(`[data-key="${key}"]`) as HTMLInputElement;
    if (el) el.value = value;
  }

  private emitChange(key: string, value: any): void {
    const changes: SettingsChange = {};
    (changes as any)[key] = value;
    this.onChange(changes);
  }

  setImagePath(path: string, type: 'background' | 'overlay'): void {
    const selector = type === 'background' ? '.sp-pick-bg' : '.sp-pick-overlay';
    const btn = this.panel.querySelector(selector) as HTMLElement;
    if (btn) {
      const name = path.split(/[/\\]/).pop() || path;
      btn.textContent = `📷 ${name}`;
    }
  }
}
