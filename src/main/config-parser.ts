import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import TOML from '@iarna/toml';
import type {
  AmadeusConfig,
  GeneralConfig,
  CanvasConfig,
  ShellConfig,
  ProfileConfig,
  KeybindingConfig,
} from '../shared/types.js';

// ── Default config ────────────────────────────────────────────────────────────

export function getDefaultConfig(): AmadeusConfig {
  return {
    version: 1,
    general: {
      default_shell: 'powershell',
      default_profile: 'default',
      start_layout: '',
    },
    canvas: {
      snap_enabled: true,
      snap_threshold: 15,
      snap_to_grid: false,
      grid_size: 20,
    },
    shells: {
      powershell: {
        command: 'pwsh.exe',
        args: [],
        profile: 'default',
        elevated: false,
        env: {},
      },
      cmd: {
        command: 'cmd.exe',
        args: [],
        profile: 'default',
        elevated: false,
        env: {},
      },
    },
    profiles: {
      default: {
        font: 'Cascadia Code',
        font_size: 14,
        opacity: 0.9,
        blur: 10,
        text_color: '#c8c8d8',
        text_glow: '',
        border_color: '#444444',
        border_width: 1,
        border_radius: 8,
        titlebar_color: '#444444',
        cursor_style: 'block',
        cursor_color: '#ffffff',
        ligatures: true,
        box_shadow: '',
        css_animation: '',
        custom_css: '',
        background: {
          color: '#1a1a2e',
          image: '',
          image_opacity: 0.2,
          image_blur: 0,
          image_size: 'contain',
          image_position: 'center center',
          image_draggable: false,
        },
        overlay: {
          image: '',
          opacity: 0.05,
        },
      },
    },
    keybindings: {
      new_terminal: 'ctrl+shift+n',
      close_terminal: 'ctrl+shift+w',
      next_terminal: 'ctrl+tab',
      prev_terminal: 'ctrl+shift+tab',
      save_layout: 'ctrl+shift+s',
      load_layout: 'ctrl+shift+l',
      fullscreen: 'f11',
      reload_config: 'ctrl+shift+r',
      copy: 'ctrl+shift+c',
      paste: 'ctrl+shift+v',
    },
    layouts: {},
  };
}

// ── Deep merge ────────────────────────────────────────────────────────────────

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const key of Object.keys(source as Record<string, unknown>)) {
    const srcVal = (source as Record<string, unknown>)[key];
    const tgtVal = result[key];
    if (isPlainObject(tgtVal) && isPlainObject(srcVal)) {
      result[key] = deepMerge(tgtVal, srcVal as Partial<typeof tgtVal>);
    } else if (srcVal !== undefined) {
      result[key] = srcVal;
    }
  }
  return result as T;
}

// ── Parse ─────────────────────────────────────────────────────────────────────

export function parseConfig(tomlString: string): AmadeusConfig {
  const parsed = TOML.parse(tomlString) as Partial<AmadeusConfig>;
  const defaults = getDefaultConfig();
  return deepMerge(defaults, parsed);
}

// ── Validate ──────────────────────────────────────────────────────────────────

