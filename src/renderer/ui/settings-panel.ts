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
  particles?: string;
  particleColor?: string;
}

// Each preset entry: [settings, accent-color for the dot preview]
const THEME_PRESETS: Record<string, [Partial<SettingsChange>, string]> = {
  'Cyberpunk':     [{ bgColor: '#0a0a0a', textColor: '#00ff41', textGlow: '0 0 8px rgba(0,255,65,0.5)', borderColor: '#00ff41', titlebarColor: '#0a1a0a', scanlines: true }, '#00ff41'],
  'Anime Purple':  [{ bgColor: '#1a0a2e', textColor: '#e8d5f5', textGlow: '0 0 8px rgba(147,51,234,0.3)', borderColor: '#9333ea', titlebarColor: '#2a1040' }, '#9333ea'],
  'Naruto':        [{ bgColor: '#1a0f00', textColor: '#fcd34d', textGlow: '0 0 8px rgba(245,158,11,0.4)', borderColor: '#f59e0b', titlebarColor: '#2d1600' }, '#f59e0b'],
  'Tokyo Night':   [{ bgColor: '#1a1b26', textColor: '#a9b1d6', textGlow: '', borderColor: '#414868', titlebarColor: '#16161e' }, '#7aa2f7'],
  'Dracula':       [{ bgColor: '#282a36', textColor: '#f8f8f2', textGlow: '', borderColor: '#6272a4', titlebarColor: '#21222c' }, '#bd93f9'],
  'Monokai':       [{ bgColor: '#272822', textColor: '#f8f8f2', textGlow: '', borderColor: '#75715e', titlebarColor: '#1e1f1c' }, '#a6e22e'],
  'Catppuccin':    [{ bgColor: '#1e1e2e', textColor: '#cdd6f4', textGlow: '', borderColor: '#585b70', titlebarColor: '#181825' }, '#cba6f7'],
  'Rose Pine':     [{ bgColor: '#191724', textColor: '#e0def4', textGlow: '0 0 6px rgba(235,111,146,0.2)', borderColor: '#524f67', titlebarColor: '#1f1d2e' }, '#eb6f92'],
  'Nord':          [{ bgColor: '#2e3440', textColor: '#d8dee9', textGlow: '', borderColor: '#4c566a', titlebarColor: '#242933' }, '#88c0d0'],
  'Solarized':     [{ bgColor: '#002b36', textColor: '#839496', textGlow: '', borderColor: '#586e75', titlebarColor: '#001f27' }, '#268bd2'],
  'Neon Pink':     [{ bgColor: '#0d0015', textColor: '#ff6ec7', textGlow: '0 0 10px rgba(255,110,199,0.5)', borderColor: '#ff6ec7', titlebarColor: '#1a002a' }, '#ff6ec7'],
  'Ocean Blue':    [{ bgColor: '#0a192f', textColor: '#64ffda', textGlow: '0 0 6px rgba(100,255,218,0.3)', borderColor: '#233554', titlebarColor: '#060f1f' }, '#64ffda'],
  'Blood Red':     [{ bgColor: '#1a0000', textColor: '#ff4444', textGlow: '0 0 8px rgba(255,68,68,0.4)', borderColor: '#660000', titlebarColor: '#0d0000' }, '#ff4444'],
};

// Anime theme presets — each includes a bundled background image filename
// The image path is resolved at runtime from window.amadeus.app.animeThemesPath
interface AnimeThemeEntry {
  settings: Partial<SettingsChange>;
  accent: string;
  image: string; // filename in resources/anime-themes/
}

