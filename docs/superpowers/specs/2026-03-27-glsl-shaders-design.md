# Amadeus — GLSL Shader System Design Spec

## Overview

Add a custom GLSL shader system to Amadeus that allows users to write WebGL2 fragment shaders directly in their TOML config. Each terminal profile supports two independent shaders: a **background shader** (runs on the background/overlay layer) and a **post-processing shader** (runs on the fully rendered terminal output). The system uses a unified WebGL2 compositor per terminal for efficient context usage.

## Architecture

### WebGL2 Compositor

Each `terminal-container` gains a `shader-compositor` that takes ownership of all visual rendering:

```
terminal-container
├── <canvas id="compositor">     ← WebGL2, full size of terminal
│   Pipeline per frame:
│   1. background-pass: background shader → FBO texture
│   2. capture xterm.js canvas → u_terminal texture
│   3. post-pass: post shader over FBO + u_terminal → screen
└── <div class="xterm-host">     ← xterm.js (pointer-events only, opacity: 0)
```

xterm.js continues handling input/output normally but its canvas is set to `opacity: 0`. The compositor captures it as a texture each frame via `texImage2D` and renders it within the shader pipeline. The user sees the compositor output, not the xterm.js canvas directly.

The `shader-compositor` replaces the existing `background-layer` and `overlay-layer` modules. The `theme-engine` passes compiled shaders and uniforms to it.

### New Modules

- `shader-compositor.ts` — manages the WebGL2 context, compiles shaders, runs the render loop, captures xterm.js canvas as texture
- `shader-compiler.ts` — compiles GLSL fragment shaders, wraps them with injected uniforms and vertex shader, returns compiled program or error string
- `audio-sampler.ts` — singleton that captures system audio amplitude via Web Audio API, exposes a `getAmplitude(): number` method shared across all terminals

### Modules Replaced

- `background-layer.ts` — superseded by `shader-compositor.ts`
- `overlay-layer.ts` — superseded by `shader-compositor.ts`

### Render Pipeline Detail

**Vertex shader (fixed, injected by system):**
```glsl
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
```

**Background pass:**
1. Bind FBO
2. Run `background_shader` fragment with `u_image`, `u_overlay`, `u_time`, `u_resolution`, `u_mouse`, `u_audio`
3. Output to FBO texture

**Post pass:**
1. Capture xterm.js canvas to `u_terminal` texture
2. Bind screen framebuffer
3. Run `post_shader` fragment with all uniforms + `u_terminal` + FBO texture as `u_background`
4. Output to screen

If either shader is disabled or absent, its pass uses a default pass-through program.

## TOML Configuration

Shaders are defined inside profiles as subsections:

```toml
[profiles.waifu.background_shader]
enabled = true
fragment = """
void main() {
  vec2 uv = v_uv;
  vec4 img = texture2D(u_image, uv);

  // Animated scanlines
  float scan = sin(uv.y * u_resolution.y * 1.5 + u_time * 2.0) * 0.04;
  vec3 color = img.rgb - scan;

  gl_FragColor = vec4(color, img.a);
}
"""

[profiles.waifu.post_shader]
enabled = true
fragment = """
void main() {
  vec2 uv = v_uv;

  // Chromatic aberration
  float offset = 0.003;
  float r = texture2D(u_terminal, uv + vec2(offset, 0.0)).r;
  float g = texture2D(u_terminal, uv).g;
  float b = texture2D(u_terminal, uv - vec2(offset, 0.0)).b;
  float a = texture2D(u_terminal, uv).a;

  gl_FragColor = vec4(r, g, b, a);
}
"""
```

### Injected Uniforms

The system automatically injects these uniforms into every shader — the user does not declare them:

| Uniform | Type | Description | Available in |
|---|---|---|---|
| `u_time` | `float` | Seconds since terminal opened | both |
| `u_resolution` | `vec2` | Terminal size in pixels | both |
| `u_mouse` | `vec2` | Cursor position over terminal (0.0–1.0) | both |
| `u_image` | `sampler2D` | Background image texture | both |
| `u_overlay` | `sampler2D` | Overlay image texture | both |
| `u_audio` | `float` | System audio amplitude (0.0–1.0) | both |
| `u_terminal` | `sampler2D` | Rendered terminal content | post_shader only |
| `u_background` | `sampler2D` | Output of background pass | post_shader only |

`u_image` and `u_overlay` resolve to a 1×1 transparent texture when no image is configured.

### Config Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `true` | Whether the shader runs |
| `fragment` | string | — | GLSL fragment shader source |

## Error Handling

When a shader fails to compile, a semitransparent overlay appears over that terminal:

```
┌─────────────────────────────────────────┐
│ [shader error — post_shader]            │
│                                         │
│ ERROR: 0:12: 'textur2D' undefined       │
│ ERROR: 0:12: no matching overloaded     │
│              function found             │
│                                         │
│ Terminal running with no post shader.   │
└─────────────────────────────────────────┘
```

- The overlay is rendered as a DOM element above the compositor canvas
- The terminal continues functioning normally behind the overlay
- On hot-reload with a corrected shader, the overlay disappears automatically
- Background shader failure → falls back to profile's solid `color`
- Post shader failure → falls back to pass-through (terminal rendered without effects)
- All GLSL errors are also logged to DevTools console with profile name and shader section

## Hot-Reload

The existing `config-parser` detects TOML changes. When a profile's shader source changes:

1. `theme-engine` receives the updated profile via the existing `config:updated` IPC event
2. `theme-engine` passes the new shader source to the relevant `shader-compositor`
3. `shader-compositor` recompiles in the existing WebGL2 context — no canvas recreation, no terminal interruption
4. On success: new shader takes effect immediately on the next frame
5. On failure: error overlay appears, previous shader (or fallback) continues running

## Audio Sampling

`audio-sampler.ts` is a singleton:

- Uses `navigator.mediaDevices.getUserMedia({ audio: true })` on first terminal with `u_audio`
- Connects to a Web Audio `AnalyserNode`, reads RMS amplitude each frame
- Exposes `getAmplitude(): number` (0.0–1.0, smoothed with a simple low-pass filter)
- If permission is denied, `u_audio` is always `0.0` — no error shown to user
- All terminals share the same audio context

## WebGL Context Budget

The existing spec notes a limit of ~16 WebGL contexts per Electron renderer process.

When the shader compositor is active for a terminal, xterm.js is initialized with the **Canvas addon** instead of the WebGL addon. The compositor's WebGL2 context handles all GPU rendering for that terminal. Net context count per terminal remains **1**.

When no shader is configured for a profile (neither `background_shader` nor `post_shader`), `terminal-instance` continues using the WebGL addon as before and no compositor is created — zero overhead for profiles without shaders.

The existing fallback to canvas renderer when the context limit is hit remains unchanged and applies to the compositor context as well.

## New Module Summary

```
src/renderer/
├── terminal/
│   └── shader-compositor.ts    ← new: WebGL2 context, render loop, texture capture
├── theme/
│   ├── shader-compiler.ts      ← new: GLSL compilation, uniform injection, error reporting
│   └── audio-sampler.ts        ← new: Web Audio API amplitude singleton
```

`background-layer.ts` and `overlay-layer.ts` are removed.

## Success Criteria

1. Users can write custom GLSL fragment shaders in their TOML profile
2. Background shader and post-processing shader work independently per profile
3. All uniforms (`u_time`, `u_resolution`, `u_mouse`, `u_image`, `u_overlay`, `u_terminal`, `u_audio`) are available without user declaration
4. GLSL compile errors display as an overlay on the affected terminal with the compiler message
5. Hot-reload updates running shaders without interrupting the terminal session
6. One WebGL2 context per terminal — no regression on the existing context budget
7. Disabling shaders (`enabled = false`) or omitting them falls back gracefully to previous rendering
