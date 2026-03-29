# Amadeus Terminal

A beautiful, customizable terminal emulator built with Electron, featuring anime-themed backgrounds, particle effects, and a free-form canvas where you can arrange multiple terminal windows.

---

## Screenshots

<!-- Add your screenshots here -->
<!-- ![Screenshot 1](screenshots/screenshot1.png) -->
<!-- ![Screenshot 2](screenshots/screenshot2.png) -->
<!-- ![Screenshot 3](screenshots/screenshot3.png) -->

---

## Features

- **Free-form canvas** - Drag, resize, and arrange multiple terminal windows anywhere
- **21 anime themes** - Evangelion, Steins;Gate, Death Note, K-ON!, Cyberpunk Edgerunners, and more
- **12 color themes** - Cyberpunk, Dracula, Tokyo Night, Monokai, Nord, and more
- **18 particle effects** - Matrix, rain, snow, fireflies, sakura, embers, hearts, and more
- **Custom themes** - Save and load your own terminal themes with full visual state
- **Background images** - Add any image, drag to reposition (Alt+Drag), zoom (Alt+Scroll), rotate (Alt+Shift+Scroll)
- **Multiple workspaces** - Organize terminals into workspace tabs
- **Session persistence** - Terminals, positions, themes, and workspaces are restored on restart
- **Custom CSS** - Apply your own CSS to any terminal
- **Configurable** - TOML config file for shells, profiles, keybindings

---

## Installation

### Prerequisites

- **Node.js** v18 or higher - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Windows** (10 or 11)

### Option 1: Pre-built (recommended)

1. Go to the [Releases](https://github.com/Rakataxxd/amadeus/releases) page
2. Download the latest `.zip` file
3. Extract and run `Amadeus.exe`

### Option 2: Build from source

Open a terminal (PowerShell or CMD) and run these commands one by one:

```bash
# 1. Clone the repository
git clone https://github.com/Rakataxxd/amadeus.git

# 2. Enter the folder
cd amadeus

# 3. Install dependencies
npm install

# 4. Rebuild native modules for Electron
npx electron-rebuild

# 5. Build the project
npm run build

# 6. Run the app
npm start
```

If everything worked, the Amadeus terminal should open.

### Option 3: Build a portable executable

After completing steps 1-4 from Option 2:

```bash
# Build the distributable
npm run dist
```

The output will be in `dist/win-unpacked/`. You can run `Amadeus.exe` from there.

---

## Troubleshooting

### `node-pty` build errors

If you see errors about `node-pty` during `npm install`:

1. Install the Windows build tools:
   ```bash
   npm install --global windows-build-tools
   ```
2. Or install Visual Studio Build Tools with the "Desktop development with C++" workload

3. Then retry:
   ```bash
   npm install
   npx electron-rebuild
   ```

### App opens but terminal is blank

Make sure you ran `npx electron-rebuild` after `npm install`. This rebuilds `node-pty` for the correct Electron version.

### Terminals don't restore on restart

Close the app by clicking the X button (not by force-killing). The session saves on graceful close.

---

## Usage

### Keybindings

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` | New terminal |
| `Ctrl+Shift+W` | Close terminal |
| `Ctrl+Tab` | Next terminal |
| `Ctrl+Shift+Tab` | Previous terminal |

### Image Controls

| Shortcut | Action |
|---|---|
| `Alt + Drag` | Move background image |
| `Alt + Scroll` | Zoom background image |
| `Alt + Shift + Scroll` | Rotate background image |

### Terminal Windows

- **Drag titlebar** to move
- **Drag edges/corners** to resize
- **Double-click titlebar** to rename

---

## Configuration

Amadeus uses a TOML config file at `~/.amadeus/config.toml`. It's created automatically on first launch.

```toml
[general]
default_shell = "powershell"
default_profile = "default"

[shells.powershell]
command = "powershell.exe"
profile = "default"

[shells.cmd]
command = "cmd.exe"
profile = "default"

[profiles.default]
font = "Cascadia Code"
font_size = 14
cursor_style = "block"
text_color = "#c0c0c0"

[profiles.default.background]
color = "#1a1a2e"
```

---

## Anime Themes

Amadeus includes 21 anime themes with bundled background images:

| Theme | Particles |
|---|---|
| A Silent Voice | - |
| Evangelion | - |
| Steins;Gate | Scanlines |
| Takopi | - |
| Nisekoi | - |
| Toradora | - |
| Dragon Ball | - |
| Death Note | - |
| Attack on Titan | - |
| One Piece | - |
| Demon Slayer | - |
| Fullmetal Alchemist | - |
| Cowboy Bebop | - |
| Spirited Away | - |
| My Hero Academia | - |
| Asuka | Stardust |
| K-ON! | Confetti |
| Quintessential Quintuplets | Binary |
| Nisekoi Chitoge | Stardust |
| Cyberpunk Edgerunners | Hearts |
| Bunny Girl Senpai | Rain |

---

## Tech Stack

- **Electron** - Desktop framework
- **TypeScript** - Language
- **xterm.js** - Terminal emulator
- **node-pty** - PTY backend (runs in a child process)
- **TOML** - Configuration format

---

## License

ISC
