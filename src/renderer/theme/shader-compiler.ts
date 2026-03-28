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
