# Amadeus Terminal

A beautiful, customizable terminal emulator for Windows built with Electron. Anime-themed backgrounds, particle effects, and a free-form canvas where you can arrange multiple terminal windows however you want.

> **Note:** This version still has some known issues with background image displacement when resizing terminals. These will be fixed in a future update. If your background image disappears or looks off, you can fix it manually using **Alt + Scroll** (zoom) and **Alt + Drag** (reposition).

---

## Screenshots


<!-- ![Main View](screenshots/main.png) -->
<!-- ![Themes](screenshots/themes.png) -->
<!-- ![Multiple Terminals](screenshots/multiple.png) -->
<!-- ![Settings](screenshots/settings.png) -->

---

## Features

- Free-form canvas - drag, resize, and arrange multiple terminals anywhere
- 18 built-in anime themes with background images
- 12 color themes (Cyberpunk, Dracula, Tokyo Night, Monokai, Nord...)
- 18 particle effects (matrix, rain, snow, fireflies, sakura, embers...)
- Save and load your own custom themes
- Add any image as background
- Multiple workspace tabs
- Session persistence - everything restores on restart
- Custom CSS per terminal
- Configurable via TOML

---

## Installation

### What you need first

1. **Node.js** v18+ - Download from [nodejs.org](https://nodejs.org/) (pick the LTS version)
2. **Git** - Download from [git-scm.com](https://git-scm.com/)
3. **Windows 10 or 11**

### Step by step

Open **PowerShell as Administrator** and run this first (only once, fixes script permissions):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Type `S` (Yes) when it asks for confirmation. Then close that PowerShell.

Now open a **normal PowerShell or CMD** and run:

```bash
# Clone the repo
git clone https://github.com/Rakataxxd/amadeus.git

# Go into the folder
cd amadeus

# Install everything (electron-rebuild runs automatically)
npm install

# Build and run
npm start
```

That's it. Amadeus should open.

### Build a portable .exe

If you want a standalone folder you can copy anywhere:

```bash
npm run dist
```

Find `Amadeus.exe` inside `dist/win-unpacked/`.

---

## Controls

### Terminal windows

| Action | How |
|---|---|
| Create new terminal | Click `+` button or `Ctrl+Shift+N` |
| Close terminal | Click the X on the terminal titlebar or `Ctrl+Shift+W` |
| Move terminal | Drag the titlebar |
| Resize terminal | Drag any edge or corner |
| Rename terminal | Double-click the titlebar text |
| Switch terminal focus | Click on it, or `Ctrl+Tab` / `Ctrl+Shift+Tab` |

### Workspaces

| Action | How |
|---|---|
| New workspace | Click `+` at the end of the tab bar |
| Switch workspace | Click the tab |
| Close workspace | Click X on the tab |
| Rename workspace | Double-click the tab text |

### Background image

| Action | How |
|---|---|
| Move image | `Alt` + Drag |
| Zoom image | `Alt` + Scroll wheel |
| Rotate image | `Alt` + `Shift` + Scroll wheel |
| Pick image file | Settings panel > Background > Choose image |

### Settings panel

| Action | How |
|---|---|
| Open settings | Click the gear icon in the toolbar |
| Apply anime theme | Click any anime theme button |
| Apply color theme | Click any color theme button |
| Change particles | Click a particle type in the Particles section |
| Save current look | My Themes > type a name > Save current |
| Load saved theme | Click your saved theme button |
| Reset everything | Click Reset at the bottom |

---

## Themes

### Anime Themes (18)

Each comes with a background image and matching colors:

A Silent Voice, Steins;Gate, Takopi, Dragon Ball, Death Note, Attack on Titan, One Piece, Demon Slayer, Fullmetal Alchemist, Cowboy Bebop, Spirited Away, My Hero Academia, Asuka, K-ON!, Quintessential Quintuplets, Nisekoi Chitoge, Cyberpunk Edgerunners, Bunny Girl Senpai

### Color Themes (12)

Cyberpunk, Anime Purple, Naruto, Tokyo Night, Dracula, Monokai, Catppuccin, Rose Pine, Nord, Solarized, Neon Pink, Ocean Blue, Blood Red

### Particle Effects (18)

none, snow, fireflies, matrix, starfield, sakura, embers, bubbles, rain, lightning, smoke, confetti, stardust, hearts, leaves, ash, binary, galaxy

---

## Configuration

Config file is at `~/.amadeus/config.toml` (created on first run).

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
border_radius = 8

[profiles.default.background]
color = "#1a1a2e"
```

---

## Troubleshooting

**PowerShell says "execution of scripts is disabled"?**

Run this in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Type `S` to confirm. Then retry `npm install`.

**`node-pty` errors during install?**

You need C++ build tools. Run:
```bash
npm install --global windows-build-tools
```
Or install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++". Then retry `npm install && npx electron-rebuild`.

**App opens but no text in terminal?**

Run `npx electron-rebuild` - this rebuilds node-pty for your Electron version.

**Terminals don't save?**

Close the app with the X button, not by killing the process. Session saves on graceful close.

---

## Tech Stack

- [Electron](https://www.electronjs.org/) - Desktop framework
- [TypeScript](https://www.typescriptlang.org/) - Language
- [xterm.js](https://xtermjs.org/) - Terminal rendering
- [node-pty](https://github.com/microsoft/node-pty) - PTY backend
- [TOML](https://toml.io/) - Config format

---

## License

ISC
