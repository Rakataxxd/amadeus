# GLSL Shader System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a custom GLSL shader system to Amadeus so users can write WebGL2 fragment shaders directly in their TOML profile — one shader for the background layer and one for the full terminal post-processing pass.

**Architecture:** Each `TerminalContainer` optionally creates a `ShaderCompositor` that manages a WebGL2 canvas and render loop. The compositor runs two shader passes per frame: background → FBO, then post-process (xterm canvas + FBO) → screen. When no shaders are configured for a profile, the existing DOM-based bg/overlay rendering continues unchanged.

**Tech Stack:** WebGL2 (browser API), xterm.js v6 canvas capture, Web Audio API, TypeScript, Node.js `node:test`

---

## File Map

**Modified:**
- `src/shared/types.ts` — add `ShaderConfig` interface, add optional shader fields to `ProfileConfig`
- `src/renderer/terminal/terminal-container.ts` — integrate `ShaderCompositor`, conditionally swap rendering path

**Created:**
- `src/renderer/theme/shader-compiler.ts` — GLSL compilation, uniform injection, error extraction
- `src/renderer/theme/audio-sampler.ts` — singleton Web Audio amplitude sampler
- `src/renderer/theme/shader-compositor.ts` — WebGL2 render loop, FBO, texture capture, error overlay

**Test files created:**
- `tests/main/shader-types.test.ts` — config parsing picks up shader fields

---

## Task 1: Add ShaderConfig to types.ts

**Files:**
- Modify: `src/shared/types.ts`
- Create: `tests/main/shader-types.test.ts`

- [ ] **Step 1: Add `ShaderConfig` interface and update `ProfileConfig`**

Open `src/shared/types.ts`. Add the interface and update `ProfileConfig`:

```typescript
export interface ShaderConfig {
  enabled: boolean;
  fragment: string;
}
```

In `ProfileConfig`, add two optional fields at the bottom:

```typescript
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
  background_shader?: ShaderConfig;
  post_shader?: ShaderConfig;
}
```

- [ ] **Step 2: Write the failing test**

Create `tests/main/shader-types.test.ts`:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseConfig } from '../../src/main/config-parser.js';

