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

## Layout System — Free Canvas + Smart Snap

Each terminal is an independently positioned widget on an infinite canvas:

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

When creating a new terminal, the user can override the default shell and elevated setting.

### Elevated Terminals

When `elevated = true`, Amadeus spawns the shell process with admin privileges. On Windows, this requires the app itself to request elevation or use a helper process. The title bar shows a visual indicator (shield icon) for elevated terminals.

## Customization System

Six layers of visual customization per terminal, all configured via TOML profiles:

### Layer 1: Background
- Solid color, gradient, or image (PNG/JPG/GIF)
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

**Hot-reload:** chokidar watches the config file. Changes are parsed, validated, and pushed to the renderer via IPC. Visual changes apply immediately without restarting terminals.

### Config Sections

- `[general]` — default shell, default profile, start layout
- `[canvas]` — snap settings, grid settings
- `[shells.*]` — shell definitions (command, args, profile, elevated, env)
- `[profiles.*]` — visual profiles with all 6 customization layers
- `[keybindings]` — keyboard shortcut mappings
- `[layouts.*]` — named layouts with terminal positions/sizes/shells

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
| chokidar | File watcher for config hot-reload |
| electron-builder | Build and packaging for Windows |

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
│   │   └── ipc-handlers.ts
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
- node-pty crash: attempt to respawn the shell, show error if it fails repeatedly

## Success Criteria

1. Can open multiple terminals with different shells simultaneously
2. Terminals can be freely positioned and resized on the canvas with smart snap
3. Each terminal has independent visual customization including background images that can be dragged
4. All configuration is via TOML file with hot-reload
5. Layouts can be saved and restored across sessions
6. Terminals can optionally run with elevated privileges
7. Keyboard shortcuts are fully configurable
8. The app runs smoothly on Windows 10/11
