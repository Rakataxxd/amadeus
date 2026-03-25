# Amadeus — Terminal Emulator Design Spec

## Overview

Amadeus is a Windows terminal emulator built with Electron that provides a free-form canvas for positioning multiple terminal instances. Each terminal can be dragged, resized, and styled independently with deep visual customization including background images, overlays, and custom CSS. All configuration is done via a TOML file with hot-reload support.

## Platform

- Windows only (10/11)
- Electron 33+ runtime

## Architecture

Two Electron processes connected via IPC:

**Main Process (Node.js):**
- `pty-manager` — spawns and kills shell processes using node-pty, supports elevated (admin) terminals via a helper
- `config-parser` — reads and validates the TOML config file, watches for changes, notifies renderer on update
- `shell-registry` — detects installed shells on the system (PowerShell, CMD, Git Bash, WSL, custom)
- `layout-store` — persists and restores terminal positions, sizes, and background image positions to disk
- `ipc-handlers` — bridges all communication between main and renderer processes

**Renderer Process (UI):**
- `canvas-manager` — the root container that holds all terminal widgets in absolute positioning
- `drag-engine` — handles drag and drop of terminal windows by their title bar
- `resize-engine` — handles resizing by any edge or corner, minimum size 200x100px
- `snap-engine` — smart snap-to-edge and snap-to-other-terminals, configurable threshold, disabled with Shift held
- `z-manager` — manages z-index: click to bring forward, Ctrl+Click to send back, supports overlapping
- `terminal-instance` — creates/destroys xterm.js instances with WebGL addon for GPU-accelerated rendering
- `terminal-titlebar` — custom title bar per terminal showing shell name, theme name, and window controls
- `terminal-container` — visual wrapper applying borders, backgrounds, overlays, and effects
- `theme-engine` — applies visual profiles to terminals, resolves config to CSS
- `background-layer` — renders background images/gradients with configurable opacity, blur, position, and size
- `image-dragger` — Alt+Click+Drag to reposition background images, Alt+Scroll to resize them, position persisted in layout
- `overlay-layer` — renders overlay images (PNG with transparency) on top of background, under text
- `keybinding-manager` — configurable keyboard shortcuts

**Shared:**
- `types.ts` — TypeScript interfaces for Config, Profile, Layout, Terminal
- `ipc-channels.ts` — IPC channel name constants

**Preload:**
- `preload.ts` — secure contextBridge API exposing IPC to renderer

## Security Model

- `nodeIntegration: false` and `contextIsolation: true` on the BrowserWindow.
- The preload script exposes a strict whitelist API via `contextBridge.exposeInMainWorld`:
  - `amadeus.terminal.create(shellId: string, elevated: boolean)` — only accepts registered shell IDs, not arbitrary commands
  - `amadeus.terminal.write(terminalId: string, data: string)` — sends input to a specific PTY
  - `amadeus.terminal.resize(terminalId: string, cols: number, rows: number)` — resizes a PTY
  - `amadeus.terminal.close(terminalId: string)` — kills a PTY
  - `amadeus.config.get()` — returns the current parsed config (read-only)
  - `amadeus.config.onUpdate(callback)` — subscribes to config changes
  - `amadeus.layout.save(name: string, layout: LayoutData)` — saves a layout
  - `amadeus.layout.load(name: string)` — loads a layout
  - `amadeus.shell.list()` — returns available shells
  - `amadeus.terminal.onData(terminalId, callback)` — subscribes to PTY output for a terminal
  - `amadeus.terminal.onCreated(callback)` — notified when a PTY is spawned
  - `amadeus.terminal.onExited(terminalId, callback)` — notified when a PTY exits
  - `amadeus.onError(callback)` — subscribes to error events from main process
- The renderer cannot execute arbitrary shell commands; it can only reference shell IDs defined in the config.
- `custom_css` is scoped to the terminal container element via a shadow DOM or scoped style tag. CSS `url()` values are restricted to local `file://` paths under `~/.amadeus/`.

## Layout System — Free Canvas + Smart Snap

Each terminal is an independently positioned widget on a bounded canvas that matches the app window dimensions:

- **Drag**: grab the title bar to move. Snap-to-edge and snap-to-other-terminals activate within a configurable pixel threshold (default 15px). Hold Shift to disable snap temporarily.
- **Resize**: grab any edge or corner. Minimum size 200x100px. Snap also applies during resize.
- **Z-Index**: click a terminal to bring it to front. Ctrl+Click sends it to back. Terminals can overlap freely.
- **Snap-to-grid**: optional, disabled by default. Grid size configurable.
- **Layouts**: named layout configurations saved to the TOML config. A start layout can be set to restore positions on app launch.

Layout positions are stored as percentages of the window size so they adapt when the app window is resized.

## Shell System

Shells are defined in the TOML config. Any shell can be added:

```toml
[shells.powershell]
command = "pwsh.exe"
args = []
profile = "waifu"
elevated = false
env = { TERM = "xterm-256color" }

[shells.wsl]
command = "wsl.exe"
args = ["-d", "Ubuntu"]
profile = "naruto"
elevated = false
```

- `command` — path or name of the executable
- `args` — optional arguments
- `profile` — visual profile to apply
- `elevated` — if true, the terminal runs with administrator privileges
- `env` — additional environment variables

The shell registry auto-detects common shells (PowerShell, CMD, Git Bash, WSL distros) on first run to populate defaults.

When creating a new terminal (Ctrl+Shift+N), a small dropdown menu appears at the center of the canvas listing all configured shells with their profile names. Each entry shows the shell name and a shield icon if `elevated = true`. The user clicks a shell to spawn it, or presses Escape to cancel. The new terminal appears at the center of the visible canvas area with the default size (40% width, 40% height).

### Elevated Terminals

Amadeus runs as a normal (non-elevated) process. For elevated terminals, it uses a helper process architecture:

1. A small `amadeus-elevate.exe` helper binary is included in the distribution.
2. When spawning an elevated terminal, the main process launches the helper via `ShellExecuteEx` with `runas` verb, which triggers the Windows UAC prompt.
3. The helper creates the PTY (via node-pty logic compiled into it) and communicates with the main Amadeus process over a named pipe (`\\.\pipe\amadeus-pty-{id}`).
4. stdin/stdout/resize events are bridged over the named pipe, transparent to the renderer.
5. The title bar shows a shield icon (🛡) for elevated terminals.

The named pipe is created by the helper with a restricted DACL that only allows the launching user's SID to connect. Additionally, a random nonce is passed as a command-line argument to the helper and must be sent as the first message on the pipe to authenticate the connection.

This approach avoids running the entire Electron app as admin, which would break drag-and-drop and violate least-privilege principles.

## Customization System

Six layers of visual customization per terminal, all configured via TOML profiles:

### Layer 1: Background
- Solid color, gradient, or image (PNG/JPG/GIF — animated GIFs display only the first frame to avoid performance issues with blur/overlay compositing)
- Image properties: opacity, blur, position, size (contain/cover/auto/fixed px)
- `image_draggable = true` enables Alt+Click+Drag to reposition the image within the terminal
- Alt+Scroll to resize the background image
- Image position is persisted in the layout store

### Layer 2: Overlay
- A second image layer rendered above the background but below the terminal text
- Intended for character art, decorative PNGs with transparency, visual effects (scanlines, grain, vignette)
- Configurable opacity

### Layer 3: Text
- Font family and size
- Text color
- Text glow via text-shadow (e.g., `"0 0 8px rgba(147,51,234,0.3)"`)
- Font ligatures on/off
- Cursor style (block/underline/bar) and color

### Layer 4: Borders and Title Bar
- Border color, width, and border-radius
- Title bar accent color
- Window control button colors

### Layer 5: Effects
- Window opacity (transparency)
- Backdrop blur
- Box shadow
- CSS animations

### Layer 6: Custom CSS
- Raw CSS string applied to the terminal container
- Full control to override any visual aspect

### Profile Example

```toml
[profiles.waifu]
font = "Cascadia Code"
font_size = 14
opacity = 0.85
blur = 12
text_color = "#e8d5f5"
text_glow = "0 0 8px rgba(147,51,234,0.3)"
border_color = "#9333ea"
border_radius = 8
titlebar_color = "#9333ea"
cursor_style = "block"
cursor_color = "#ec4899"

[profiles.waifu.background]
color = "#1a0a2e"
image = "~/.amadeus/images/waifu.png"
image_opacity = 0.2
image_size = "contain"
image_position = "right bottom"
image_draggable = true

[profiles.waifu.overlay]
image = "~/.amadeus/overlays/sakura.png"
opacity = 0.05

custom_css = """
.xterm-viewport { scrollbar-color: #9333ea #1a0a2e; }
"""
```