const ANIME_THEME_PRESETS: Record<string, AnimeThemeEntry> = {
  'A Silent Voice': {
    settings: {
      bgColor: '#0d1520', textColor: '#a8d8ea', textGlow: '0 0 8px rgba(168,216,234,0.25)',
      borderColor: '#4a90a8', titlebarColor: '#0a1018', bgOpacity: 0.3,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(74,144,168,0.2)',
    },
    accent: '#4a90a8',
    image: 'silent-voice.png',
  },
  'Evangelion': {
    settings: {
      bgColor: '#0d001a', textColor: '#b266ff', textGlow: '0 0 10px rgba(128,0,255,0.4)',
      borderColor: '#6b00cc', titlebarColor: '#0a0014', bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 25px rgba(107,0,204,0.3)',
    },
    accent: '#6b00cc',
    image: 'evangelion.png',
  },
  'Steins;Gate': {
    settings: {
      bgColor: '#0a0f08', textColor: '#e0c850', textGlow: '0 0 8px rgba(224,200,80,0.35)',
      borderColor: '#8a7a20', titlebarColor: '#080c06', scanlines: true, bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 15px rgba(138,122,32,0.25)',
    },
    accent: '#c8b030',
    image: 'steins-gate.png',
  },
  'Takopi': {
    settings: {
      bgColor: '#0a0010', textColor: '#ff80b0', textGlow: '0 0 10px rgba(255,128,176,0.35)',
      borderColor: '#cc3070', titlebarColor: '#08000d', bgOpacity: 0.3,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(204,48,112,0.25)',
    },
    accent: '#ff4080',
    image: 'takopi.png',
  },
  'Nisekoi': {
    settings: {
      bgColor: '#1a0a14', textColor: '#ffb0c8', textGlow: '0 0 8px rgba(255,176,200,0.3)',
      borderColor: '#e05080', titlebarColor: '#140810', bgOpacity: 0.3,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(224,80,128,0.2)',
    },
    accent: '#e05080',
    image: 'nisekoi.png',
  },
  'Toradora': {
    settings: {
      bgColor: '#1a1008', textColor: '#ffc070', textGlow: '0 0 8px rgba(255,192,112,0.35)',
      borderColor: '#d08030', titlebarColor: '#140c06', bgOpacity: 0.3,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(208,128,48,0.25)',
    },
    accent: '#e89040',
    image: 'toradora.png',
  },
  'Dragon Ball': {
    settings: {
      bgColor: '#0f0f00', textColor: '#ffa030', textGlow: '0 0 10px rgba(255,160,48,0.4)',
      borderColor: '#e08000', titlebarColor: '#0a0a00', bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 25px rgba(224,128,0,0.3)',
    },
    accent: '#ff8c00',
    image: 'dragon-ball.png',
  },
  'Death Note': {
    settings: {
      bgColor: '#0a0000', textColor: '#cc2020', textGlow: '0 0 10px rgba(204,32,32,0.4)',
      borderColor: '#880000', titlebarColor: '#060000', bgOpacity: 0.2,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(136,0,0,0.3)',
    },
    accent: '#cc0000',
    image: 'death-note.png',
  },
  'Attack on Titan': {
    settings: {
      bgColor: '#0f0f08', textColor: '#a0b080', textGlow: '0 0 6px rgba(160,176,128,0.25)',
      borderColor: '#606840', titlebarColor: '#0a0a06', bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 15px rgba(96,104,64,0.2)',
    },
    accent: '#708050',
    image: 'attack-on-titan.png',
  },
  'One Piece': {
    settings: {
      bgColor: '#08101a', textColor: '#50b0ff', textGlow: '0 0 8px rgba(80,176,255,0.3)',
      borderColor: '#d4a020', titlebarColor: '#060c14', bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(212,160,32,0.2)',
    },
    accent: '#d4a020',
    image: 'one-piece.png',
  },
  'Demon Slayer': {
    settings: {
      bgColor: '#060f0f', textColor: '#40d8a0', textGlow: '0 0 8px rgba(64,216,160,0.3)',
      borderColor: '#208060', titlebarColor: '#040c0c', bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(32,128,96,0.25)',
    },
    accent: '#30c080',
    image: 'demon-slayer.png',
  },
  'Fullmetal Alchemist': {
    settings: {
      bgColor: '#140800', textColor: '#ffd040', textGlow: '0 0 8px rgba(255,208,64,0.35)',
      borderColor: '#c03020', titlebarColor: '#100600', bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(192,48,32,0.25)',
    },
    accent: '#c03020',
    image: 'fullmetal-alchemist.png',
  },
  'Cowboy Bebop': {
    settings: {
      bgColor: '#141008', textColor: '#d4a050', textGlow: '0 0 6px rgba(212,160,80,0.3)',
      borderColor: '#8a6830', titlebarColor: '#100c06', bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 15px rgba(138,104,48,0.25)',
    },
    accent: '#c09040',
    image: 'cowboy-bebop.png',
  },
  'Spirited Away': {
    settings: {
      bgColor: '#080a1a', textColor: '#90a0e0', textGlow: '0 0 10px rgba(144,160,224,0.3)',
      borderColor: '#5060a0', titlebarColor: '#060814', bgOpacity: 0.3,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 25px rgba(80,96,160,0.25)',
    },
    accent: '#6070b0',
    image: 'spirited-away.png',
  },
  'My Hero Academia': {
    settings: {
      bgColor: '#081008', textColor: '#60e060', textGlow: '0 0 8px rgba(96,224,96,0.3)',
      borderColor: '#30a030', titlebarColor: '#060c06', bgOpacity: 0.25,
      bgSize: 'contain', bgPosition: 'right bottom', boxShadow: '0 0 20px rgba(48,160,48,0.25)',
    },
    accent: '#40c040',
    image: 'my-hero-academia.png',
  },
};

