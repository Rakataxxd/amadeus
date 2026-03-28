import { compileShaderProgram, compilePassThrough, compileBackgroundPassThrough } from './shader-compiler.js';
import type { CompileResult } from './shader-compiler.js';
import { AudioSampler } from './audio-sampler.js';
import type { ProfileConfig } from '../../shared/types.js';

interface CompositorProgram {
  program: WebGLProgram;
  aPosition: number;
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

  private bgProgram: CompositorProgram | null = null;
  private bgFbo: WebGLFramebuffer | null = null;
  private bgFboTexture: WebGLTexture | null = null;

  private postProgram: CompositorProgram | null = null;

  private imageTexture: WebGLTexture;
  private overlayTexture: WebGLTexture;
  private terminalTexture: WebGLTexture;

  private rafId: number | null = null;
  private startTime = performance.now();

  private mouseX = 0;
  private mouseY = 0;

  constructor(private body: HTMLElement) {
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

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.quadBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    this.imageTexture = makeBlankTexture(gl);
    this.overlayTexture = makeBlankTexture(gl);
    this.terminalTexture = makeBlankTexture(gl);

    body.addEventListener('mousemove', (e) => {
      const rect = body.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / rect.width;
      this.mouseY = 1 - (e.clientY - rect.top) / rect.height;
    });
  }

  setShaders(profile: ProfileConfig): void {
    const gl = this.gl;
    const errors: string[] = [];

    if (profile.background_shader?.enabled && profile.background_shader.fragment) {
      const result: CompileResult = compileShaderProgram(gl, profile.background_shader.fragment);
      if (result.error !== null) {
        errors.push(`[background_shader]\n${result.error}`);
        if (this.bgProgram) gl.deleteProgram(this.bgProgram.program);
        const fallback = compileBackgroundPassThrough(gl);
        this.bgProgram = fallback ? makeProgram(gl, fallback) : null;
      } else {
        if (this.bgProgram) gl.deleteProgram(this.bgProgram.program);
        this.bgProgram = makeProgram(gl, result.program);
      }
    } else {
      if (this.bgProgram) gl.deleteProgram(this.bgProgram.program);
      const fallback = compileBackgroundPassThrough(gl);
      this.bgProgram = fallback ? makeProgram(gl, fallback) : null;
    }

    if (profile.post_shader?.enabled && profile.post_shader.fragment) {
      const result: CompileResult = compileShaderProgram(gl, profile.post_shader.fragment);
      if (result.error !== null) {
        errors.push(`[post_shader]\n${result.error}`);
        if (this.postProgram) gl.deleteProgram(this.postProgram.program);
        const fallback = compilePassThrough(gl);
        this.postProgram = fallback ? makeProgram(gl, fallback) : null;
      } else {
        if (this.postProgram) gl.deleteProgram(this.postProgram.program);
        this.postProgram = makeProgram(gl, result.program);
      }
    } else {
      if (this.postProgram) gl.deleteProgram(this.postProgram.program);
      const fallback = compilePassThrough(gl);
      this.postProgram = fallback ? makeProgram(gl, fallback) : null;
    }

    if (errors.length > 0) {
      this.errorOverlay.textContent = errors.join('\n\n') + '\n\nTerminal running with fallback rendering.';
      this.errorOverlay.style.display = 'block';
    } else {
      this.errorOverlay.style.display = 'none';
    }

    this.rebuildFbo();
  }

  setImages(bgSrc: string, overlaySrc: string): void {
    if (bgSrc) this.loadTexture(bgSrc, this.imageTexture, (tex) => { this.imageTexture = tex; });
    if (overlaySrc) this.loadTexture(overlaySrc, this.overlayTexture, (tex) => { this.overlayTexture = tex; });
  }

  private loadTexture(src: string, oldTexture: WebGLTexture, onLoad: (tex: WebGLTexture) => void): void {
    const gl = this.gl;
    const img = new Image();
    img.onload = () => {
      gl.deleteTexture(oldTexture);
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

  startRenderLoop(getXtermCanvas: () => HTMLCanvasElement | null): void {
    if (this.rafId !== null) return;
    const audio = AudioSampler.getInstance();
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