## Configuration

**File location:** `~/.amadeus/config.toml`

Created automatically with sensible defaults on first launch. The config parser validates the file and falls back to defaults for invalid values.

**Hot-reload:** `fs.watch` monitors the config file (single file, no need for chokidar). Changes are parsed, validated, and pushed to the renderer via IPC.

Hot-reload scope:
- **Immediate (no restart):** `[profiles.*]` (all visual properties), `[canvas]` (snap settings), `[keybindings]`
- **New terminals only:** `[shells.*]` changes to `command`, `args`, `env` — already-running terminals keep their current shell process
- **App restart required:** none — all config is hot-reloadable at the appropriate level

### Config Sections

- `[general]` — default shell, default profile, start layout
- `[canvas]` — snap settings, grid settings
- `[shells.*]` — shell definitions (command, args, profile, elevated, env)
- `[profiles.*]` — visual profiles with all 6 customization layers
- `[keybindings]` — keyboard shortcut mappings
- `[layouts.*]` — named layouts with terminal positions/sizes/shells

### Layout Format Example

```toml
[layouts.main-workspace]

[[layouts.main-workspace.terminals]]
shell = "powershell"
x = 0        # percentage of window width
y = 0        # percentage of window height
width = 55   # percentage
height = 60  # percentage
z = 0        # z-index order
bg_offset_x = 120  # background image drag offset (px)
bg_offset_y = 40
bg_scale = 1.0      # background image scale

[[layouts.main-workspace.terminals]]
shell = "gitbash"
x = 56
y = 0
width = 44
height = 40
z = 1
```

## Keyboard Shortcuts (Defaults)

| Shortcut | Action |
|---|---|
| Ctrl+Shift+N | New terminal |
| Ctrl+Shift+W | Close active terminal |
| Ctrl+Tab | Focus next terminal |
| Ctrl+Shift+Tab | Focus previous terminal |
| Ctrl+Shift+S | Save current layout |
| Ctrl+Shift+L | Load a saved layout |
| F11 | Toggle fullscreen |
| Ctrl+Shift+R | Reload config |

All shortcuts are remappable in `[keybindings]`.

## IPC Channel Contract

| Channel | Direction | Payload | Purpose |
|---|---|---|---|
| `pty:create` | renderer → main | `{ shellId, elevated }` | Spawn a new shell process |
| `pty:created` | main → renderer | `{ terminalId, shellId, pid }` | Confirm shell spawned |
| `pty:data` | main → renderer | `{ terminalId, data: string }` | Shell stdout/stderr output |
| `pty:write` | renderer → main | `{ terminalId, data: string }` | User keyboard input to shell |
| `pty:resize` | renderer → main | `{ terminalId, cols, rows }` | Terminal resized |
| `pty:close` | renderer → main | `{ terminalId }` | Kill shell process |
| `pty:exited` | main → renderer | `{ terminalId, exitCode }` | Shell process exited |
| `config:updated` | main → renderer | `{ config: ParsedConfig }` | Config file changed on disk |
| `config:get` | renderer → main | `{}` | Request current config |
| `config:current` | main → renderer | `{ config: ParsedConfig }` | Current config response |
| `layout:save` | renderer → main | `{ name, terminals: LayoutTerminal[] }` | Save layout to disk |
| `layout:load` | renderer → main | `{ name }` | Load a saved layout |
| `layout:data` | main → renderer | `{ name, terminals: LayoutTerminal[] }` | Layout data response |
| `shell:list` | renderer → main | `{}` | Request available shells |
| `shell:available` | main → renderer | `{ shells: ShellInfo[] }` | Available shells response |
| `error` | main → renderer | `{ source: string, terminalId?: string, message: string }` | Error notification (spawn failure, config error, etc.) |

## Copy/Paste