export function validateConfig(config: AmadeusConfig): string[] {
  const errors: string[] = [];

  if (typeof config.version !== 'number') {
    errors.push('version must be a number');
  }

  // general
  const g = config.general as GeneralConfig & Record<string, unknown>;
  if (typeof g.default_shell !== 'string') errors.push('general.default_shell must be a string');
  if (typeof g.default_profile !== 'string') errors.push('general.default_profile must be a string');
  if (typeof g.start_layout !== 'string') errors.push('general.start_layout must be a string');

  // canvas
  const c = config.canvas as CanvasConfig & Record<string, unknown>;
  if (typeof c.snap_enabled !== 'boolean') errors.push('canvas.snap_enabled must be a boolean');
  if (typeof c.snap_threshold !== 'number') errors.push('canvas.snap_threshold must be a number');
  if (typeof c.snap_to_grid !== 'boolean') errors.push('canvas.snap_to_grid must be a boolean');
  if (typeof c.grid_size !== 'number') errors.push('canvas.grid_size must be a number');

  // keybindings
  const kb = config.keybindings as KeybindingConfig & Record<string, unknown>;
  const kbFields: (keyof KeybindingConfig)[] = [
    'new_terminal', 'close_terminal', 'next_terminal', 'prev_terminal',
    'save_layout', 'load_layout', 'fullscreen', 'reload_config', 'copy', 'paste',
  ];
  for (const field of kbFields) {
    if (typeof kb[field] !== 'string') {
      errors.push(`keybindings.${field} must be a string`);
    }
  }

  // shells
  for (const [name, shell] of Object.entries(config.shells)) {
    const s = shell as ShellConfig & Record<string, unknown>;
    if (typeof s.command !== 'string') errors.push(`shells.${name}.command must be a string`);
    if (!Array.isArray(s.args)) errors.push(`shells.${name}.args must be an array`);
    if (typeof s.profile !== 'string') errors.push(`shells.${name}.profile must be a string`);
    if (typeof s.elevated !== 'boolean') errors.push(`shells.${name}.elevated must be a boolean`);
  }

  // profiles
  for (const [name, profile] of Object.entries(config.profiles)) {
    const p = profile as ProfileConfig & Record<string, unknown>;
    if (typeof p.font !== 'string') errors.push(`profiles.${name}.font must be a string`);
    if (typeof p.font_size !== 'number') errors.push(`profiles.${name}.font_size must be a number`);
    if (typeof p.opacity !== 'number') errors.push(`profiles.${name}.opacity must be a number`);
    if (typeof p.blur !== 'number') errors.push(`profiles.${name}.blur must be a number`);
  }

  return errors;
}

// ── ConfigManager ─────────────────────────────────────────────────────────────

type UpdateCallback = (config: AmadeusConfig) => void;

export class ConfigManager {
  private _current: AmadeusConfig;
  private _watcher: fs.FSWatcher | null = null;
  private _callbacks: UpdateCallback[] = [];
  private _configPath: string;

  constructor() {
    this._current = getDefaultConfig();
    this._configPath = path.join(os.homedir(), '.amadeus', 'config.toml');
  }

  get current(): AmadeusConfig {
    return this._current;
  }

  load(): void {
    const configDir = path.dirname(this._configPath);

    // Ensure ~/.amadeus/ directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // If user config doesn't exist, seed from the bundled default-config.toml
    if (!fs.existsSync(this._configPath)) {
      // Compiled output is at dist/main/main/config-parser.js
      // Resources are at ../../resources/default-config.toml relative to that
      const defaultTomlPath = path.resolve(
        __dirname,
        '../../resources/default-config.toml'
      );
      if (fs.existsSync(defaultTomlPath)) {
        fs.copyFileSync(defaultTomlPath, this._configPath);
      } else {
        // Fallback: write hardcoded defaults as TOML
        const defaultContent = fs.readFileSync(
          path.resolve(path.dirname(process.argv[1] ?? ''), '../../resources/default-config.toml'),
          'utf-8'
        );
        fs.writeFileSync(this._configPath, defaultContent, 'utf-8');
      }
    }

    const raw = fs.readFileSync(this._configPath, 'utf-8');
    this._current = parseConfig(raw);
  }

  watch(): void {
    if (this._watcher) return;
    if (!fs.existsSync(this._configPath)) return;

    this._watcher = fs.watch(this._configPath, (_event) => {
      try {
        const raw = fs.readFileSync(this._configPath, 'utf-8');
        this._current = parseConfig(raw);
        for (const cb of this._callbacks) {
          cb(this._current);
        }
      } catch {
        // Ignore parse errors during hot-reload
      }
    });
  }

  onUpdate(callback: UpdateCallback): void {
    this._callbacks.push(callback);
  }

  stopWatching(): void {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }
}
