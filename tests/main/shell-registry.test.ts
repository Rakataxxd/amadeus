import { describe, it } from 'node:test';
import assert from 'node:assert';
import { detectShells, buildShellConfigs } from '../../src/main/shell-registry.js';

describe('detectShells', () => {
  it('returns an array', () => {
    const shells = detectShells();
    assert.ok(Array.isArray(shells));
  });

  it('each entry has id, name, and command', () => {
    const shells = detectShells();
    for (const shell of shells) {
      assert.ok(typeof shell.id === 'string' && shell.id.length > 0, `id missing on ${JSON.stringify(shell)}`);
      assert.ok(typeof shell.name === 'string' && shell.name.length > 0, `name missing on ${JSON.stringify(shell)}`);
      assert.ok(typeof shell.command === 'string' && shell.command.length > 0, `command missing on ${JSON.stringify(shell)}`);
    }
  });

  it('always includes cmd', () => {
    const shells = detectShells();
    const cmd = shells.find(s => s.id === 'cmd');
    assert.ok(cmd !== undefined, 'cmd should always be present');
    assert.strictEqual(cmd.command, 'cmd.exe');
  });

  it('ids are unique', () => {
    const shells = detectShells();
    const ids = shells.map(s => s.id);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length, 'all ids should be unique');
  });
});

describe('buildShellConfigs', () => {
  it('converts detected shells to ShellConfig record', () => {
    const detected = [
      { id: 'cmd', name: 'CMD', command: 'cmd.exe' },
      { id: 'pwsh', name: 'PowerShell 7', command: 'pwsh.exe' },
    ];
    const configs = buildShellConfigs(detected);
    assert.ok(typeof configs === 'object' && configs !== null);
    assert.ok('cmd' in configs);
    assert.ok('pwsh' in configs);
  });

  it('each ShellConfig has required fields', () => {
    const detected = [{ id: 'cmd', name: 'CMD', command: 'cmd.exe' }];
    const configs = buildShellConfigs(detected);
    const cfg = configs['cmd'];
    assert.ok(cfg !== undefined);
    assert.strictEqual(typeof cfg.command, 'string');
    assert.ok(Array.isArray(cfg.args));
    assert.strictEqual(typeof cfg.profile, 'string');
    assert.strictEqual(typeof cfg.elevated, 'boolean');
    assert.ok(typeof cfg.env === 'object' && cfg.env !== null);
  });

  it('returns empty object for empty input', () => {
    const configs = buildShellConfigs([]);
    assert.deepStrictEqual(configs, {});
  });
});
