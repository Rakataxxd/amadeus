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
