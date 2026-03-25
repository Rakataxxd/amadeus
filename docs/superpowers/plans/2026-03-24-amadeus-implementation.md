# Amadeus Terminal Emulator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows terminal emulator with free-form canvas layout, per-terminal visual customization, and TOML-based config.

**Architecture:** Electron app with two processes. Main process handles PTY spawning (node-pty), config parsing (TOML), and layout persistence. Renderer process handles the free-form canvas with xterm.js terminals, drag/resize/snap, and theme application. IPC bridges the two via a defined channel contract.

**Tech Stack:** Electron 33+, TypeScript, xterm.js (WebGL addon), node-pty, @iarna/toml, electron-builder

**Spec:** `docs/superpowers/specs/2026-03-24-amadeus-terminal-design.md`

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript config (two projects: main + renderer) |
| `electron-builder.yml` | Build/packaging config for Windows |
| `src/shared/types.ts` | All TypeScript interfaces (Config, Profile, Layout, Shell, Terminal) |
| `src/shared/ipc-channels.ts` | IPC channel name constants |
| `src/shared/path-utils.ts` | Tilde/env-var expansion, path normalization |
| `src/main/index.ts` | Electron entry point, creates BrowserWindow |
| `src/main/config-parser.ts` | Reads/validates TOML, fs.watch hot-reload |
| `src/main/shell-registry.ts` | Auto-detects installed shells |
| `src/main/pty-manager.ts` | Spawns/kills PTY processes via node-pty |
| `src/main/layout-store.ts` | Saves/loads layout JSON to ~/.amadeus/layouts/ |
| `src/main/ipc-handlers.ts` | Registers all IPC handlers on main process |
| `src/preload/preload.ts` | contextBridge whitelist API |
| `src/renderer/index.html` | Base HTML shell |
| `src/renderer/index.ts` | Renderer entry point, initializes all managers |
| `src/renderer/styles.css` | Base styles, CSS variables, titlebar, canvas |
| `src/renderer/canvas/canvas-manager.ts` | Root container, terminal lifecycle |
| `src/renderer/canvas/drag-engine.ts` | Titlebar drag with snap support |
| `src/renderer/canvas/resize-engine.ts` | Edge/corner resize with min size |
| `src/renderer/canvas/snap-engine.ts` | Snap-to-edge/grid/other-terminals logic |
| `src/renderer/canvas/z-manager.ts` | Z-index management, focus tracking |
| `src/renderer/terminal/terminal-instance.ts` | xterm.js wrapper with WebGL/canvas fallback |
| `src/renderer/terminal/terminal-titlebar.ts` | Per-terminal titlebar with controls |
| `src/renderer/terminal/terminal-container.ts` | Visual wrapper combining all layers |
| `src/renderer/theme/theme-engine.ts` | Resolves profile config to CSS styles |
| `src/renderer/theme/background-layer.ts` | Background image/gradient rendering |
| `src/renderer/theme/image-dragger.ts` | Alt+Drag/Scroll for background image repositioning |
| `src/renderer/theme/overlay-layer.ts` | Overlay image layer |
| `src/renderer/keybindings/keybinding-manager.ts` | Shortcut registration and dispatch |
| `src/renderer/ui/shell-picker.ts` | New-terminal dropdown menu |
| `resources/default-config.toml` | Default config template |
| `tests/shared/path-utils.test.ts` | Path resolution tests |
| `tests/main/config-parser.test.ts` | Config parsing/validation tests |
| `tests/main/shell-registry.test.ts` | Shell detection tests |
| `tests/renderer/snap-engine.test.ts` | Snap calculation tests |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.main.json`
- Create: `tsconfig.renderer.json`
- Create: `electron-builder.yml`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd /c/Users/Pc/terminal-app
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install electron@latest xterm @xterm/addon-webgl node-pty @iarna/toml
npm install -D typescript @types/node electron-builder concurrently
```

- [ ] **Step 3: Create tsconfig.json (project references)**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.main.json" },
    { "path": "./tsconfig.renderer.json" }
  ]
}
```

- [ ] **Step 4: Create tsconfig.main.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist/main",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/main/**/*", "src/shared/**/*", "src/preload/**/*"]
}
```

- [ ] **Step 5: Create tsconfig.renderer.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist/renderer",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 6: Create electron-builder.yml**

```yaml
appId: com.amadeus.terminal
productName: Amadeus
directories:
  output: release
win:
  target: nsis
  icon: resources/icon.ico
files:
  - dist/**/*
  - resources/**/*
  - "!node_modules/**/*.ts"
extraResources:
  - from: resources/default-config.toml
    to: default-config.toml
```

- [ ] **Step 7: Create .gitignore**

```
node_modules/
dist/
release/
.superpowers/
*.js.map
```

- [ ] **Step 8: Add scripts to package.json**

Set `"main": "dist/main/main/index.js"` and add scripts:

```json
{
  "scripts": {
    "build": "tsc -b",
    "start": "npm run build && electron .",
    "dev": "concurrently \"tsc -b -w\" \"electron .\"",
    "test": "node --test tests/**/*.test.ts",
    "dist": "npm run build && electron-builder"
  }
}
```

- [ ] **Step 9: Create directory structure**

```bash
mkdir -p src/main src/renderer/canvas src/renderer/terminal src/renderer/theme src/renderer/keybindings src/renderer/ui src/shared src/preload resources tests/shared tests/main tests/renderer
```

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "chore: scaffold Amadeus project with Electron + TypeScript"
```

---

### Task 2: Shared Types and IPC Channels

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/ipc-channels.ts`

- [ ] **Step 1: Write types.ts**

```typescript
// src/shared/types.ts

export interface AmadeusConfig {
  version: number;
  general: GeneralConfig;
  canvas: CanvasConfig;
  shells: Record<string, ShellConfig>;
  profiles: Record<string, ProfileConfig>;
  keybindings: KeybindingConfig;
  layouts: Record<string, LayoutConfig>;
}

export interface GeneralConfig {
  default_shell: string;
  default_profile: string;
  start_layout: string;
}

export interface CanvasConfig {
  snap_enabled: boolean;
  snap_threshold: number;
  snap_to_grid: boolean;
  grid_size: number;
}

export interface ShellConfig {
  command: string;
  args: string[];
  profile: string;
  elevated: boolean;
  env: Record<string, string>;
}

export interface ProfileConfig {
  font: string;
  font_size: number;
  opacity: number;
  blur: number;
  text_color: string;
  text_glow: string;
  border_color: string;
  border_width: number;
  border_radius: number;
  titlebar_color: string;
  cursor_style: 'block' | 'underline' | 'bar';
  cursor_color: string;
  ligatures: boolean;
  background: BackgroundConfig;
  overlay: OverlayConfig;
  box_shadow: string;
  css_animation: string;
  custom_css: string;
}

export interface BackgroundConfig {
  color: string;
  image: string;
  image_opacity: number;
  image_blur: number;
  image_size: string;
  image_position: string;
  image_draggable: boolean;
}

export interface OverlayConfig {
  image: string;
  opacity: number;
}

export interface KeybindingConfig {
  new_terminal: string;
  close_terminal: string;
  next_terminal: string;
  prev_terminal: string;
  save_layout: string;
  load_layout: string;
  fullscreen: string;
  reload_config: string;
  copy: string;
  paste: string;
}

export interface LayoutConfig {
  terminals: LayoutTerminal[];
}

export interface LayoutTerminal {
  shell: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  bg_offset_x: number;
  bg_offset_y: number;
  bg_scale: number;
}

export interface ShellInfo {
  id: string;
  name: string;
  command: string;
  elevated: boolean;
  profile: string;
}

export interface TerminalInfo {
  terminalId: string;
  shellId: string;
  pid: number;
  elevated: boolean;
}
```

- [ ] **Step 2: Write ipc-channels.ts**

```typescript
// src/shared/ipc-channels.ts

export const IPC = {
  PTY_CREATE: 'pty:create',
  PTY_CREATED: 'pty:created',
  PTY_DATA: 'pty:data',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_CLOSE: 'pty:close',
  PTY_EXITED: 'pty:exited',
  CONFIG_UPDATED: 'config:updated',
  CONFIG_GET: 'config:get',
  CONFIG_CURRENT: 'config:current',
  LAYOUT_SAVE: 'layout:save',
  LAYOUT_LOAD: 'layout:load',
  LAYOUT_DATA: 'layout:data',
  SHELL_LIST: 'shell:list',
  SHELL_AVAILABLE: 'shell:available',
  ERROR: 'error',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/ && git commit -m "feat: add shared types and IPC channel definitions"
```

---

### Task 3: Path Utilities

**Files:**
- Create: `src/shared/path-utils.ts`
- Create: `tests/shared/path-utils.test.ts`
- Test: `node --test tests/shared/path-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/shared/path-utils.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolvePath } from '../../src/shared/path-utils.js';

describe('resolvePath', () => {
  it('expands ~ to home directory', () => {
    const result = resolvePath('~/images/bg.png');
    assert.ok(result.startsWith(process.env.USERPROFILE || process.env.HOME || ''));
    assert.ok(result.endsWith('images/bg.png') || result.endsWith('images\\bg.png'));
  });

  it('expands %USERPROFILE% environment variable', () => {
    const result = resolvePath('%USERPROFILE%/test.png');
    assert.ok(result.startsWith(process.env.USERPROFILE || ''));
  });

  it('resolves relative paths against ~/.amadeus/', () => {
    const result = resolvePath('images/bg.png');
    const home = process.env.USERPROFILE || process.env.HOME || '';
    assert.ok(result.includes('.amadeus'));
    assert.ok(result.endsWith('images/bg.png') || result.endsWith('images\\bg.png'));
  });

  it('returns absolute paths unchanged', () => {
    const result = resolvePath('C:/Users/test/bg.png');
    assert.strictEqual(result, 'C:\\Users\\test\\bg.png');
  });

  it('normalizes forward slashes to backslashes on Windows', () => {
    const result = resolvePath('C:/some/path/file.txt');
    assert.ok(!result.includes('/') || process.platform !== 'win32');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /c/Users/Pc/terminal-app && npx tsx --test tests/shared/path-utils.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Install tsx for running TS tests**

```bash
npm install -D tsx
```

- [ ] **Step 4: Write path-utils.ts**

```typescript
// src/shared/path-utils.ts
import * as path from 'path';
import * as os from 'os';