// Custom theme stored by user
interface CustomThemeData {
  settings: Partial<SettingsChange>;
  accent: string;
  imagePath?: string; // absolute path to user's image
}

export class SettingsPanel {
  private panel: HTMLElement;
  private visible = false;
  private currentProfile: ProfileConfig | null = null;
  private customThemes: Record<string, CustomThemeData> = {};
  private lastApplied: Partial<SettingsChange> = {};
  private lastImagePath = '';
  onChange: (changes: SettingsChange) => void = () => {};
  onPickImage: (type: 'background' | 'overlay') => void = () => {};
  onGetCurrentState: (() => Partial<SettingsChange>) | null = null;

  constructor() {
    this.panel = document.createElement('div');
    this.panel.id = 'settings-panel';
    this.panel.className = 'hidden';
    document.body.appendChild(this.panel);
    this.loadCustomThemes();
  }

  private async loadCustomThemes(): Promise<void> {
    try {
      this.customThemes = await (window as any).amadeus?.themes?.loadCustom() || {};
    } catch { this.customThemes = {}; }
  }

  private async saveCustomThemes(): Promise<void> {
    try {
      await (window as any).amadeus?.themes?.saveCustom(this.customThemes);
    } catch { /* ignore */ }
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
        <span class="sp-title">Appearance</span>
        <button class="sp-close">&times;</button>
      </div>
      <div class="sp-body">

        <!-- THEME PRESETS -->
        <div class="sp-section">
          <div class="sp-label">
            <span class="sp-label-icon">🎨</span>
            Theme Presets
          </div>
          <div class="sp-presets">
            ${Object.entries(THEME_PRESETS).map(([name, [_, dot]]) => `
              <button class="sp-preset" data-theme="${name}">
                <span class="sp-preset-dot" style="background:${dot}"></span>
                ${name}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="sp-divider"></div>

        <!-- ANIME THEMES -->
        <div class="sp-section">
          <div class="sp-label sp-label-collapsible" data-collapse="anime-themes">
            <span class="sp-label-icon">🌸</span>
            Anime Themes
            <span class="sp-collapse-arrow">▾</span>
          </div>
          <div class="sp-collapsible" id="anime-themes">
            <div class="sp-presets sp-presets-anime">
              ${Object.entries(ANIME_THEME_PRESETS).map(([name, entry]) => `
                <button class="sp-preset sp-preset-anime" data-anime-theme="${name}">
                  <span class="sp-preset-dot" style="background:${entry.accent}"></span>
                  ${name}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="sp-divider"></div>

        <!-- MY THEMES (custom) -->
        <div class="sp-section">
          <div class="sp-label sp-label-collapsible" data-collapse="custom-themes">
            <span class="sp-label-icon">💾</span>
            My Themes
            <span class="sp-collapse-arrow">▾</span>
          </div>
          <div class="sp-collapsible" id="custom-themes">
            <div class="sp-presets sp-presets-custom" id="custom-themes-list">
              ${Object.entries(this.customThemes).map(([name, entry]) => `
                <div class="sp-custom-theme-row">
                  <button class="sp-preset sp-preset-custom" data-custom-theme="${name}">
                    <span class="sp-preset-dot" style="background:${entry.accent}"></span>
                    ${name}
                  </button>
                  <button class="sp-custom-delete" data-delete-theme="${name}" title="Delete theme">&times;</button>
                </div>
              `).join('') || '<span class="sp-empty-custom">No custom themes yet</span>'}
            </div>
            <div class="sp-save-theme-row">
              <input type="text" class="sp-save-name" placeholder="Theme name..." maxlength="30">
              <button class="sp-btn sp-save-theme-btn">Save current</button>
            </div>
          </div>
        </div>

        <div class="sp-divider"></div>

        <!-- BACKGROUND -->
        <div class="sp-section">
          <div class="sp-label">
            <span class="sp-label-icon">🖼</span>
            Background
          </div>
          <button class="sp-btn sp-pick-bg">Choose background image...</button>
          <div class="sp-row">
            <label>Color</label>
            <input type="color" data-key="bgColor" value="${p.background?.color || '#1a1a2e'}">
          </div>
          <div class="sp-row">
            <label>Image opacity</label>
            <input type="range" class="sp-range" min="0" max="100" data-key="bgOpacity" value="${Math.round((p.background?.image_opacity ?? 0.2) * 100)}">
            <span class="sp-val">${Math.round((p.background?.image_opacity ?? 0.2) * 100)}%</span>
          </div>
          <div class="sp-row">
            <label>Image size</label>
            <select class="sp-select" data-key="bgSize">
              <option value="cover" ${p.background?.image_size === 'cover' ? 'selected' : ''}>Cover</option>
              <option value="contain" ${p.background?.image_size === 'contain' ? 'selected' : ''}>Contain</option>
              <option value="auto" ${p.background?.image_size === 'auto' ? 'selected' : ''}>Original</option>
              <option value="100% 100%">Stretch</option>
            </select>
          </div>
          <div class="sp-row">
            <label>Position</label>
            <select class="sp-select" data-key="bgPosition">
              <option value="center center">Center</option>
              <option value="right bottom">Bottom right</option>
              <option value="left bottom">Bottom left</option>
              <option value="right top">Top right</option>
              <option value="left top">Top left</option>
              <option value="center bottom">Bottom center</option>
            </select>
          </div>
        </div>

        <div class="sp-divider"></div>

        <!-- OVERLAY -->
        <div class="sp-section">
          <div class="sp-label">
            <span class="sp-label-icon">✨</span>
            Overlay &amp; Effects
          </div>
          <button class="sp-btn sp-pick-overlay">Choose overlay (transparent PNG)...</button>
          <div class="sp-row">
            <label>Overlay opacity</label>
            <input type="range" class="sp-range" min="0" max="100" data-key="overlayOpacity" value="${Math.round((p.overlay?.opacity ?? 0.05) * 100)}">
            <span class="sp-val">${Math.round((p.overlay?.opacity ?? 0.05) * 100)}%</span>
          </div>
          <div class="sp-row">
            <label>Scanlines</label>
            <input type="checkbox" data-key="scanlines" class="sp-check">
          </div>
        </div>

        <div class="sp-divider"></div>

        <!-- PARTICLES -->
        <div class="sp-section">
          <div class="sp-label">
            <span class="sp-label-icon">✦</span>
            Particles
          </div>
          <div class="sp-row">
            <label>Animation</label>
            <select class="sp-select" data-key="particles">
              <option value="none">None</option>
              <option value="snow">Snow</option>
              <option value="fireflies">Fireflies</option>
              <option value="matrix">Matrix</option>
              <option value="starfield">Starfield</option>
              <option value="sakura">Sakura</option>
              <option value="embers">Embers</option>
              <option value="bubbles">Bubbles</option>
              <option value="rain">Rain</option>
            </select>
          </div>
          <div class="sp-row">
            <label>Particle color</label>
            <input type="color" data-key="particleColor" value="#ffffff">
          </div>
        </div>

        <div class="sp-divider"></div>

        <!-- WINDOW -->
        <div class="sp-section">
          <div class="sp-label">
            <span class="sp-label-icon">🪟</span>
            Window
          </div>
          <div class="sp-row">
            <label>Opacity</label>
            <input type="range" class="sp-range" min="10" max="100" data-key="opacity" value="${Math.round((p.opacity ?? 0.9) * 100)}">
            <span class="sp-val">${Math.round((p.opacity ?? 0.9) * 100)}%</span>
          </div>
          <div class="sp-row">
            <label>Blur</label>
            <input type="range" class="sp-range" min="0" max="30" data-key="blur" value="${p.blur ?? 10}">
            <span class="sp-val">${p.blur ?? 10}px</span>
          </div>
          <div class="sp-row">
            <label>Border color</label>
            <input type="color" data-key="borderColor" value="${p.border_color || '#444444'}">
          </div>
          <div class="sp-row">
            <label>Border width</label>
            <input type="range" class="sp-range" min="0" max="4" data-key="borderWidth" value="${p.border_width ?? 1}">
            <span class="sp-val">${p.border_width ?? 1}px</span>
          </div>
          <div class="sp-row">
            <label>Border radius</label>
            <input type="range" class="sp-range" min="0" max="24" data-key="borderRadius" value="${p.border_radius ?? 8}">
            <span class="sp-val">${p.border_radius ?? 8}px</span>
          </div>
          <div class="sp-row">
            <label>Titlebar color</label>
            <input type="color" data-key="titlebarColor" value="${p.titlebar_color || '#444444'}">
          </div>
          <div class="sp-row">
            <label>Shadow</label>
            <select class="sp-select" data-key="boxShadow">
              <option value="">None</option>
              <option value="0 4px 24px rgba(0,0,0,0.6)">Normal</option>
              <option value="0 8px 40px rgba(0,0,0,0.8)">Strong</option>
              <option value="0 0 20px rgba(107,92,231,0.3)">Glow purple</option>
              <option value="0 0 20px rgba(100,140,255,0.3)">Glow blue</option>
              <option value="0 0 20px rgba(0,255,65,0.3)">Glow green</option>
              <option value="0 0 20px rgba(255,110,199,0.3)">Glow pink</option>
              <option value="0 0 30px rgba(255,68,68,0.3)">Glow red</option>
            </select>
          </div>
          <div class="sp-row">
            <label>Padding</label>
            <input type="range" class="sp-range" min="0" max="20" data-key="padding" value="0">
            <span class="sp-val">0px</span>
          </div>
        </div>

        <div class="sp-divider"></div>

        <!-- TEXT -->
        <div class="sp-section">
          <div class="sp-label">
            <span class="sp-label-icon">Aa</span>
            Text &amp; Font
          </div>
          <div class="sp-row">
            <label>Text color</label>
            <input type="color" data-key="textColor" value="${p.text_color || '#c8c8d8'}">
          </div>
          <div class="sp-row">
            <label>Font size</label>
            <input type="range" class="sp-range" min="8" max="28" data-key="fontSize" value="${p.font_size ?? 14}">
            <span class="sp-val">${p.font_size ?? 14}px</span>
          </div>
          <div class="sp-row">
            <label>Font</label>
            <select class="sp-select" data-key="font">
              ${['Cascadia Code','Consolas','Courier New','Fira Code','JetBrains Mono','Hack','Source Code Pro','Ubuntu Mono','IBM Plex Mono','Roboto Mono','Space Mono','Victor Mono','Iosevka'].map(f =>
                `<option ${p.font === f ? 'selected' : ''}>${f}</option>`
              ).join('')}
            </select>
          </div>
          <div class="sp-row">
            <label>Cursor style</label>
            <select class="sp-select" data-key="cursorStyle">
              <option value="block" ${p.cursor_style === 'block' ? 'selected' : ''}>Block</option>
              <option value="underline" ${p.cursor_style === 'underline' ? 'selected' : ''}>Underline</option>
              <option value="bar" ${p.cursor_style === 'bar' ? 'selected' : ''}>Bar</option>
            </select>
          </div>
          <div class="sp-row">
            <label>Cursor color</label>
            <input type="color" data-key="cursorColor" value="${p.cursor_color || '#ffffff'}">
          </div>
          <div class="sp-row">
            <label>Text glow</label>
            <select class="sp-select" data-key="textGlow">
              <option value="" ${!p.text_glow ? 'selected' : ''}>None</option>
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

        <div class="sp-divider"></div>

        <!-- CUSTOM CSS -->
        <div class="sp-section">
          <div class="sp-label">
            <span class="sp-label-icon">&lt;/&gt;</span>
            Custom CSS
          </div>
          <textarea class="sp-textarea" data-key="customCSS" placeholder="/* CSS applied directly to the terminal */
.terminal-body {
  /* your styles here */
}">${p.custom_css || ''}</textarea>
          <button class="sp-btn sp-apply-css">Apply CSS</button>
        </div>

        <!-- RESET -->
        <div class="sp-divider"></div>
        <button class="sp-reset-btn">Reset to default</button>

      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Close
    this.panel.querySelector('.sp-close')!.addEventListener('click', () => this.hide());

    // Theme presets (general)
    this.panel.querySelectorAll('.sp-preset:not(.sp-preset-anime)').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).dataset['theme']!;
        const entry = THEME_PRESETS[name];
        if (entry) {
          const preset = entry[0];
          this.onChange(preset);
          if (preset.bgColor) this.updateInput('bgColor', preset.bgColor);
          if (preset.textColor) this.updateInput('textColor', preset.textColor);
          if (preset.borderColor) this.updateInput('borderColor', preset.borderColor);
          if (preset.titlebarColor) this.updateInput('titlebarColor', preset.titlebarColor);
        }
      });
    });

    // Anime theme presets
    this.panel.querySelectorAll('.sp-preset-anime').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = (btn as HTMLElement).dataset['animeTheme']!;
        const entry = ANIME_THEME_PRESETS[name];
        if (entry) {
          const preset = { ...entry.settings };
          // Resolve the bundled image path via IPC
          try {
            const basePath = await (window as any).amadeus?.app?.getAnimeThemesPath();
            if (basePath && entry.image) {
              preset.bgImage = `${basePath}/${entry.image}`;
            }
          } catch { /* ignore if path resolution fails */ }
          this.onChange(preset);
          if (preset.bgColor) this.updateInput('bgColor', preset.bgColor);
          if (preset.textColor) this.updateInput('textColor', preset.textColor);
          if (preset.borderColor) this.updateInput('borderColor', preset.borderColor);
          if (preset.titlebarColor) this.updateInput('titlebarColor', preset.titlebarColor);
        }
      });
    });

    // Collapsible sections
    this.panel.querySelectorAll('.sp-label-collapsible').forEach(label => {
      label.addEventListener('click', () => {
        const targetId = (label as HTMLElement).dataset['collapse']!;
        const target = this.panel.querySelector(`#${targetId}`) as HTMLElement;
        if (target) {
          target.classList.toggle('collapsed');
          const arrow = label.querySelector('.sp-collapse-arrow') as HTMLElement;
          if (arrow) arrow.textContent = target.classList.contains('collapsed') ? '▸' : '▾';
        }
      });
    });

    // Custom themes — load
    this.panel.querySelectorAll('.sp-preset-custom').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = (btn as HTMLElement).dataset['customTheme']!;
        const entry = this.customThemes[name];
        if (entry) {
          const preset = { ...entry.settings };
          if (entry.imagePath) preset.bgImage = entry.imagePath;
          this.onChange(preset);
          this.lastApplied = preset;
          if (preset.bgColor) this.updateInput('bgColor', preset.bgColor);
          if (preset.textColor) this.updateInput('textColor', preset.textColor);
          if (preset.borderColor) this.updateInput('borderColor', preset.borderColor);
          if (preset.titlebarColor) this.updateInput('titlebarColor', preset.titlebarColor);
        }
      });
    });

    // Custom themes — delete
    this.panel.querySelectorAll('.sp-custom-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = (btn as HTMLElement).dataset['deleteTheme']!;
        delete this.customThemes[name];
        await this.saveCustomThemes();
        this.render(); // re-render to update list
      });
    });

    // Custom themes — save current
    this.panel.querySelector('.sp-save-theme-btn')?.addEventListener('click', async () => {
      const input = this.panel.querySelector('.sp-save-name') as HTMLInputElement;
      const name = input?.value?.trim();
      if (!name) return;

      // Capture current state from the UI controls
      const settings: Partial<SettingsChange> = {};
      const bgColor = this.getInputValue('bgColor');
      const textColor = this.getInputValue('textColor');
      const borderColor = this.getInputValue('borderColor');
      const titlebarColor = this.getInputValue('titlebarColor');
      const cursorColor = this.getInputValue('cursorColor');
      if (bgColor) settings.bgColor = bgColor;
      if (textColor) settings.textColor = textColor;
      if (borderColor) settings.borderColor = borderColor;
      if (titlebarColor) settings.titlebarColor = titlebarColor;
      if (cursorColor) settings.cursorColor = cursorColor;

      // Grab select/range values
      const textGlow = this.getSelectValue('textGlow');
      const boxShadow = this.getSelectValue('boxShadow');
      const bgSize = this.getSelectValue('bgSize');
      const bgPosition = this.getSelectValue('bgPosition');
      const font = this.getSelectValue('font');
      const cursorStyle = this.getSelectValue('cursorStyle');
      if (textGlow !== undefined) settings.textGlow = textGlow;
      if (boxShadow !== undefined) settings.boxShadow = boxShadow;
      if (bgSize) settings.bgSize = bgSize;
      if (bgPosition) settings.bgPosition = bgPosition;
      if (font) settings.font = font;
      if (cursorStyle) settings.cursorStyle = cursorStyle as any;

      const opacity = this.getRangeValue('opacity');
      const blur = this.getRangeValue('blur');
      const bgOpacity = this.getRangeValue('bgOpacity');
      const borderWidth = this.getRangeValue('borderWidth');
      const borderRadius = this.getRangeValue('borderRadius');
      const fontSize = this.getRangeValue('fontSize');
      const padding = this.getRangeValue('padding');
      if (opacity !== null) settings.opacity = opacity / 100;
      if (blur !== null) settings.blur = blur;
      if (bgOpacity !== null) settings.bgOpacity = bgOpacity / 100;
      if (borderWidth !== null) settings.borderWidth = borderWidth;
      if (borderRadius !== null) settings.borderRadius = borderRadius;
      if (fontSize !== null) settings.fontSize = fontSize;
      if (padding !== null) settings.padding = padding;

      const scanlines = this.panel.querySelector('[data-key="scanlines"]') as HTMLInputElement;
      if (scanlines) settings.scanlines = scanlines.checked;

      // Use accent from border or text color
      const accent = borderColor || textColor || '#6b5ce7';

      this.customThemes[name] = {
        settings,
        accent,
        imagePath: this.lastImagePath || undefined,
      };
      await this.saveCustomThemes();
      input.value = '';
      this.render(); // re-render to show new theme
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

    // Reset to default button
    this.panel.querySelector('.sp-reset-btn')?.addEventListener('click', () => {
      this.onChange({
        bgColor: '#1a1a2e',
        textColor: '#c8c8d8',
        textGlow: '',
        borderColor: '#444444',
        titlebarColor: '#444444',
        fontSize: 14,
        opacity: 0.9,
        blur: 10,
        borderWidth: 1,
        borderRadius: 8,
        padding: 0,
        scanlines: false,
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        overlayOpacity: 0.05,
        bgOpacity: 0.2,
        customCSS: '',
      });
      // Re-render to reflect defaults
      if (this.currentProfile) this.render();
    });
  }

  private updateInput(key: string, value: string): void {
    const el = this.panel.querySelector(`[data-key="${key}"]`) as HTMLInputElement;
    if (el) el.value = value;
  }

  private getInputValue(key: string): string {
    const el = this.panel.querySelector(`input[data-key="${key}"]`) as HTMLInputElement;
    return el?.value || '';
  }

  private getSelectValue(key: string): string | undefined {
    const el = this.panel.querySelector(`select[data-key="${key}"]`) as HTMLSelectElement;
    return el?.value;
  }

  private getRangeValue(key: string): number | null {
    const el = this.panel.querySelector(`input[type="range"][data-key="${key}"]`) as HTMLInputElement;
    return el ? parseInt(el.value) : null;
  }

  private emitChange(key: string, value: any): void {
    const changes: SettingsChange = {};
    (changes as any)[key] = value;
    this.lastApplied = { ...this.lastApplied, ...changes };
    this.onChange(changes);
  }

  setImagePath(filePath: string, type: 'background' | 'overlay'): void {
    const selector = type === 'background' ? '.sp-pick-bg' : '.sp-pick-overlay';
    const btn = this.panel.querySelector(selector) as HTMLElement;
    if (btn) {
      const name = filePath.split(/[/\\]/).pop() || filePath;
      btn.textContent = `📷 ${name}`;
    }
    if (type === 'background') this.lastImagePath = filePath;
  }
}
