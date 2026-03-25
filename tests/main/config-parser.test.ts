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
    assert.strictEqual(config.canvas.snap_enabled, true);
    assert.ok(config.keybindings.new_terminal);
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