describe('shader config parsing', () => {
  it('parses background_shader from profile', () => {
    const toml = `
version = 1
[general]
default_shell = "cmd"
default_profile = "default"
start_layout = ""
[canvas]
snap_enabled = true
snap_threshold = 15
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

[profiles.neon.background_shader]
enabled = true
fragment = "void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }"
`;
    const config = parseConfig(toml);
    const shader = config.profiles['neon']?.background_shader;
    assert.ok(shader, 'background_shader should be parsed');
    assert.strictEqual(shader.enabled, true);
    assert.ok(shader.fragment.includes('gl_FragColor'));
  });

  it('parses post_shader from profile', () => {
    const toml = `
version = 1
[general]
default_shell = "cmd"
default_profile = "default"
start_layout = ""
[canvas]
snap_enabled = true
snap_threshold = 15
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

[profiles.neon.post_shader]
enabled = true
fragment = "void main() { gl_FragColor = texture2D(u_terminal, v_uv); }"
`;
    const config = parseConfig(toml);
    const shader = config.profiles['neon']?.post_shader;
    assert.ok(shader, 'post_shader should be parsed');
    assert.strictEqual(shader.enabled, true);
    assert.ok(shader.fragment.includes('u_terminal'));
  });

  it('leaves shader fields undefined when not configured', () => {
    const toml = `
version = 1
[general]
default_shell = "cmd"
default_profile = "default"
start_layout = ""
[canvas]
snap_enabled = true
snap_threshold = 15
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
    const profile = config.profiles['default'];
    assert.strictEqual(profile?.background_shader, undefined);
    assert.strictEqual(profile?.post_shader, undefined);
  });
});
```

- [ ] **Step 3: Run test to verify it fails (type not yet recognized)**

```
npx tsx --test tests/main/shader-types.test.ts
```

Expected: FAIL — `background_shader` and `post_shader` not on `ProfileConfig` type yet (or pass-through without types if TypeScript is lenient at runtime — either is fine, the type change is what matters).

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run tests to confirm they pass**

```
npx tsx --test tests/main/shader-types.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts tests/main/shader-types.test.ts
git commit -m "feat: add ShaderConfig types and TOML parsing tests"
```

---

## Task 2: Create shader-compiler.ts

**Files:**
- Create: `src/renderer/theme/shader-compiler.ts`

The compiler wraps user GLSL with the uniform declarations header and a fixed vertex shader, compiles a WebGL2 program, and returns either the program or a human-readable error string.

- [ ] **Step 1: Create the file**

Create `src/renderer/theme/shader-compiler.ts`:

```typescript
// The vertex shader is fixed — user only writes the fragment shader.
// It outputs v_uv (0.0–1.0) from a full-screen quad.
const VERTEX_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// Injected before the user's fragment shader source.
// The user does not declare these — they are always available.
const UNIFORM_HEADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform sampler2D u_image;
uniform sampler2D u_overlay;
uniform float u_audio;
// u_terminal and u_background are only meaningful in post_shader,
// but declared in all shaders for convenience.
uniform sampler2D u_terminal;
uniform sampler2D u_background;

in vec2 v_uv;
out vec4 fragColor;

// Compatibility alias — user can write gl_FragColor or fragColor
#define gl_FragColor fragColor
`;

export type CompileResult =
  | { program: WebGLProgram; error: null }
  | { program: null; error: string };

function compileStage(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
): WebGLShader | string {
  const shader = gl.createShader(type);
  if (!shader) return 'Failed to create shader object';
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'Unknown compile error';
    gl.deleteShader(shader);
    return log;
  }
  return shader;
}

export function compileShaderProgram(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
): CompileResult {
  const vertResult = compileStage(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  if (typeof vertResult === 'string') {
    return { program: null, error: `[vertex] ${vertResult}` };
  }

  const fullFragment = UNIFORM_HEADER + '\n' + fragmentSource;
  const fragResult = compileStage(gl, gl.FRAGMENT_SHADER, fullFragment);
  if (typeof fragResult === 'string') {
    gl.deleteShader(vertResult);
    // Offset line numbers by header line count so user sees their line, not ours
    const headerLines = UNIFORM_HEADER.split('\n').length;
    const adjusted = fragResult.replace(
      /ERROR: (\d+):(\d+):/g,
      (_m, col, line) => `ERROR: ${col}:${Math.max(1, parseInt(line) - headerLines)}:`,
    );
    return { program: null, error: adjusted };
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertResult);
    gl.deleteShader(fragResult);
    return { program: null, error: 'Failed to create WebGL program' };
  }

  gl.attachShader(program, vertResult);
  gl.attachShader(program, fragResult);
  gl.linkProgram(program);
  gl.deleteShader(vertResult);
  gl.deleteShader(fragResult);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'Unknown link error';
    gl.deleteProgram(program);
    return { program: null, error: log };
  }

  return { program, error: null };
}

// Compiles a pass-through program — renders u_terminal as-is.
// Used when no user shader is configured or as fallback on error.
export function compilePassThrough(gl: WebGL2RenderingContext): WebGLProgram | null {
  const passThrough = `
void main() {
  fragColor = texture(u_terminal, v_uv);
}
`;
  const result = compileShaderProgram(gl, passThrough);
  return result.program;
}

// Compiles a background pass-through — renders u_image blended over a solid color.
export function compileBackgroundPassThrough(gl: WebGL2RenderingContext): WebGLProgram | null {
  const bg = `
void main() {
  vec4 img = texture(u_image, v_uv);
  fragColor = img;
}
`;
  const result = compileShaderProgram(gl, bg);
  return result.program;
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/theme/shader-compiler.ts
git commit -m "feat: add WebGL2 GLSL shader compiler with uniform injection"
```

---

## Task 3: Create audio-sampler.ts

**Files:**
- Create: `src/renderer/theme/audio-sampler.ts`

Singleton that taps the system microphone (closest available to "system audio" in browser APIs) and exposes a smoothed amplitude value (0–1) to all compositor instances.

- [ ] **Step 1: Create the file**

Create `src/renderer/theme/audio-sampler.ts`:

```typescript
export class AudioSampler {
  private static _instance: AudioSampler | null = null;

  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private _amplitude = 0;
  private _smoothed = 0;
  private _active = false;

  private constructor() {}

  static getInstance(): AudioSampler {
    if (!AudioSampler._instance) {
      AudioSampler._instance = new AudioSampler();
    }
    return AudioSampler._instance;
  }

  // Call once to begin sampling. Safe to call multiple times — no-ops after first.
  async start(): Promise<void> {
    if (this._active || this.context) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.context = new AudioContext();
      const source = this.context.createMediaStreamSource(stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      source.connect(this.analyser);
      this._active = true;
    } catch {
      // Permission denied or no microphone — u_audio will always be 0.0
      this._active = false;
    }
  }

  // Returns smoothed RMS amplitude in 0.0–1.0 range.
  // Call this once per animation frame.
  getAmplitude(): number {
    if (!this._active || !this.analyser) return 0;

    this.analyser.getByteTimeDomainData(this.dataArray);

    let sumSq = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sumSq += normalized * normalized;
    }
    const rms = Math.sqrt(sumSq / this.dataArray.length);
    this._amplitude = Math.min(1, rms * 4); // scale up for more responsive feel

    // Low-pass smooth: 80% previous, 20% new sample
    this._smoothed = this._smoothed * 0.8 + this._amplitude * 0.2;
    return this._smoothed;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/theme/audio-sampler.ts
git commit -m "feat: add AudioSampler singleton for u_audio uniform"
```

---

## Task 4: Create shader-compositor.ts

**Files:**
- Create: `src/renderer/theme/shader-compositor.ts`

The core of the system. Manages a WebGL2 canvas, the two-pass render pipeline, texture loading, FBO, and the error overlay DOM element.

- [ ] **Step 1: Create the file**

Create `src/renderer/theme/shader-compositor.ts`:

```typescript
import { compileShaderProgram, compilePassThrough, compileBackgroundPassThrough } from './shader-compiler.js';
import type { CompileResult } from './shader-compiler.js';
import { AudioSampler } from './audio-sampler.js';
import type { ProfileConfig } from '../../shared/types.js';

interface CompositorProgram {
  program: WebGLProgram;
  // Attribute location for the quad
  aPosition: number;
  // Uniform locations
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uMouse: WebGLUniformLocation | null;
  uImage: WebGLUniformLocation | null;
  uOverlay: WebGLUniformLocation | null;
  uAudio: WebGLUniformLocation | null;
  uTerminal: WebGLUniformLocation | null;
  uBackground: WebGLUniformLocation | null;
}

function makeProgram(gl: WebGL2RenderingContext, program: WebGLProgram): CompositorProgram {
  return {
    program,
    aPosition: gl.getAttribLocation(program, 'a_position'),
    uTime: gl.getUniformLocation(program, 'u_time'),
    uResolution: gl.getUniformLocation(program, 'u_resolution'),
    uMouse: gl.getUniformLocation(program, 'u_mouse'),
    uImage: gl.getUniformLocation(program, 'u_image'),
    uOverlay: gl.getUniformLocation(program, 'u_overlay'),
    uAudio: gl.getUniformLocation(program, 'u_audio'),
    uTerminal: gl.getUniformLocation(program, 'u_terminal'),
    uBackground: gl.getUniformLocation(program, 'u_background'),
  };
}

function makeBlankTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  return tex;
}

export class ShaderCompositor {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private errorOverlay: HTMLDivElement;

  private quadBuffer: WebGLBuffer;

  // Background pass
  private bgProgram: CompositorProgram | null = null;
  private bgFbo: WebGLFramebuffer | null = null;
  private bgFboTexture: WebGLTexture | null = null;

  // Post pass
  private postProgram: CompositorProgram | null = null;

  // Textures
  private imageTexture: WebGLTexture;
  private overlayTexture: WebGLTexture;
  private terminalTexture: WebGLTexture;

  private rafId: number | null = null;
  private startTime = performance.now();

  private mouseX = 0;
  private mouseY = 0;

  constructor(private body: HTMLElement) {
    // WebGL2 canvas — sits on top of the xterm layer
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2;
    `;
    body.appendChild(this.canvas);

    const gl = this.canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;

    // Error overlay — sits above the compositor canvas
    this.errorOverlay = document.createElement('div');
    this.errorOverlay.style.cssText = `
      display: none;
      position: absolute;
      inset: 0;
      z-index: 3;
      background: rgba(20, 0, 0, 0.85);
      color: #ff6b6b;
      font-family: 'Cascadia Code', 'Consolas', monospace;
      font-size: 12px;
      padding: 14px 16px;
      white-space: pre-wrap;
      overflow: auto;
      pointer-events: none;
    `;
    body.appendChild(this.errorOverlay);

    // Full-screen quad
    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.quadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    // Blank textures (1×1 transparent) — replaced when images load
    this.imageTexture = makeBlankTexture(gl);
    this.overlayTexture = makeBlankTexture(gl);
    this.terminalTexture = makeBlankTexture(gl);

    // Track mouse position relative to the terminal body
    body.addEventListener('mousemove', (e) => {
      const rect = body.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / rect.width;
      this.mouseY = 1 - (e.clientY - rect.top) / rect.height; // flip Y for GL coords
    });
  }

  // Compile and install shaders from a profile.
  // Call this whenever the profile changes (hot-reload).
  setShaders(profile: ProfileConfig): void {
    const gl = this.gl;
    const errors: string[] = [];

    // Background shader
    if (profile.background_shader?.enabled && profile.background_shader.fragment) {
      const result: CompileResult = compileShaderProgram(gl, profile.background_shader.fragment);
      if (result.error !== null) {
        errors.push(`[background_shader]\n${result.error}`);
        const fallback = compileBackgroundPassThrough(gl);
        this.bgProgram = fallback ? makeProgram(gl, fallback) : null;
      } else {
        if (this.bgProgram) gl.deleteProgram(this.bgProgram.program);
        this.bgProgram = makeProgram(gl, result.program);
      }
    } else {
      const fallback = compileBackgroundPassThrough(gl);
      this.bgProgram = fallback ? makeProgram(gl, fallback) : null;
    }

    // Post shader
    if (profile.post_shader?.enabled && profile.post_shader.fragment) {
      const result: CompileResult = compileShaderProgram(gl, profile.post_shader.fragment);
      if (result.error !== null) {
        errors.push(`[post_shader]\n${result.error}`);
        const fallback = compilePassThrough(gl);
        this.postProgram = fallback ? makeProgram(gl, fallback) : null;
      } else {
        if (this.postProgram) gl.deleteProgram(this.postProgram.program);
        this.postProgram = makeProgram(gl, result.program);
      }
    } else {
      const fallback = compilePassThrough(gl);
      this.postProgram = fallback ? makeProgram(gl, fallback) : null;
    }

    // Show/hide error overlay
    if (errors.length > 0) {
      this.errorOverlay.textContent = errors.join('\n\n') + '\n\nTerminal running with fallback rendering.';
      this.errorOverlay.style.display = 'block';
    } else {
      this.errorOverlay.style.display = 'none';
    }

    // Rebuild FBO to match current canvas size
    this.rebuildFbo();
  }

  // Load background and overlay images as textures.
  setImages(bgSrc: string, overlaySrc: string): void {
    if (bgSrc) this.loadTexture(bgSrc, (tex) => { this.imageTexture = tex; });
    if (overlaySrc) this.loadTexture(overlaySrc, (tex) => { this.overlayTexture = tex; });
  }

  private loadTexture(src: string, onLoad: (tex: WebGLTexture) => void): void {
    const gl = this.gl;
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      onLoad(tex);
    };
    img.src = src;
  }

  private rebuildFbo(): void {
    const gl = this.gl;
    const w = this.canvas.width || 1;
    const h = this.canvas.height || 1;

    if (this.bgFbo) gl.deleteFramebuffer(this.bgFbo);
    if (this.bgFboTexture) gl.deleteTexture(this.bgFboTexture);

    this.bgFboTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.bgFboTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.bgFbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bgFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.bgFboTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // Begin the render loop. getXtermCanvas provides access to the live xterm canvas.
  startRenderLoop(getXtermCanvas: () => HTMLCanvasElement | null): void {
    if (this.rafId !== null) return;
    const audio = AudioSampler.getInstance();
    // Request audio — if denied, getAmplitude() returns 0 silently
    audio.start().catch(() => {});

    const frame = () => {
      this.syncSize();
      const xtermCanvas = getXtermCanvas();
      if (xtermCanvas) this.uploadTerminalTexture(xtermCanvas);
      this.render(audio.getAmplitude());
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stopRenderLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private syncSize(): void {
    const w = this.body.clientWidth;
    const h = this.body.clientHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.rebuildFbo();
    }
  }

  private uploadTerminalTexture(xtermCanvas: HTMLCanvasElement): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.terminalTexture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, xtermCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } catch {
      // Canvas may be zero-size during startup — ignore
    }
  }

  private bindQuad(prog: CompositorProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(prog.aPosition);
    gl.vertexAttribPointer(prog.aPosition, 2, gl.FLOAT, false, 0, 0);
  }

  private setCommonUniforms(prog: CompositorProgram, audio: number): void {
    const gl = this.gl;
    const t = (performance.now() - this.startTime) / 1000;
    if (prog.uTime !== null) gl.uniform1f(prog.uTime, t);
    if (prog.uResolution !== null) gl.uniform2f(prog.uResolution, this.canvas.width, this.canvas.height);
    if (prog.uMouse !== null) gl.uniform2f(prog.uMouse, this.mouseX, this.mouseY);
    if (prog.uAudio !== null) gl.uniform1f(prog.uAudio, audio);
  }

  private render(audio: number): void {
    const gl = this.gl;

    // ── Background pass → FBO ─────────────────────────────────────────────
    if (this.bgProgram && this.bgFbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bgFbo);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.bgProgram.program);
      this.bindQuad(this.bgProgram);
      this.setCommonUniforms(this.bgProgram, audio);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
      if (this.bgProgram.uImage !== null) gl.uniform1i(this.bgProgram.uImage, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
      if (this.bgProgram.uOverlay !== null) gl.uniform1i(this.bgProgram.uOverlay, 1);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // ── Post pass → screen ────────────────────────────────────────────────
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.postProgram) {
      gl.useProgram(this.postProgram.program);
      this.bindQuad(this.postProgram);
      this.setCommonUniforms(this.postProgram, audio);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.terminalTexture);
      if (this.postProgram.uTerminal !== null) gl.uniform1i(this.postProgram.uTerminal, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.bgFboTexture ?? this.imageTexture);
      if (this.postProgram.uBackground !== null) gl.uniform1i(this.postProgram.uBackground, 1);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
      if (this.postProgram.uImage !== null) gl.uniform1i(this.postProgram.uImage, 2);

      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
      if (this.postProgram.uOverlay !== null) gl.uniform1i(this.postProgram.uOverlay, 3);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  dispose(): void {
    this.stopRenderLoop();
    const gl = this.gl;
    if (this.bgProgram) gl.deleteProgram(this.bgProgram.program);
    if (this.postProgram) gl.deleteProgram(this.postProgram.program);
    if (this.bgFbo) gl.deleteFramebuffer(this.bgFbo);
    if (this.bgFboTexture) gl.deleteTexture(this.bgFboTexture);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteTexture(this.imageTexture);
    gl.deleteTexture(this.overlayTexture);
    gl.deleteTexture(this.terminalTexture);
    if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
    if (this.errorOverlay.parentElement) this.errorOverlay.parentElement.removeChild(this.errorOverlay);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/theme/shader-compositor.ts
git commit -m "feat: add ShaderCompositor with WebGL2 two-pass pipeline and error overlay"
```

---

## Task 5: Integrate ShaderCompositor into terminal-container.ts

**Files:**
- Modify: `src/renderer/terminal/terminal-container.ts`

Wire the compositor into `applyProfile()` and `initTerminal()`. When a profile has shaders enabled, the compositor takes over visual rendering and xterm's canvas is hidden (but still rendered for texture capture). When no shaders are configured, the existing DOM-based path runs unchanged.

- [ ] **Step 1: Add compositor import and field**

At the top of `terminal-container.ts`, add the import:

```typescript
import { ShaderCompositor } from '../theme/shader-compositor.js';
```

Inside the `TerminalContainer` class body, add the field after `private termInstance`:

```typescript
private compositor: ShaderCompositor | null = null;
```

- [ ] **Step 2: Update `applyProfile()` to conditionally use the compositor**

Replace the existing `applyProfile()` method in full:

```typescript
applyProfile(profile: ProfileConfig): void {
  // Border and frame — always applied regardless of shader mode
  this.element.style.borderColor = profile.border_color || 'rgba(255,255,255,0.12)';
  this.element.style.borderWidth = `${profile.border_width ?? 1}px`;
  this.element.style.borderRadius = `${profile.border_radius ?? 8}px`;
  if (profile.box_shadow) this.element.style.boxShadow = profile.box_shadow;
  if (profile.titlebar_color) this.titlebar.setColor(profile.titlebar_color);
  if (profile.css_animation) this.element.style.animation = profile.css_animation;

  const shadersActive =
    (profile.background_shader?.enabled && !!profile.background_shader.fragment) ||
    (profile.post_shader?.enabled && !!profile.post_shader.fragment);

  if (shadersActive) {
    // ── Shader path ───────────────────────────────────────────────────────
    // Create compositor on first use
    if (!this.compositor) {
      try {
        this.compositor = new ShaderCompositor(this.body);
      } catch {
        // WebGL2 unavailable — fall through to DOM path
      }
    }

    if (this.compositor) {
      // Hide DOM bg/overlay layers — compositor handles all rendering
      this.bgLayer.style.display = 'none';
      this.overlayLayer.style.backgroundImage = '';
      // Solid background color goes on the body for the brief window before
      // the first compositor frame renders
      this.body.style.backgroundColor = profile.background?.color || '#1a1a2e';

      this.compositor.setShaders(profile);
      this.compositor.setImages(
        profile.background?.image || '',
        profile.overlay?.image || '',
      );

      // Make xterm canvas invisible but keep it rendering for texture capture
      this.xtermLayer.style.opacity = '0';

      // Wire render loop if terminal instance already exists
      if (this.termInstance) {
        this.compositor.startRenderLoop(() =>
          this.xtermLayer.querySelector('canvas') as HTMLCanvasElement | null,
        );
      }

      this.termInstance?.applyProfile(profile);
      return;
    }
  }

  // ── DOM path (no shaders or WebGL2 unavailable) ───────────────────────
  // Tear down compositor if it was previously active
  if (this.compositor) {
    this.compositor.dispose();
    this.compositor = null;
    this.xtermLayer.style.opacity = '';
    this.bgLayer.style.display = '';
  }

  this.body.style.backgroundColor = profile.background?.color || '#1a1a2e';
  this.bgLayer.style.backgroundColor = 'transparent';

  const bg = profile.background;
  if (bg?.image) {
    (this.bgImageEl as HTMLImageElement).src = bg.image;
    this.bgImageEl.style.objectFit = bg.image_size === 'contain' ? 'contain' : bg.image_size === 'cover' ? 'cover' : 'contain';
    this.bgImageEl.style.objectPosition = bg.image_position || 'center';
    this.bgImageEl.style.opacity = String(bg.image_opacity ?? 0.3);
    this.bgImageEl.style.filter = bg.image_blur ? `blur(${bg.image_blur}px)` : '';
    this.bgImageEl.style.display = '';
  } else {
    (this.bgImageEl as HTMLImageElement).src = '';
    this.bgImageEl.style.display = 'none';
  }

  const ov = profile.overlay;
  if (ov?.image) {
    this.overlayLayer.style.backgroundImage = `url("${ov.image}")`;
    this.overlayLayer.style.opacity = String(ov.opacity ?? 0.3);
  } else {
    this.overlayLayer.style.backgroundImage = '';
  }

  this.termInstance?.applyProfile(profile);
}
```

- [ ] **Step 3: Update `initTerminal()` to start the render loop when compositor is already active**

Replace the existing `initTerminal()` method:

```typescript
initTerminal(): TerminalInstance {
  this.termInstance = new TerminalInstance(this.xtermLayer);

  // If a compositor was created before the terminal instance existed,
  // start its render loop now that we have the xterm canvas.
  if (this.compositor) {
    this.compositor.startRenderLoop(() =>
      this.xtermLayer.querySelector('canvas') as HTMLCanvasElement | null,
    );
  }

  return this.termInstance;
}
```

- [ ] **Step 4: Update `dispose()` to tear down the compositor**

Replace the existing `dispose()` method:

```typescript
dispose(): void {
  this.compositor?.dispose();
  this.compositor = null;
  this.termInstance?.dispose();
  if (this.element.parentElement) {
    this.element.parentElement.removeChild(this.element);
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Build the full project**

```
npm run build
```

Expected: build completes with no errors, `dist/` populated.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/terminal/terminal-container.ts
git commit -m "feat: integrate ShaderCompositor into TerminalContainer"
```

---

## Task 6: Manual Verification in the App

**Files:** None created or modified — verification only.

- [ ] **Step 1: Launch the app**

```
npm start
```

Expected: app opens, terminals work normally (no visual regression).

- [ ] **Step 2: Add a shader to the TOML config**

Open `~/.amadeus/config.toml` and add to any profile (e.g. `default`):

```toml
[profiles.default.background_shader]
enabled = true
fragment = """
void main() {
  float scan = sin(v_uv.y * u_resolution.y * 2.0 + u_time * 3.0) * 0.03;
  fragColor = vec4(vec3(0.05 - scan), 1.0);
}
"""

[profiles.default.post_shader]
enabled = true
fragment = """
void main() {
  float offset = 0.002 * sin(u_time * 2.0);
  float r = texture(u_terminal, v_uv + vec2(offset, 0.0)).r;
  float g = texture(u_terminal, v_uv).g;
  float b = texture(u_terminal, v_uv - vec2(offset, 0.0)).b;
  float a = texture(u_terminal, v_uv).a;
  fragColor = vec4(r, g, b, a);
}
"""
```

Expected: terminal hot-reloads within 1–2 seconds, shows animated scanlines and chromatic aberration effect.

- [ ] **Step 3: Introduce a GLSL error and verify the error overlay**

Change `fragColor` to a typo like `fraColor` in either shader and save. Expected: error overlay appears on the affected terminal with the GLSL compiler message. Terminal text remains visible behind the overlay.

- [ ] **Step 4: Fix the typo and verify the overlay dismisses**

Restore the correct code and save. Expected: error overlay disappears, shader effect resumes.

- [ ] **Step 5: Disable shaders and verify fallback to DOM rendering**

Set `enabled = false` on both shaders. Expected: terminal renders with normal DOM-based background, no compositor active.

- [ ] **Step 6: Run all tests to confirm no regressions**

```
npx tsx --test tests/main/config-parser.test.ts tests/main/shader-types.test.ts tests/main/shell-registry.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: GLSL shader system complete — background and post-process shaders per profile"
```