export function resolvePath(inputPath: string): string {
  let resolved = inputPath;

  // Expand ~
  if (resolved.startsWith('~')) {
    resolved = path.join(os.homedir(), resolved.slice(1));
  }

  // Expand %ENV_VAR%
  resolved = resolved.replace(/%([^%]+)%/g, (_, varName) => {
    return process.env[varName] || `%${varName}%`;
  });

  // Resolve relative paths against ~/.amadeus/
  if (!path.isAbsolute(resolved)) {
    resolved = path.join(os.homedir(), '.amadeus', resolved);
  }

  // Normalize separators
  return path.normalize(resolved);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx tsx --test tests/shared/path-utils.test.ts
```

Expected: All 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/path-utils.ts tests/shared/ && git commit -m "feat: add path resolution with ~ and %ENV% expansion"
```

---

### Task 4: Default Config and Config Parser

**Files:**
- Create: `resources/default-config.toml`
- Create: `src/main/config-parser.ts`
- Create: `tests/main/config-parser.test.ts`

- [ ] **Step 1: Write default-config.toml**

```toml
version = 1

[general]
default_shell = "powershell"
default_profile = "default"
start_layout = ""

[canvas]
snap_enabled = true
snap_threshold = 15
snap_to_grid = false
grid_size = 20

[shells.powershell]
command = "pwsh.exe"
args = []
profile = "default"
elevated = false
env = {}

[shells.cmd]
command = "cmd.exe"
args = []
profile = "default"
elevated = false
env = {}

[profiles.default]
font = "Cascadia Code"
font_size = 14
opacity = 0.9
blur = 10
text_color = "#c8c8d8"
text_glow = ""
border_color = "#444444"
border_width = 1
border_radius = 8
titlebar_color = "#444444"
cursor_style = "block"
cursor_color = "#ffffff"
ligatures = true
box_shadow = ""
css_animation = ""
custom_css = ""

[profiles.default.background]
color = "#1a1a2e"
image = ""
image_opacity = 0.2
image_blur = 0
image_size = "contain"
image_position = "center center"
image_draggable = false

[profiles.default.overlay]
image = ""
opacity = 0.05

[keybindings]
new_terminal = "ctrl+shift+n"
close_terminal = "ctrl+shift+w"
next_terminal = "ctrl+tab"
prev_terminal = "ctrl+shift+tab"
save_layout = "ctrl+shift+s"
load_layout = "ctrl+shift+l"
fullscreen = "f11"
reload_config = "ctrl+shift+r"
copy = "ctrl+shift+c"
paste = "ctrl+shift+v"
```

- [ ] **Step 2: Write failing tests for config-parser**

```typescript
// tests/main/config-parser.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseConfig, getDefaultConfig, validateConfig } from '../../src/main/config-parser.js';

describe('getDefaultConfig', () => {
  it('returns a valid config with version 1', () => {
    const config = getDefaultConfig();
    assert.strictEqual(config.version, 1);
    assert.strictEqual(config.general.default_shell, 'powershell');
  });
});

describe('parseConfig', () => {
  it('parses a valid TOML string', () => {
    const toml = `
version = 1
[general]
default_shell = "cmd"
default_profile = "default"
start_layout = ""
[canvas]
snap_enabled = false
snap_threshold = 10
snap_to_grid = false
grid_size = 20
[keybindings]
new_terminal = "ctrl+shift+n"
close_terminal = "ctrl+shift+w"
next_terminal = "ctrl+tab"
prev_terminal = "ctrl+shift+tab"
save_layout = "ctrl+shift+s"
load_layout = "ctrl+shift+l"
fullscreen = "f11"
reload_config = "ctrl+shift+r"
copy = "ctrl+shift+c"
paste = "ctrl+shift+v"
`;
    const config = parseConfig(toml);
    assert.strictEqual(config.general.default_shell, 'cmd');
    assert.strictEqual(config.canvas.snap_enabled, false);
  });

  it('merges missing fields with defaults', () => {
    const toml = `
version = 1
[general]
default_shell = "cmd"
default_profile = "default"
start_layout = ""
`;
    const config = parseConfig(toml);
    assert.strictEqual(config.canvas.snap_enabled, true); // default
    assert.ok(config.keybindings.new_terminal); // default
  });
});

describe('validateConfig', () => {
  it('returns errors for invalid types', () => {
    const config = getDefaultConfig();
    (config as any).canvas.snap_threshold = 'not a number';
    const errors = validateConfig(config);
    assert.ok(errors.length > 0);
  });

  it('returns empty array for valid config', () => {
    const config = getDefaultConfig();
    const errors = validateConfig(config);
    assert.strictEqual(errors.length, 0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx tsx --test tests/main/config-parser.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 4: Write config-parser.ts**

```typescript
// src/main/config-parser.ts
import * as TOML from '@iarna/toml';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AmadeusConfig, ProfileConfig, BackgroundConfig, OverlayConfig } from '../shared/types.js';

const CONFIG_DIR = path.join(os.homedir(), '.amadeus');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.toml');

const DEFAULT_BACKGROUND: BackgroundConfig = {
  color: '#1a1a2e', image: '', image_opacity: 0.2,
  image_blur: 0, image_size: 'contain',
  image_position: 'center center', image_draggable: false,
};

const DEFAULT_OVERLAY: OverlayConfig = { image: '', opacity: 0.05 };

const DEFAULT_PROFILE: ProfileConfig = {
  font: 'Cascadia Code', font_size: 14, opacity: 0.9, blur: 10,
  text_color: '#c8c8d8', text_glow: '', border_color: '#444444',
  border_width: 1, border_radius: 8, titlebar_color: '#444444',
  cursor_style: 'block', cursor_color: '#ffffff', ligatures: true,
  background: { ...DEFAULT_BACKGROUND }, overlay: { ...DEFAULT_OVERLAY },
  box_shadow: '', css_animation: '', custom_css: '',
};

export function getDefaultConfig(): AmadeusConfig {
  return {
    version: 1,
    general: { default_shell: 'powershell', default_profile: 'default', start_layout: '' },
    canvas: { snap_enabled: true, snap_threshold: 15, snap_to_grid: false, grid_size: 20 },
    shells: {
      powershell: { command: 'pwsh.exe', args: [], profile: 'default', elevated: false, env: {} },
      cmd: { command: 'cmd.exe', args: [], profile: 'default', elevated: false, env: {} },
    },
    profiles: { default: { ...DEFAULT_PROFILE, background: { ...DEFAULT_BACKGROUND }, overlay: { ...DEFAULT_OVERLAY } } },
    keybindings: {
      new_terminal: 'ctrl+shift+n', close_terminal: 'ctrl+shift+w',
      next_terminal: 'ctrl+tab', prev_terminal: 'ctrl+shift+tab',
      save_layout: 'ctrl+shift+s', load_layout: 'ctrl+shift+l',
      fullscreen: 'f11', reload_config: 'ctrl+shift+r',
      copy: 'ctrl+shift+c', paste: 'ctrl+shift+v',
    },
    layouts: {},
  };
}

export function parseConfig(tomlString: string): AmadeusConfig {
  const parsed = TOML.parse(tomlString) as any;
  const defaults = getDefaultConfig();
  return deepMerge(defaults, parsed) as AmadeusConfig;
}

export function validateConfig(config: AmadeusConfig): string[] {
  const errors: string[] = [];
  if (typeof config.version !== 'number') errors.push('version must be a number');
  if (typeof config.canvas?.snap_threshold !== 'number') errors.push('canvas.snap_threshold must be a number');
  if (typeof config.canvas?.snap_enabled !== 'boolean') errors.push('canvas.snap_enabled must be a boolean');
  if (typeof config.canvas?.grid_size !== 'number') errors.push('canvas.grid_size must be a number');
  if (config.general?.default_shell && typeof config.general.default_shell !== 'string')
    errors.push('general.default_shell must be a string');
  return errors;
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export class ConfigManager {
  private config: AmadeusConfig;
  private watcher: fs.FSWatcher | null = null;
  private onUpdateCallbacks: Array<(config: AmadeusConfig) => void> = [];

  constructor() {
    this.config = getDefaultConfig();
  }

  get current(): AmadeusConfig { return this.config; }

  load(): AmadeusConfig {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG_PATH)) {
      const defaultToml = fs.readFileSync(
        path.join(__dirname, '../../resources/default-config.toml'), 'utf-8'
      );
      fs.writeFileSync(CONFIG_PATH, defaultToml, 'utf-8');
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    try {
      this.config = parseConfig(raw);
      const errors = validateConfig(this.config);
      if (errors.length > 0) console.warn('Config validation warnings:', errors);
    } catch (err) {
      console.error('Failed to parse config, using defaults:', err);
      this.config = getDefaultConfig();
    }
    return this.config;
  }

  watch(): void {
    if (this.watcher) return;
    this.watcher = fs.watch(CONFIG_PATH, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        try {
          const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
          const newConfig = parseConfig(raw);
          const errors = validateConfig(newConfig);
          if (errors.length === 0) {
            this.config = newConfig;
            this.onUpdateCallbacks.forEach(cb => cb(this.config));
          } else {
            console.warn('Config validation failed, keeping previous config:', errors);
          }
        } catch (err) {
          console.error('Config reload failed, keeping previous config:', err);
        }
      }
    });
  }

  onUpdate(callback: (config: AmadeusConfig) => void): void {
    this.onUpdateCallbacks.push(callback);
  }

  stopWatching(): void {
    this.watcher?.close();
    this.watcher = null;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx tsx --test tests/main/config-parser.test.ts
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add resources/default-config.toml src/main/config-parser.ts tests/main/ && git commit -m "feat: add config parser with TOML loading, validation, and hot-reload"
```

---

### Task 5: Shell Registry

**Files:**
- Create: `src/main/shell-registry.ts`
- Create: `tests/main/shell-registry.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/main/shell-registry.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectShells } from '../../src/main/shell-registry.js';