- **Ctrl+Shift+C** — copy selected text from active terminal
- **Ctrl+Shift+V** — paste clipboard into active terminal
- **Right-click** — context menu with Copy/Paste (Windows convention)
- These defaults avoid conflict with Ctrl+C (SIGINT) in shells
- Remappable in `[keybindings]`

## Path Resolution

All paths in the TOML config support:
- `~` — expanded to `os.homedir()` (typically `C:\Users\<name>`)
- `%ENV_VAR%` — expanded from `process.env`
- Relative paths — resolved relative to `~/.amadeus/`
- Forward slashes are normalized to the OS separator

## Terminal Limits

xterm.js with the WebGL addon is limited to ~16 active WebGL contexts per Electron renderer process. When the limit is reached, new terminals automatically fall back to the canvas-based renderer (slightly lower performance but functionally identical). The user is not interrupted.

## Config Versioning

The config file includes a `version` field:

```toml
version = 1
```

On startup, the config parser checks the version. If the file uses an older schema, it is automatically migrated (renamed keys, added defaults for new fields). Unknown keys are ignored and preserved. A backup of the pre-migration file is saved as `config.toml.bak`.

## Data Flow

1. **Config → Visuals:** config.toml → config-parser → IPC → theme-engine → terminal containers
2. **User Input → Shell:** keypress → xterm.js → IPC → node-pty → shell process → stdout → IPC → xterm.js
3. **Layout → Persistence:** drag/resize → canvas-manager → IPC → layout-store → disk

## Dependencies

| Package | Purpose |
|---|---|
| electron | Desktop runtime |
| xterm + xterm-addon-webgl | Terminal rendering (GPU-accelerated) |
| node-pty | Native PTY for spawning real shells |
| @iarna/toml | TOML parser |
| electron-builder | Build and packaging for Windows |
| pkg | Compiles elevate-helper.ts into standalone amadeus-elevate.exe |

## Project Structure

```
amadeus/
├── package.json
├── tsconfig.json
├── electron-builder.yml
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── pty-manager.ts
│   │   ├── config-parser.ts
│   │   ├── shell-registry.ts
│   │   ├── layout-store.ts
│   │   ├── ipc-handlers.ts
│   │   └── elevate/
│   │       ├── elevate-helper.ts       # source for amadeus-elevate.exe
│   │       ├── pipe-bridge.ts          # named pipe communication
│   │       └── build-helper.js         # script to compile helper to .exe (pkg)
│   ├── renderer/
│   │   ├── index.html
│   │   ├── index.ts
│   │   ├── styles.css
│   │   ├── canvas/
│   │   │   ├── canvas-manager.ts
│   │   │   ├── drag-engine.ts
│   │   │   ├── resize-engine.ts
│   │   │   ├── snap-engine.ts
│   │   │   └── z-manager.ts
│   │   ├── terminal/
│   │   │   ├── terminal-instance.ts
│   │   │   ├── terminal-titlebar.ts
│   │   │   └── terminal-container.ts
│   │   ├── theme/
│   │   │   ├── theme-engine.ts
│   │   │   ├── background-layer.ts
│   │   │   ├── image-dragger.ts
│   │   │   └── overlay-layer.ts
│   │   └── keybindings/
│   │       └── keybinding-manager.ts
│   ├── shared/
│   │   ├── types.ts
│   │   └── ipc-channels.ts
│   └── preload/
│       └── preload.ts
└── resources/
    ├── icon.ico
    └── default-config.toml
```

## Error Handling

- Invalid TOML config: log the error, keep previous valid config, show a notification in the title bar
- Shell spawn failure: show error message in the terminal container instead of crashing
- Missing background image: silently fall back to solid color background
- node-pty crash: attempt to respawn up to 3 times within 10 seconds with 1-second backoff. After 3 failures, show a persistent error message in the terminal container with a manual "Retry" button

## Success Criteria

1. Can open multiple terminals with different shells simultaneously
2. Terminals can be freely positioned and resized on the canvas with smart snap
3. Each terminal has independent visual customization including background images that can be dragged
4. All configuration is via TOML file with hot-reload
5. Layouts can be saved and restored across sessions
6. Terminals can optionally run with elevated privileges
7. Keyboard shortcuts are fully configurable
8. The app runs smoothly on Windows 10/11