describe('detectShells', () => {
  it('returns an array', () => {
    const shells = detectShells();
    assert.ok(Array.isArray(shells));
  });

  it('each shell has required fields', () => {
    const shells = detectShells();
    for (const shell of shells) {
      assert.ok(shell.id, 'shell must have id');
      assert.ok(shell.name, 'shell must have name');
      assert.ok(shell.command, 'shell must have command');
    }
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

```bash
npx tsx --test tests/main/shell-registry.test.ts
```

- [ ] **Step 3: Write shell-registry.ts**

```typescript
// src/main/shell-registry.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ShellInfo, ShellConfig } from '../shared/types.js';

interface DetectedShell {
  id: string;
  name: string;
  command: string;
}

export function detectShells(): DetectedShell[] {
  const shells: DetectedShell[] = [];

  // PowerShell 7+ (pwsh)
  if (commandExists('pwsh.exe')) {
    shells.push({ id: 'powershell', name: 'PowerShell', command: 'pwsh.exe' });
  } else if (commandExists('powershell.exe')) {
    shells.push({ id: 'powershell', name: 'PowerShell (Legacy)', command: 'powershell.exe' });
  }

  // CMD
  shells.push({ id: 'cmd', name: 'Command Prompt', command: 'cmd.exe' });

  // Git Bash
  const gitBashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  ];
  for (const p of gitBashPaths) {
    if (fs.existsSync(p)) {
      shells.push({ id: 'gitbash', name: 'Git Bash', command: p });
      break;
    }
  }

  // WSL
  try {
    const output = execSync('wsl.exe --list --quiet', { encoding: 'utf-8', timeout: 5000 });
    const distros = output.split('\n').map(l => l.trim().replace(/\0/g, '')).filter(Boolean);
    for (const distro of distros) {
      shells.push({
        id: `wsl-${distro.toLowerCase()}`,
        name: `WSL: ${distro}`,
        command: 'wsl.exe',
      });
    }
  } catch {
    // WSL not installed
  }

  return shells;
}

export function buildShellConfigs(detected: DetectedShell[]): Record<string, ShellConfig> {
  const configs: Record<string, ShellConfig> = {};
  for (const shell of detected) {
    configs[shell.id] = {
      command: shell.command,
      args: shell.id.startsWith('wsl-') ? ['-d', shell.name.replace('WSL: ', '')] : [],
      profile: 'default',
      elevated: false,
      env: {},
    };
  }
  return configs;
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`where ${cmd}`, { encoding: 'utf-8', timeout: 3000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx tsx --test tests/main/shell-registry.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/main/shell-registry.ts tests/main/shell-registry.test.ts && git commit -m "feat: add shell registry with auto-detection of PowerShell, CMD, Git Bash, WSL"
```

---

### Task 6: PTY Manager

**Files:**
- Create: `src/main/pty-manager.ts`

- [ ] **Step 1: Write pty-manager.ts**

```typescript
// src/main/pty-manager.ts
import * as pty from 'node-pty';
import * as os from 'os';
import { ShellConfig } from '../shared/types.js';

interface ManagedPty {
  id: string;
  shellId: string;
  process: pty.IPty;
  elevated: boolean;
}

export class PtyManager {
  private ptys = new Map<string, ManagedPty>();
  private nextId = 1;
  private respawnCounts = new Map<string, { count: number; firstAttempt: number }>();

  onData: (terminalId: string, data: string) => void = () => {};
  onExit: (terminalId: string, exitCode: number) => void = () => {};
  onError: (terminalId: string, message: string) => void = () => {};

  create(shellId: string, shellConfig: ShellConfig, elevated: boolean): string | null {
    const terminalId = `term-${this.nextId++}`;

    if (elevated) {
      // Elevated terminals will be handled in a later task (Task 20)
      // For now, spawn normally with a warning
      console.warn(`Elevated terminals not yet implemented, spawning ${shellId} normally`);
    }

    try {
      const env = { ...process.env, ...shellConfig.env } as Record<string, string>;
      const proc = pty.spawn(shellConfig.command, shellConfig.args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: os.homedir(),
        env,
      });

      const managed: ManagedPty = { id: terminalId, shellId, process: proc, elevated };
      this.ptys.set(terminalId, managed);

      proc.onData((data) => this.onData(terminalId, data));
      proc.onExit(({ exitCode }) => {
        this.ptys.delete(terminalId);
        this.onExit(terminalId, exitCode);
      });

      return terminalId;
    } catch (err: any) {
      this.onError(terminalId, `Failed to spawn ${shellId}: ${err.message}`);
      return null;
    }
  }

  write(terminalId: string, data: string): void {
    this.ptys.get(terminalId)?.process.write(data);
  }

  resize(terminalId: string, cols: number, rows: number): void {
    const managed = this.ptys.get(terminalId);
    if (managed) {
      try { managed.process.resize(cols, rows); } catch {}
    }
  }

  close(terminalId: string): void {
    const managed = this.ptys.get(terminalId);
    if (managed) {
      managed.process.kill();
      this.ptys.delete(terminalId);
    }
  }

  getPid(terminalId: string): number | undefined {
    return this.ptys.get(terminalId)?.process.pid;
  }

  closeAll(): void {
    for (const [id] of this.ptys) {
      this.close(id);
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit -p tsconfig.main.json
```

- [ ] **Step 3: Commit**

```bash
git add src/main/pty-manager.ts && git commit -m "feat: add PTY manager for spawning and managing shell processes"
```

---

### Task 7: IPC Handlers and Preload

**Files:**
- Create: `src/main/ipc-handlers.ts`
- Create: `src/preload/preload.ts`

- [ ] **Step 1: Write ipc-handlers.ts**

```typescript
// src/main/ipc-handlers.ts
import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../shared/ipc-channels.js';
import { PtyManager } from './pty-manager.js';
import { ConfigManager } from './config-parser.js';
import { LayoutStore } from './layout-store.js';
import { ShellInfo } from '../shared/types.js';

export function registerIpcHandlers(
  ptyManager: PtyManager,
  configManager: ConfigManager,
  layoutStore: LayoutStore,
  getWindow: () => BrowserWindow | null,
): void {
  const send = (channel: string, data: any) => {
    getWindow()?.webContents.send(channel, data);
  };

  // PTY handlers
  ipcMain.on(IPC.PTY_CREATE, (_event, { shellId, elevated }: { shellId: string; elevated: boolean }) => {
    const config = configManager.current;
    const shellConfig = config.shells[shellId];
    if (!shellConfig) {
      send(IPC.ERROR, { source: 'pty', message: `Unknown shell: ${shellId}` });
      return;
    }
    const terminalId = ptyManager.create(shellId, shellConfig, elevated);
    if (terminalId) {
      send(IPC.PTY_CREATED, {
        terminalId, shellId, pid: ptyManager.getPid(terminalId),
      });
    }
  });

  ipcMain.on(IPC.PTY_WRITE, (_event, { terminalId, data }: { terminalId: string; data: string }) => {
    ptyManager.write(terminalId, data);
  });

  ipcMain.on(IPC.PTY_RESIZE, (_event, { terminalId, cols, rows }: { terminalId: string; cols: number; rows: number }) => {
    ptyManager.resize(terminalId, cols, rows);
  });

  ipcMain.on(IPC.PTY_CLOSE, (_event, { terminalId }: { terminalId: string }) => {
    ptyManager.close(terminalId);
  });

  // PTY callbacks → renderer
  ptyManager.onData = (terminalId, data) => send(IPC.PTY_DATA, { terminalId, data });
  ptyManager.onExit = (terminalId, exitCode) => send(IPC.PTY_EXITED, { terminalId, exitCode });
  ptyManager.onError = (terminalId, message) => send(IPC.ERROR, { source: 'pty', terminalId, message });

  // Config handlers
  ipcMain.on(IPC.CONFIG_GET, () => {
    send(IPC.CONFIG_CURRENT, { config: configManager.current });
  });

  configManager.onUpdate((config) => {
    send(IPC.CONFIG_UPDATED, { config });
  });

  // Layout handlers
  ipcMain.on(IPC.LAYOUT_SAVE, (_event, { name, terminals }) => {
    layoutStore.save(name, terminals);
  });

  ipcMain.on(IPC.LAYOUT_LOAD, (_event, { name }: { name: string }) => {
    const terminals = layoutStore.load(name);
    send(IPC.LAYOUT_DATA, { name, terminals });
  });

  // Shell list
  ipcMain.on(IPC.SHELL_LIST, () => {
    const config = configManager.current;
    const shells: ShellInfo[] = Object.entries(config.shells).map(([id, shell]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      command: shell.command,
      elevated: shell.elevated,
      profile: shell.profile,
    }));
    send(IPC.SHELL_AVAILABLE, { shells });
  });
}
```

- [ ] **Step 2: Write preload.ts**

```typescript
// src/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels.js';

contextBridge.exposeInMainWorld('amadeus', {
  terminal: {
    create: (shellId: string, elevated: boolean) =>
      ipcRenderer.send(IPC.PTY_CREATE, { shellId, elevated }),
    write: (terminalId: string, data: string) =>
      ipcRenderer.send(IPC.PTY_WRITE, { terminalId, data }),
    resize: (terminalId: string, cols: number, rows: number) =>
      ipcRenderer.send(IPC.PTY_RESIZE, { terminalId, cols, rows }),
    close: (terminalId: string) =>
      ipcRenderer.send(IPC.PTY_CLOSE, { terminalId }),
    onData: (callback: (terminalId: string, data: string) => void) =>
      ipcRenderer.on(IPC.PTY_DATA, (_e, { terminalId, data }) => callback(terminalId, data)),
    onCreated: (callback: (info: { terminalId: string; shellId: string; pid: number }) => void) =>
      ipcRenderer.on(IPC.PTY_CREATED, (_e, info) => callback(info)),
    onExited: (callback: (terminalId: string, exitCode: number) => void) =>
      ipcRenderer.on(IPC.PTY_EXITED, (_e, { terminalId, exitCode }) => callback(terminalId, exitCode)),
  },
  config: {
    get: () => ipcRenderer.send(IPC.CONFIG_GET),
    onUpdate: (callback: (config: any) => void) =>
      ipcRenderer.on(IPC.CONFIG_UPDATED, (_e, { config }) => callback(config)),
    onCurrent: (callback: (config: any) => void) =>
      ipcRenderer.on(IPC.CONFIG_CURRENT, (_e, { config }) => callback(config)),
  },
  layout: {
    save: (name: string, layout: any) =>
      ipcRenderer.send(IPC.LAYOUT_SAVE, { name, terminals: layout }),
    load: (name: string) =>
      ipcRenderer.send(IPC.LAYOUT_LOAD, { name }),
    onData: (callback: (name: string, terminals: any[]) => void) =>
      ipcRenderer.on(IPC.LAYOUT_DATA, (_e, { name, terminals }) => callback(name, terminals)),
  },
  shell: {
    list: () => ipcRenderer.send(IPC.SHELL_LIST),
    onAvailable: (callback: (shells: any[]) => void) =>
      ipcRenderer.on(IPC.SHELL_AVAILABLE, (_e, { shells }) => callback(shells)),
  },
  onError: (callback: (error: { source: string; terminalId?: string; message: string }) => void) =>
    ipcRenderer.on(IPC.ERROR, (_e, error) => callback(error)),
});
```

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload/preload.ts && git commit -m "feat: add IPC handlers and secure preload bridge"
```

---

### Task 8: Layout Store

**Files:**
- Create: `src/main/layout-store.ts`

- [ ] **Step 1: Write layout-store.ts**

```typescript
// src/main/layout-store.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LayoutTerminal } from '../shared/types.js';

const LAYOUTS_DIR = path.join(os.homedir(), '.amadeus', 'layouts');

export class LayoutStore {
  constructor() {
    if (!fs.existsSync(LAYOUTS_DIR)) {
      fs.mkdirSync(LAYOUTS_DIR, { recursive: true });
    }
  }

  save(name: string, terminals: LayoutTerminal[]): void {
    const filePath = path.join(LAYOUTS_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(terminals, null, 2), 'utf-8');
  }

  load(name: string): LayoutTerminal[] {
    const filePath = path.join(LAYOUTS_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return [];
    }
  }

  list(): string[] {
    return fs.readdirSync(LAYOUTS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/layout-store.ts && git commit -m "feat: add layout store for saving/loading terminal positions"
```

---

### Task 9: Main Process Entry Point

**Files:**
- Create: `src/main/index.ts`

- [ ] **Step 1: Write main/index.ts**

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { ConfigManager } from './config-parser.js';
import { PtyManager } from './pty-manager.js';
import { LayoutStore } from './layout-store.js';
import { registerIpcHandlers } from './ipc-handlers.js';

let mainWindow: BrowserWindow | null = null;
const configManager = new ConfigManager();
const ptyManager = new PtyManager();
const layoutStore = new LayoutStore();

function createWindow(): void {
  configManager.load();
  configManager.watch();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  registerIpcHandlers(ptyManager, configManager, layoutStore, () => mainWindow);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    ptyManager.closeAll();
    configManager.stopWatching();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});
```

- [ ] **Step 2: Verify the project compiles**

```bash
npx tsc -b
```

Expected: Compilation may have errors for renderer files not yet created — that's expected. Main process files should compile.

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts && git commit -m "feat: add Electron main process entry point"
```

---

### Task 10: Renderer Base (HTML + Entry + Styles)

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/index.ts`
- Create: `src/renderer/styles.css`

- [ ] **Step 1: Write index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' file:; font-src 'self'">
  <title>Amadeus</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="canvas"></div>
  <div id="shell-picker" class="hidden"></div>
  <script type="module" src="index.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write styles.css**

```css
/* src/renderer/styles.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --canvas-bg: #0a0a0f;
  --titlebar-height: 28px;
  --resize-handle: 6px;
}

html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  background: var(--canvas-bg);
  font-family: 'Segoe UI', sans-serif;
  color: #ccc;
  -webkit-app-region: no-drag;
}

#canvas {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Terminal container */
.terminal-widget {
  position: absolute;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #444;
  min-width: 200px;
  min-height: 100px;
}

.terminal-widget.focused {
  box-shadow: 0 0 0 2px rgba(124, 111, 224, 0.5);
}

/* Titlebar */
.terminal-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--titlebar-height);
  padding: 0 8px;
  font-size: 12px;
  cursor: grab;
  user-select: none;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.terminal-titlebar:active { cursor: grabbing; }

.titlebar-label { display: flex; align-items: center; gap: 6px; }
.titlebar-controls { display: flex; gap: 8px; }
.titlebar-btn {
  width: 12px; height: 12px; border-radius: 50%;
  border: none; cursor: pointer; opacity: 0.6;
}
.titlebar-btn:hover { opacity: 1; }
.titlebar-btn.close { background: #e05555; }
.titlebar-btn.minimize { background: #e0c855; }
.titlebar-btn.maximize { background: #55e07c; }

/* Terminal body */
.terminal-body {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Background layers */
.bg-layer {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-image {
  position: absolute;
  background-repeat: no-repeat;
  pointer-events: none;
}

.overlay-layer {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 1;
  background-repeat: no-repeat;
  background-size: cover;
}

.xterm-layer {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
}

/* Resize handles */
.resize-handle {
  position: absolute;
  z-index: 100;
}
.resize-handle.n { top: 0; left: var(--resize-handle); right: var(--resize-handle); height: var(--resize-handle); cursor: n-resize; }
.resize-handle.s { bottom: 0; left: var(--resize-handle); right: var(--resize-handle); height: var(--resize-handle); cursor: s-resize; }
.resize-handle.e { right: 0; top: var(--resize-handle); bottom: var(--resize-handle); width: var(--resize-handle); cursor: e-resize; }
.resize-handle.w { left: 0; top: var(--resize-handle); bottom: var(--resize-handle); width: var(--resize-handle); cursor: w-resize; }
.resize-handle.ne { top: 0; right: 0; width: var(--resize-handle); height: var(--resize-handle); cursor: ne-resize; }
.resize-handle.nw { top: 0; left: 0; width: var(--resize-handle); height: var(--resize-handle); cursor: nw-resize; }
.resize-handle.se { bottom: 0; right: 0; width: var(--resize-handle); height: var(--resize-handle); cursor: se-resize; }
.resize-handle.sw { bottom: 0; left: 0; width: var(--resize-handle); height: var(--resize-handle); cursor: sw-resize; }

/* Snap guides */
.snap-guide {
  position: absolute;
  background: rgba(124, 111, 224, 0.4);
  z-index: 9999;
  pointer-events: none;
}
.snap-guide.horizontal { height: 1px; left: 0; right: 0; }
.snap-guide.vertical { width: 1px; top: 0; bottom: 0; }

/* Shell picker */
#shell-picker {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: #1a1a2e;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 8px 0;
  min-width: 220px;
  z-index: 10000;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

#shell-picker.hidden { display: none; }

.shell-option {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.shell-option:hover { background: rgba(124, 111, 224, 0.2); }
.shell-option .shield { font-size: 11px; }
```

- [ ] **Step 3: Write renderer/index.ts (minimal bootstrap)**

```typescript
// src/renderer/index.ts

declare global {
  interface Window {
    amadeus: typeof import('../preload/preload.js') extends never ? any : any;
  }
}

import { CanvasManager } from './canvas/canvas-manager.js';
import { KeybindingManager } from './keybindings/keybinding-manager.js';
import { ShellPicker } from './ui/shell-picker.js';

const canvas = new CanvasManager(document.getElementById('canvas')!);
const keybindings = new KeybindingManager();
const shellPicker = new ShellPicker(document.getElementById('shell-picker')!);

// Request initial config
window.amadeus.config.get();
window.amadeus.config.onCurrent((config: any) => {
  canvas.applyConfig(config);
  keybindings.applyConfig(config.keybindings);
});

window.amadeus.config.onUpdate((config: any) => {
  canvas.applyConfig(config);
  keybindings.applyConfig(config.keybindings);
});

// PTY data → terminal
window.amadeus.terminal.onData((terminalId: string, data: string) => {
  canvas.writeToTerminal(terminalId, data);
});

window.amadeus.terminal.onCreated((info: { terminalId: string; shellId: string; pid: number }) => {
  canvas.attachPty(info.terminalId, info.shellId);
});

window.amadeus.terminal.onExited((terminalId: string, exitCode: number) => {
  canvas.handleTerminalExit(terminalId, exitCode);
});

window.amadeus.onError((error: any) => {
  console.error('Amadeus error:', error);
});

// Keybindings
keybindings.on('new_terminal', () => shellPicker.show());
keybindings.on('close_terminal', () => canvas.closeActiveTerminal());
keybindings.on('next_terminal', () => canvas.focusNext());
keybindings.on('prev_terminal', () => canvas.focusPrev());
keybindings.on('save_layout', () => canvas.saveLayout());
keybindings.on('load_layout', () => canvas.loadLayout());
keybindings.on('fullscreen', () => document.documentElement.requestFullscreen());
keybindings.on('reload_config', () => window.amadeus.config.get());

// Shell picker selection
shellPicker.onSelect((shellId: string, elevated: boolean) => {
  window.amadeus.terminal.create(shellId, elevated);
});

// Request shell list
window.amadeus.shell.list();
window.amadeus.shell.onAvailable((shells: any[]) => {
  shellPicker.setShells(shells);
});
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/ && git commit -m "feat: add renderer base HTML, CSS, and entry point"
```

---

### Task 11: Terminal Instance (xterm.js wrapper)

**Files:**
- Create: `src/renderer/terminal/terminal-instance.ts`

- [ ] **Step 1: Write terminal-instance.ts**

```typescript
// src/renderer/terminal/terminal-instance.ts
import { Terminal } from 'xterm';
import { WebglAddon } from '@xterm/addon-webgl';
import { FitAddon } from '@xterm/addon-fit';

let webglContextCount = 0;
const MAX_WEBGL_CONTEXTS = 16;

export class TerminalInstance {
  readonly terminal: Terminal;
  private fitAddon: FitAddon;
  private webglAddon: WebglAddon | null = null;
  private terminalId: string | null = null;

  constructor(container: HTMLElement) {
    this.terminal = new Terminal({
      allowTransparency: true,
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Cascadia Code, monospace',
      theme: { background: 'transparent' },
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(container);

    // Try WebGL, fall back to canvas
    if (webglContextCount < MAX_WEBGL_CONTEXTS) {
      try {
        this.webglAddon = new WebglAddon();
        this.terminal.loadAddon(this.webglAddon);
        webglContextCount++;
        this.webglAddon.onContextLoss(() => {
          this.webglAddon?.dispose();
          this.webglAddon = null;
          webglContextCount--;
        });
      } catch {
        // Canvas renderer fallback — no action needed
      }
    }

    this.fit();
  }

  attachPty(terminalId: string): void {
    this.terminalId = terminalId;
    this.terminal.onData((data) => {
      if (this.terminalId) {
        window.amadeus.terminal.write(this.terminalId, data);
      }
    });
    this.terminal.onResize(({ cols, rows }) => {
      if (this.terminalId) {
        window.amadeus.terminal.resize(this.terminalId, cols, rows);
      }
    });
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  fit(): void {
    try { this.fitAddon.fit(); } catch {}
  }

  applyProfile(profile: any): void {
    this.terminal.options.fontSize = profile.font_size || 14;
    this.terminal.options.fontFamily = profile.font || 'Cascadia Code, monospace';
    this.terminal.options.cursorStyle = profile.cursor_style || 'block';
    this.terminal.options.cursorBlink = true;
    if (profile.ligatures !== undefined) {
      this.terminal.options.fontFamily = profile.ligatures
        ? `${profile.font}, monospace`
        : `${profile.font}, monospace`;
    }
    this.terminal.options.theme = {
      background: 'transparent',
      foreground: profile.text_color || '#c8c8d8',
      cursor: profile.cursor_color || '#ffffff',
    };
    this.fit();
  }

  focus(): void { this.terminal.focus(); }
  blur(): void { this.terminal.blur(); }

  dispose(): void {
    if (this.webglAddon) {
      this.webglAddon.dispose();
      webglContextCount--;
    }
    this.terminal.dispose();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/terminal/terminal-instance.ts && git commit -m "feat: add xterm.js terminal instance with WebGL/canvas fallback"
```

---

### Task 12: Terminal Container and Titlebar

**Files:**
- Create: `src/renderer/terminal/terminal-titlebar.ts`
- Create: `src/renderer/terminal/terminal-container.ts`

- [ ] **Step 1: Write terminal-titlebar.ts**

```typescript
// src/renderer/terminal/terminal-titlebar.ts

export class TerminalTitlebar {
  readonly element: HTMLElement;
  private labelEl: HTMLElement;

  onClose: () => void = () => {};
  onMinimize: () => void = () => {};

  constructor(shellName: string, profileName: string, elevated: boolean) {
    this.element = document.createElement('div');
    this.element.className = 'terminal-titlebar';

    this.labelEl = document.createElement('div');
    this.labelEl.className = 'titlebar-label';
    this.labelEl.innerHTML = `
      <span>⬡ ${shellName}</span>
      ${elevated ? '<span class="shield">🛡</span>' : ''}
      <span style="font-size:10px;opacity:0.5">${profileName}</span>
    `;

    const controls = document.createElement('div');
    controls.className = 'titlebar-controls';

    const minBtn = document.createElement('button');
    minBtn.className = 'titlebar-btn minimize';
    minBtn.onclick = (e) => { e.stopPropagation(); this.onMinimize(); };

    const closeBtn = document.createElement('button');
    closeBtn.className = 'titlebar-btn close';
    closeBtn.onclick = (e) => { e.stopPropagation(); this.onClose(); };

    controls.appendChild(minBtn);
    controls.appendChild(closeBtn);

    this.element.appendChild(this.labelEl);
    this.element.appendChild(controls);
  }

  setColor(color: string): void {
    this.element.style.backgroundColor = color;
    this.element.style.borderBottom = `1px solid ${color}`;
  }
}
```

- [ ] **Step 2: Write terminal-container.ts**

```typescript
// src/renderer/terminal/terminal-container.ts
import { TerminalInstance } from './terminal-instance.js';
import { TerminalTitlebar } from './terminal-titlebar.js';
import { BackgroundLayer } from '../theme/background-layer.js';
import { OverlayLayer } from '../theme/overlay-layer.js';
import { ImageDragger } from '../theme/image-dragger.js';
import { ProfileConfig } from '../../shared/types.js';

export class TerminalContainer {
  readonly element: HTMLElement;
  readonly titlebar: TerminalTitlebar;
  readonly instance: TerminalInstance;
  private bgLayer: BackgroundLayer;
  private overlayLayer: OverlayLayer;
  private imageDragger: ImageDragger;
  private bodyEl: HTMLElement;

  shellId: string = '';
  terminalId: string | null = null;
  elevated: boolean = false;

  // Background image offsets for layout persistence
  bgOffsetX = 0;
  bgOffsetY = 0;
  bgScale = 1.0;

  onClose: () => void = () => {};

  constructor(shellId: string, shellName: string, profileName: string, elevated: boolean) {
    this.shellId = shellId;
    this.elevated = elevated;

    this.element = document.createElement('div');
    this.element.className = 'terminal-widget';

    // Resize handles
    const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    for (const dir of handles) {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${dir}`;
      handle.dataset.direction = dir;
      this.element.appendChild(handle);
    }

    // Titlebar
    this.titlebar = new TerminalTitlebar(shellName, profileName, elevated);
    this.titlebar.onClose = () => this.onClose();
    this.element.appendChild(this.titlebar.element);

    // Body
    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'terminal-body';

    // Background layer
    this.bgLayer = new BackgroundLayer();
    this.bodyEl.appendChild(this.bgLayer.element);

    // Overlay layer
    this.overlayLayer = new OverlayLayer();
    this.bodyEl.appendChild(this.overlayLayer.element);

    // xterm container
    const xtermEl = document.createElement('div');
    xtermEl.className = 'xterm-layer';
    this.bodyEl.appendChild(xtermEl);

    this.element.appendChild(this.bodyEl);

    // Terminal instance
    this.instance = new TerminalInstance(xtermEl);

    // Image dragger
    this.imageDragger = new ImageDragger(this.bodyEl, this.bgLayer);
    this.imageDragger.onOffsetChange = (x, y, scale) => {
      this.bgOffsetX = x;
      this.bgOffsetY = y;
      this.bgScale = scale;
    };
  }

  applyProfile(profile: ProfileConfig): void {
    // Borders and container
    this.element.style.borderColor = profile.border_color;
    this.element.style.borderWidth = `${profile.border_width}px`;
    this.element.style.borderRadius = `${profile.border_radius}px`;
    this.element.style.opacity = String(profile.opacity);
    if (profile.blur > 0) {
      this.element.style.backdropFilter = `blur(${profile.blur}px)`;
    }
    if (profile.box_shadow) this.element.style.boxShadow = profile.box_shadow;

    // Titlebar
    this.titlebar.setColor(profile.titlebar_color);

    // Background
    this.bgLayer.apply(profile.background);

    // Overlay
    this.overlayLayer.apply(profile.overlay);

    // Text glow
    if (profile.text_glow) {
      this.bodyEl.style.textShadow = profile.text_glow;
    }

    // Custom CSS (scoped)
    if (profile.custom_css) {
      const style = document.createElement('style');
      style.textContent = profile.custom_css;
      this.element.appendChild(style);
    }

    // Terminal options
    this.instance.applyProfile(profile);

    // Image dragger
    this.imageDragger.setEnabled(profile.background.image_draggable);
  }

  setPosition(x: number, y: number, width: number, height: number): void {
    this.element.style.left = `${x}%`;
    this.element.style.top = `${y}%`;
    this.element.style.width = `${width}%`;
    this.element.style.height = `${height}%`;
  }

  getPosition(): { x: number; y: number; width: number; height: number } {
    const canvas = this.element.parentElement!;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    return {
      x: (this.element.offsetLeft / cw) * 100,
      y: (this.element.offsetTop / ch) * 100,
      width: (this.element.offsetWidth / cw) * 100,
      height: (this.element.offsetHeight / ch) * 100,
    };
  }

  focus(): void {
    this.element.classList.add('focused');
    this.instance.focus();
  }

  blur(): void {
    this.element.classList.remove('focused');
    this.instance.blur();
  }

  fit(): void {
    this.instance.fit();
  }

  dispose(): void {
    this.instance.dispose();
    this.imageDragger.dispose();
    this.element.remove();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/terminal/ && git commit -m "feat: add terminal container with titlebar, background, and overlay layers"
```

---

### Task 13: Theme Layers (Background, Overlay, Image Dragger)

**Files:**
- Create: `src/renderer/theme/background-layer.ts`
- Create: `src/renderer/theme/overlay-layer.ts`
- Create: `src/renderer/theme/image-dragger.ts`
- Create: `src/renderer/theme/theme-engine.ts`

- [ ] **Step 1: Write background-layer.ts**

```typescript
// src/renderer/theme/background-layer.ts
import { BackgroundConfig } from '../../shared/types.js';

export class BackgroundLayer {
  readonly element: HTMLElement;
  private imageEl: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'bg-layer';

    this.imageEl = document.createElement('div');
    this.imageEl.className = 'bg-image';
    this.element.appendChild(this.imageEl);
  }

  apply(config: BackgroundConfig): void {
    this.element.style.backgroundColor = config.color || 'transparent';

    if (config.image) {
      this.imageEl.style.backgroundImage = `url("${config.image}")`;
      this.imageEl.style.opacity = String(config.image_opacity ?? 0.2);
      this.imageEl.style.backgroundSize = config.image_size || 'contain';
      this.imageEl.style.backgroundPosition = config.image_position || 'center center';
      this.imageEl.style.inset = '0';
      if (config.image_blur > 0) {
        this.imageEl.style.filter = `blur(${config.image_blur}px)`;
      }
    } else {
      this.imageEl.style.backgroundImage = '';
    }
  }

  setOffset(x: number, y: number, scale: number): void {
    this.imageEl.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  get imageElement(): HTMLElement { return this.imageEl; }
}
```

- [ ] **Step 2: Write overlay-layer.ts**

```typescript
// src/renderer/theme/overlay-layer.ts
import { OverlayConfig } from '../../shared/types.js';

export class OverlayLayer {
  readonly element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'overlay-layer';
  }

  apply(config: OverlayConfig): void {
    if (config.image) {
      this.element.style.backgroundImage = `url("${config.image}")`;
      this.element.style.opacity = String(config.opacity ?? 0.05);
    } else {
      this.element.style.backgroundImage = '';
    }
  }
}
```

- [ ] **Step 3: Write image-dragger.ts**

```typescript
// src/renderer/theme/image-dragger.ts
import { BackgroundLayer } from './background-layer.js';

export class ImageDragger {
  private enabled = false;
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private offsetX = 0;
  private offsetY = 0;
  private scale = 1.0;
  private container: HTMLElement;
  private bgLayer: BackgroundLayer;

  onOffsetChange: (x: number, y: number, scale: number) => void = () => {};

  private onMouseDown = (e: MouseEvent) => {
    if (!this.enabled || !e.altKey) return;
    e.preventDefault();
    this.dragging = true;
    this.startX = e.clientX - this.offsetX;
    this.startY = e.clientY - this.offsetY;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.dragging) return;
    this.offsetX = e.clientX - this.startX;
    this.offsetY = e.clientY - this.startY;
    this.bgLayer.setOffset(this.offsetX, this.offsetY, this.scale);
    this.onOffsetChange(this.offsetX, this.offsetY, this.scale);
  };

  private onMouseUp = () => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled || !e.altKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    this.scale = Math.max(0.1, Math.min(3.0, this.scale + delta));
    this.bgLayer.setOffset(this.offsetX, this.offsetY, this.scale);
    this.onOffsetChange(this.offsetX, this.offsetY, this.scale);
  };

  constructor(container: HTMLElement, bgLayer: BackgroundLayer) {
    this.container = container;
    this.bgLayer = bgLayer;
    this.container.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('wheel', this.onWheel, { passive: false });
  }

  setEnabled(enabled: boolean): void { this.enabled = enabled; }

  setOffset(x: number, y: number, scale: number): void {
    this.offsetX = x;
    this.offsetY = y;
    this.scale = scale;
    this.bgLayer.setOffset(x, y, scale);
  }

  dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('wheel', this.onWheel);
  }
}
```

- [ ] **Step 4: Write theme-engine.ts**

```typescript
// src/renderer/theme/theme-engine.ts
import { AmadeusConfig, ProfileConfig } from '../../shared/types.js';
import { TerminalContainer } from '../terminal/terminal-container.js';

export class ThemeEngine {
  private config: AmadeusConfig | null = null;

  applyConfig(config: AmadeusConfig): void {
    this.config = config;
  }

  getProfile(profileName: string): ProfileConfig | null {
    return this.config?.profiles[profileName] || null;
  }

  applyToContainer(container: TerminalContainer, shellId: string): void {
    if (!this.config) return;
    const shell = this.config.shells[shellId];
    const profileName = shell?.profile || this.config.general.default_profile;
    const profile = this.config.profiles[profileName];
    if (profile) container.applyProfile(profile);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/theme/ && git commit -m "feat: add theme engine with background, overlay, and image dragger"
```

---

### Task 14: Snap Engine

**Files:**
- Create: `src/renderer/canvas/snap-engine.ts`
- Create: `tests/renderer/snap-engine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/renderer/snap-engine.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calcSnap, SnapResult } from '../../src/renderer/canvas/snap-engine.js';

describe('calcSnap', () => {
  const canvasW = 1000, canvasH = 800;
  const threshold = 15;

  it('snaps to left edge of canvas', () => {
    const result = calcSnap(
      { x: 10, y: 100, w: 200, h: 150 },
      [], canvasW, canvasH, threshold
    );
    assert.strictEqual(result.x, 0);
  });

  it('snaps to right edge of canvas', () => {
    const result = calcSnap(
      { x: 790, y: 100, w: 200, h: 150 },
      [], canvasW, canvasH, threshold
    );
    assert.strictEqual(result.x, 800);
  });

  it('snaps to adjacent terminal edge', () => {
    const others = [{ x: 0, y: 0, w: 500, h: 800 }];
    const result = calcSnap(
      { x: 508, y: 0, w: 200, h: 150 },
      others, canvasW, canvasH, threshold
    );
    assert.strictEqual(result.x, 500);
  });

  it('does not snap when beyond threshold', () => {
    const result = calcSnap(
      { x: 100, y: 100, w: 200, h: 150 },
      [], canvasW, canvasH, threshold
    );
    assert.strictEqual(result.x, 100);
    assert.strictEqual(result.y, 100);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

```bash
npx tsx --test tests/renderer/snap-engine.test.ts
```

- [ ] **Step 3: Write snap-engine.ts**

```typescript
// src/renderer/canvas/snap-engine.ts

export interface Rect {
  x: number; y: number; w: number; h: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: Array<{ type: 'horizontal' | 'vertical'; position: number }>;
}

export function calcSnap(
  rect: Rect,
  others: Rect[],
  canvasW: number,
  canvasH: number,
  threshold: number,
): SnapResult {
  let { x, y } = rect;
  const guides: SnapResult['guides'] = [];

  // Snap to canvas edges
  // Left
  if (Math.abs(x) < threshold) { x = 0; guides.push({ type: 'vertical', position: 0 }); }
  // Top
  if (Math.abs(y) < threshold) { y = 0; guides.push({ type: 'horizontal', position: 0 }); }
  // Right
  if (Math.abs(x + rect.w - canvasW) < threshold) {
    x = canvasW - rect.w;
    guides.push({ type: 'vertical', position: canvasW });
  }
  // Bottom
  if (Math.abs(y + rect.h - canvasH) < threshold) {
    y = canvasH - rect.h;
    guides.push({ type: 'horizontal', position: canvasH });
  }

  // Snap to other terminals
  for (const other of others) {
    // Snap left edge to right edge of other
    if (Math.abs(x - (other.x + other.w)) < threshold) {
      x = other.x + other.w;
      guides.push({ type: 'vertical', position: x });
    }
    // Snap right edge to left edge of other
    if (Math.abs((x + rect.w) - other.x) < threshold) {
      x = other.x - rect.w;
      guides.push({ type: 'vertical', position: other.x });
    }
    // Snap top edge to bottom edge of other
    if (Math.abs(y - (other.y + other.h)) < threshold) {
      y = other.y + other.h;
      guides.push({ type: 'horizontal', position: y });
    }
    // Snap bottom edge to top edge of other
    if (Math.abs((y + rect.h) - other.y) < threshold) {
      y = other.y - rect.h;
      guides.push({ type: 'horizontal', position: other.y });
    }
    // Snap left to left
    if (Math.abs(x - other.x) < threshold) {
      x = other.x;
      guides.push({ type: 'vertical', position: x });
    }
    // Snap top to top
    if (Math.abs(y - other.y) < threshold) {
      y = other.y;
      guides.push({ type: 'horizontal', position: y });
    }
  }

  return { x, y, guides };
}

export class SnapEngine {
  enabled = true;
  threshold = 15;
  snapToGrid = false;
  gridSize = 20;

  snap(rect: Rect, others: Rect[], canvasW: number, canvasH: number, shiftHeld: boolean): SnapResult {
    if (!this.enabled || shiftHeld) {
      return { x: rect.x, y: rect.y, guides: [] };
    }

    if (this.snapToGrid) {
      return {
        x: Math.round(rect.x / this.gridSize) * this.gridSize,
        y: Math.round(rect.y / this.gridSize) * this.gridSize,
        guides: [],
      };
    }

    return calcSnap(rect, others, canvasW, canvasH, this.threshold);
  }

  applyConfig(config: { snap_enabled: boolean; snap_threshold: number; snap_to_grid: boolean; grid_size: number }): void {
    this.enabled = config.snap_enabled;
    this.threshold = config.snap_threshold;
    this.snapToGrid = config.snap_to_grid;
    this.gridSize = config.grid_size;
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx tsx --test tests/renderer/snap-engine.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/canvas/snap-engine.ts tests/renderer/ && git commit -m "feat: add snap engine with canvas edge and terminal-to-terminal snapping"
```

---

### Task 15: Canvas Manager, Drag Engine, Resize Engine, Z-Manager

**Files:**
- Create: `src/renderer/canvas/canvas-manager.ts`
- Create: `src/renderer/canvas/drag-engine.ts`
- Create: `src/renderer/canvas/resize-engine.ts`
- Create: `src/renderer/canvas/z-manager.ts`

- [ ] **Step 1: Write z-manager.ts**

```typescript
// src/renderer/canvas/z-manager.ts

export class ZManager {
  private maxZ = 0;

  bringToFront(el: HTMLElement): void {
    this.maxZ++;
    el.style.zIndex = String(this.maxZ);
  }

  sendToBack(el: HTMLElement): void {
    el.style.zIndex = '0';
  }

  getZ(el: HTMLElement): number {
    return parseInt(el.style.zIndex || '0', 10);
  }
}
```

- [ ] **Step 2: Write drag-engine.ts**

```typescript
// src/renderer/canvas/drag-engine.ts
import { SnapEngine, Rect } from './snap-engine.js';

export class DragEngine {
  private dragging = false;
  private target: HTMLElement | null = null;
  private startX = 0;
  private startY = 0;
  private elStartX = 0;
  private elStartY = 0;
  private snapEngine: SnapEngine;
  private getOtherRects: (exclude: HTMLElement) => Rect[] = () => [];

  onDragEnd: () => void = () => {};

  constructor(snapEngine: SnapEngine) {
    this.snapEngine = snapEngine;
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  setRectProvider(fn: (exclude: HTMLElement) => Rect[]): void {
    this.getOtherRects = fn;
  }

  startDrag(el: HTMLElement, e: MouseEvent): void {
    this.dragging = true;
    this.target = el;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.elStartX = el.offsetLeft;
    this.elStartY = el.offsetTop;
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.dragging || !this.target) return;
    const canvas = this.target.parentElement!;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    let newX = this.elStartX + dx;
    let newY = this.elStartY + dy;

    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(newX, canvas.clientWidth - this.target.offsetWidth));
    newY = Math.max(0, Math.min(newY, canvas.clientHeight - this.target.offsetHeight));

    const rect: Rect = { x: newX, y: newY, w: this.target.offsetWidth, h: this.target.offsetHeight };
    const others = this.getOtherRects(this.target);
    const snapped = this.snapEngine.snap(rect, others, canvas.clientWidth, canvas.clientHeight, e.shiftKey);

    this.target.style.left = `${snapped.x}px`;
    this.target.style.top = `${snapped.y}px`;
  };

  private onMouseUp = () => {
    if (this.dragging) {
      this.dragging = false;
      this.target = null;
      this.onDragEnd();
    }
  };

  dispose(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}
```

- [ ] **Step 3: Write resize-engine.ts**

```typescript
// src/renderer/canvas/resize-engine.ts
import { SnapEngine, Rect } from './snap-engine.js';

const MIN_W = 200;
const MIN_H = 100;

export class ResizeEngine {
  private resizing = false;
  private target: HTMLElement | null = null;
  private direction = '';
  private startX = 0;
  private startY = 0;
  private startRect = { left: 0, top: 0, width: 0, height: 0 };

  onResizeEnd: () => void = () => {};

  constructor() {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  startResize(el: HTMLElement, direction: string, e: MouseEvent): void {
    this.resizing = true;
    this.target = el;
    this.direction = direction;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startRect = {
      left: el.offsetLeft, top: el.offsetTop,
      width: el.offsetWidth, height: el.offsetHeight,
    };
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this.resizing || !this.target) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const d = this.direction;
    let { left, top, width, height } = this.startRect;

    if (d.includes('e')) width = Math.max(MIN_W, width + dx);
    if (d.includes('w')) { width = Math.max(MIN_W, width - dx); left = this.startRect.left + this.startRect.width - width; }
    if (d.includes('s')) height = Math.max(MIN_H, height + dy);
    if (d.includes('n')) { height = Math.max(MIN_H, height - dy); top = this.startRect.top + this.startRect.height - height; }

    this.target.style.left = `${left}px`;
    this.target.style.top = `${top}px`;
    this.target.style.width = `${width}px`;
    this.target.style.height = `${height}px`;
  };

  private onMouseUp = () => {
    if (this.resizing) {
      this.resizing = false;
      this.target = null;
      this.onResizeEnd();
    }
  };

  dispose(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}
```

- [ ] **Step 4: Write canvas-manager.ts**

```typescript
// src/renderer/canvas/canvas-manager.ts
import { TerminalContainer } from '../terminal/terminal-container.js';
import { ThemeEngine } from '../theme/theme-engine.js';
import { DragEngine } from './drag-engine.js';
import { ResizeEngine } from './resize-engine.js';
import { SnapEngine, Rect } from './snap-engine.js';
import { ZManager } from './z-manager.js';
import { AmadeusConfig, LayoutTerminal } from '../../shared/types.js';

export class CanvasManager {
  private canvas: HTMLElement;
  private terminals = new Map<string, TerminalContainer>();
  private activeTerminalId: string | null = null;
  private themeEngine = new ThemeEngine();
  private snapEngine = new SnapEngine();
  private dragEngine: DragEngine;
  private resizeEngine: ResizeEngine;
  private zManager = new ZManager();
  private config: AmadeusConfig | null = null;

  // Pending terminals waiting for PTY creation (keyed by unique pendingId)
  private pendingContainers: Array<{ pendingId: number; shellId: string; container: TerminalContainer; layoutData?: LayoutTerminal }> = [];
  private nextPendingId = 1;

  constructor(canvasEl: HTMLElement) {
    this.canvas = canvasEl;
    this.dragEngine = new DragEngine(this.snapEngine);
    this.resizeEngine = new ResizeEngine();

    this.dragEngine.setRectProvider((exclude) => this.getOtherRects(exclude));
    this.dragEngine.onDragEnd = () => this.fitAll();
    this.resizeEngine.onResizeEnd = () => this.fitAll();

    // Observe canvas resize to re-fit terminals
    new ResizeObserver(() => this.fitAll()).observe(this.canvas);
  }

  applyConfig(config: AmadeusConfig): void {
    this.config = config;
    this.themeEngine.applyConfig(config);
    this.snapEngine.applyConfig(config.canvas);

    // Re-apply themes to existing terminals
    for (const [, container] of this.terminals) {
      this.themeEngine.applyToContainer(container, container.shellId);
    }

    // Load start layout on first config
    if (config.general.start_layout && this.terminals.size === 0) {
      window.amadeus.layout.load(config.general.start_layout);
    }
  }

  createTerminal(shellId: string, elevated: boolean): void {
    if (!this.config) return;
    const shell = this.config.shells[shellId];
    if (!shell) return;

    const profileName = shell.profile || this.config.general.default_profile;
    const container = new TerminalContainer(shellId, shellId, profileName, elevated);
    container.setPosition(30, 30, 40, 40);
    this.canvas.appendChild(container.element);

    // Setup drag on titlebar
    container.titlebar.element.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.titlebar-btn')) return;
      this.dragEngine.startDrag(container.element, e);
    });

    // Setup resize on handles
    container.element.querySelectorAll('.resize-handle').forEach((handle) => {
      (handle as HTMLElement).addEventListener('mousedown', (e: MouseEvent) => {
        this.resizeEngine.startResize(container.element, (handle as HTMLElement).dataset.direction!, e);
        e.stopPropagation();
      });
    });

    // Z-index on click
    container.element.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.ctrlKey) {
        this.zManager.sendToBack(container.element);
      } else {
        this.zManager.bringToFront(container.element);
      }
      this.setActive(container);
    });

    // Close
    container.onClose = () => this.removeTerminal(container);

    // Apply theme
    this.themeEngine.applyToContainer(container, shellId);

    // Store as pending until PTY is created
    this.pendingContainers.push({ pendingId: this.nextPendingId++, shellId, container });

    // Request PTY
    window.amadeus.terminal.create(shellId, elevated);
  }

  createTerminalFromLayout(lt: LayoutTerminal): void {
    if (!this.config) return;
    const shell = this.config.shells[lt.shell];
    if (!shell) return;

    const profileName = shell.profile || this.config.general.default_profile;
    const container = new TerminalContainer(lt.shell, lt.shell, profileName, shell.elevated);
    container.setPosition(lt.x, lt.y, lt.width, lt.height);
    container.bgOffsetX = lt.bg_offset_x || 0;
    container.bgOffsetY = lt.bg_offset_y || 0;
    container.bgScale = lt.bg_scale || 1.0;
    this.canvas.appendChild(container.element);

    // Same drag/resize/z-index/close setup as createTerminal (extract shared method in implementation)
    container.titlebar.element.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.titlebar-btn')) return;
      this.dragEngine.startDrag(container.element, e);
    });
    container.element.querySelectorAll('.resize-handle').forEach((handle) => {
      (handle as HTMLElement).addEventListener('mousedown', (e: MouseEvent) => {
        this.resizeEngine.startResize(container.element, (handle as HTMLElement).dataset.direction!, e);
        e.stopPropagation();
      });
    });
    container.element.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.ctrlKey) this.zManager.sendToBack(container.element);
      else this.zManager.bringToFront(container.element);
      this.setActive(container);
    });
    container.onClose = () => this.removeTerminal(container);
    this.themeEngine.applyToContainer(container, lt.shell);

    // Store as pending with layout data
    this.pendingContainers.push({ pendingId: this.nextPendingId++, shellId: lt.shell, container, layoutData: lt });
    window.amadeus.terminal.create(lt.shell, shell.elevated);
  }

  attachPty(terminalId: string, shellId: string): void {
    // Find the first pending container matching this shellId (FIFO order)
    const idx = this.pendingContainers.findIndex(p => p.shellId === shellId);
    if (idx === -1) return;
    const { container, layoutData } = this.pendingContainers[idx];
    this.pendingContainers.splice(idx, 1);

    container.terminalId = terminalId;
    container.instance.attachPty(terminalId);
    this.terminals.set(terminalId, container);

    // Apply layout data if restoring from a saved layout
    if (layoutData) {
      container.element.style.zIndex = String(layoutData.z || 0);
      if (layoutData.bg_offset_x || layoutData.bg_offset_y || layoutData.bg_scale !== 1.0) {
        // Restore background image position
        container.bgOffsetX = layoutData.bg_offset_x || 0;
        container.bgOffsetY = layoutData.bg_offset_y || 0;
        container.bgScale = layoutData.bg_scale || 1.0;
      }
    }

    this.setActive(container);
    container.fit();
  }

  writeToTerminal(terminalId: string, data: string): void {
    this.terminals.get(terminalId)?.instance.write(data);
  }

  handleTerminalExit(terminalId: string, _exitCode: number): void {
    const container = this.terminals.get(terminalId);
    if (container) this.removeTerminal(container);
  }

  private removeTerminal(container: TerminalContainer): void {
    if (container.terminalId) {
      window.amadeus.terminal.close(container.terminalId);
      this.terminals.delete(container.terminalId);
    }
    container.dispose();
    if (this.activeTerminalId === container.terminalId) {
      this.activeTerminalId = null;
      const first = this.terminals.values().next().value;
      if (first) this.setActive(first);
    }
  }

  closeActiveTerminal(): void {
    if (!this.activeTerminalId) return;
    const container = this.terminals.get(this.activeTerminalId);
    if (container) this.removeTerminal(container);
  }

  focusNext(): void {
    const ids = [...this.terminals.keys()];
    if (ids.length === 0) return;
    const idx = this.activeTerminalId ? ids.indexOf(this.activeTerminalId) : -1;
    const next = ids[(idx + 1) % ids.length];
    const container = this.terminals.get(next);
    if (container) this.setActive(container);
  }

  focusPrev(): void {
    const ids = [...this.terminals.keys()];
    if (ids.length === 0) return;
    const idx = this.activeTerminalId ? ids.indexOf(this.activeTerminalId) : 1;
    const prev = ids[(idx - 1 + ids.length) % ids.length];
    const container = this.terminals.get(prev);
    if (container) this.setActive(container);
  }

  private setActive(container: TerminalContainer): void {
    // Blur previous
    if (this.activeTerminalId) {
      this.terminals.get(this.activeTerminalId)?.blur();
    }
    this.activeTerminalId = container.terminalId;
    container.focus();
    this.zManager.bringToFront(container.element);
  }

  saveLayout(): void {
    const name = prompt('Layout name:');
    if (!name) return;
    const terminals: LayoutTerminal[] = [];
    for (const [, container] of this.terminals) {
      const pos = container.getPosition();
      terminals.push({
        shell: container.shellId,
        x: Math.round(pos.x), y: Math.round(pos.y),
        width: Math.round(pos.width), height: Math.round(pos.height),
        z: this.zManager.getZ(container.element),
        bg_offset_x: container.bgOffsetX,
        bg_offset_y: container.bgOffsetY,
        bg_scale: container.bgScale,
      });
    }
    window.amadeus.layout.save(name, terminals);
  }

  loadLayout(): void {
    const name = prompt('Layout name to load:');
    if (!name) return;
    window.amadeus.layout.load(name);
  }

  // Call once during init to register the layout data listener
  initLayoutListener(): void {
    window.amadeus.layout.onData((layoutName: string, terminals: LayoutTerminal[]) => {
      // Clear existing terminals
      for (const [, container] of this.terminals) {
        container.dispose();
      }
      this.terminals.clear();
      // Create terminals from layout data with saved positions
      for (const lt of terminals) {
        this.createTerminalFromLayout(lt);
      }
    });
  }

  private getOtherRects(exclude: HTMLElement): Rect[] {
    const rects: Rect[] = [];
    for (const [, container] of this.terminals) {
      if (container.element !== exclude) {
        rects.push({
          x: container.element.offsetLeft,
          y: container.element.offsetTop,
          w: container.element.offsetWidth,
          h: container.element.offsetHeight,
        });
      }
    }
    return rects;
  }

  private fitAll(): void {
    for (const [, container] of this.terminals) {
      container.fit();
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/canvas/ && git commit -m "feat: add canvas manager with drag, resize, snap, and z-index management"
```

---

### Task 16: Keybinding Manager

**Files:**
- Create: `src/renderer/keybindings/keybinding-manager.ts`

- [ ] **Step 1: Write keybinding-manager.ts**

```typescript
// src/renderer/keybindings/keybinding-manager.ts
import { KeybindingConfig } from '../../shared/types.js';

type KeyAction = keyof KeybindingConfig;

export class KeybindingManager {
  private bindings = new Map<string, KeyAction>();
  private handlers = new Map<KeyAction, () => void>();

  constructor() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  applyConfig(config: KeybindingConfig): void {
    this.bindings.clear();
    for (const [action, shortcut] of Object.entries(config)) {
      this.bindings.set(this.normalizeShortcut(shortcut), action as KeyAction);
    }
  }

  on(action: KeyAction | string, handler: () => void): void {
    this.handlers.set(action as KeyAction, handler);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const combo = this.eventToCombo(e);
    const action = this.bindings.get(combo);
    if (action) {
      e.preventDefault();
      this.handlers.get(action)?.();
    }
  };

  private normalizeShortcut(shortcut: string): string {
    return shortcut.toLowerCase().split('+').sort().join('+');
  }

  private eventToCombo(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    const key = e.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      parts.push(key === ' ' ? 'space' : key);
    }
    return parts.sort().join('+');
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/keybindings/ && git commit -m "feat: add configurable keybinding manager"
```

---

### Task 17: Shell Picker Dropdown

**Files:**
- Create: `src/renderer/ui/shell-picker.ts`

- [ ] **Step 1: Write shell-picker.ts**

```typescript
// src/renderer/ui/shell-picker.ts
import { ShellInfo } from '../../shared/types.js';

export class ShellPicker {
  private element: HTMLElement;
  private shells: ShellInfo[] = [];
  private selectCallback: (shellId: string, elevated: boolean) => void = () => {};

  constructor(element: HTMLElement) {
    this.element = element;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target as Node) && !this.element.classList.contains('hidden')) {
        this.hide();
      }
    });
  }

  setShells(shells: ShellInfo[]): void {
    this.shells = shells;
  }

  onSelect(callback: (shellId: string, elevated: boolean) => void): void {
    this.selectCallback = callback;
  }

  show(): void {
    this.element.innerHTML = '';
    for (const shell of this.shells) {
      const option = document.createElement('div');
      option.className = 'shell-option';
      option.innerHTML = `
        <span>${shell.name}</span>
        ${shell.elevated ? '<span class="shield">🛡</span>' : ''}
        <span style="opacity:0.4;font-size:11px;margin-left:auto">${shell.profile}</span>
      `;
      option.addEventListener('click', () => {
        this.selectCallback(shell.id, shell.elevated);
        this.hide();
      });
      this.element.appendChild(option);
    }
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/ui/ && git commit -m "feat: add shell picker dropdown for creating new terminals"
```

---

### Task 18: Build and First Run

**Files:**
- Modify: `package.json` (verify scripts and main field)

- [ ] **Step 1: Verify all TypeScript compiles**

```bash
cd /c/Users/Pc/terminal-app && npx tsc -b
```

Fix any compilation errors.

- [ ] **Step 2: Install missing xterm addons**

```bash
npm install @xterm/addon-webgl @xterm/addon-fit
```

- [ ] **Step 3: Run the app**

```bash
npm start
```

Expected: Electron window opens with dark background. Ctrl+Shift+N shows shell picker. Selecting a shell spawns a working terminal.

- [ ] **Step 4: Fix any runtime errors**

Debug and fix issues found during first run. Common issues:
- Preload path incorrect → check `path.join(__dirname, ...)` resolves correctly
- xterm CSS not loaded → may need to copy `node_modules/xterm/css/xterm.css` or import it
- node-pty native module → may need `electron-rebuild`

```bash
npx electron-rebuild
```

- [ ] **Step 5: Commit working state**

```bash
git add -A && git commit -m "feat: first working build of Amadeus terminal emulator"
```

---

### Task 19: Copy/Paste and Right-Click Context Menu

**Files:**
- Modify: `src/renderer/terminal/terminal-instance.ts` (add clipboard handling)
- Modify: `src/renderer/keybindings/keybinding-manager.ts` (add copy/paste actions)

- [ ] **Step 1: Add clipboard support to terminal-instance.ts**

Add these methods to the `TerminalInstance` class:

```typescript
copySelection(): void {
  const selection = this.terminal.getSelection();
  if (selection) navigator.clipboard.writeText(selection);
}

async pasteClipboard(): Promise<void> {
  const text = await navigator.clipboard.readText();
  if (text && this.terminalId) {
    window.amadeus.terminal.write(this.terminalId, text);
  }
}
```

- [ ] **Step 2: Add right-click context menu to terminal-container.ts**

Add in the constructor of `TerminalContainer`:

```typescript
this.bodyEl.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  // Simple native-style context menu
  const menu = document.createElement('div');
  menu.style.cssText = 'position:fixed;background:#1a1a2e;border:1px solid #444;border-radius:4px;padding:4px 0;z-index:99999;font-size:13px;min-width:120px;box-shadow:0 4px 16px rgba(0,0,0,0.5)';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;

  const copyItem = document.createElement('div');
  copyItem.textContent = 'Copy';
  copyItem.style.cssText = 'padding:6px 16px;cursor:pointer';
  copyItem.onmouseover = () => copyItem.style.background = 'rgba(124,111,224,0.2)';
  copyItem.onmouseout = () => copyItem.style.background = '';
  copyItem.onclick = () => { this.instance.copySelection(); menu.remove(); };

  const pasteItem = document.createElement('div');
  pasteItem.textContent = 'Paste';
  pasteItem.style.cssText = 'padding:6px 16px;cursor:pointer';
  pasteItem.onmouseover = () => pasteItem.style.background = 'rgba(124,111,224,0.2)';
  pasteItem.onmouseout = () => pasteItem.style.background = '';
  pasteItem.onclick = () => { this.instance.pasteClipboard(); menu.remove(); };

  menu.appendChild(copyItem);
  menu.appendChild(pasteItem);
  document.body.appendChild(menu);

  const close = () => { menu.remove(); document.removeEventListener('click', close); };
  setTimeout(() => document.addEventListener('click', close), 0);
});
```

- [ ] **Step 3: Wire copy/paste keybindings in renderer/index.ts**

Add after the existing keybinding registrations:

```typescript
keybindings.on('copy', () => canvas.copyFromActive());
keybindings.on('paste', () => canvas.pasteToActive());
```

And add corresponding methods to `CanvasManager`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add copy/paste with Ctrl+Shift+C/V and right-click context menu"
```

---

### Task 20: Electron Packaging

**Files:**
- Modify: `electron-builder.yml`

- [ ] **Step 1: Build distributable**

```bash
npm run dist
```

Expected: Creates Windows installer in `release/` directory.

- [ ] **Step 2: Test the packaged app**

Run the generated `.exe` installer and verify the app launches correctly.

- [ ] **Step 3: Commit any config fixes**

```bash
git add -A && git commit -m "chore: finalize electron-builder packaging config"
```

---

## Deferred: Elevated Terminals (Future Task)

The elevated terminal helper process (`amadeus-elevate.exe`) is architecturally complex (named pipes, DACL, separate binary). It is designed in the spec but deferred from the initial implementation. The app currently logs a warning when `elevated = true` and spawns the shell normally. This can be implemented as a follow-up once the core app is stable.

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Project scaffolding |
| 2 | Shared types + IPC channels |
| 3 | Path utilities (TDD) |
| 4 | Config parser + default config (TDD) |
| 5 | Shell registry (TDD) |
| 6 | PTY manager |
| 7 | IPC handlers + preload bridge |
| 8 | Layout store |
| 9 | Main process entry |
| 10 | Renderer HTML + CSS + entry |
| 11 | xterm.js terminal instance |
| 12 | Terminal container + titlebar |
| 13 | Theme layers (background, overlay, image dragger) |
| 14 | Snap engine (TDD) |
| 15 | Canvas manager + drag + resize + z-index |
| 16 | Keybinding manager |
| 17 | Shell picker dropdown |
| 18 | First build + integration fixes |
| 19 | Copy/paste + context menu |
| 20 | Electron packaging |
