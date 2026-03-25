import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolvePath } from '../../src/shared/path-utils.js';

describe('resolvePath', () => {
  it('expands ~ to home directory', () => {
    const result = resolvePath('~/images/bg.png');
    assert.ok(result.startsWith(process.env.USERPROFILE || process.env.HOME || ''));
    assert.ok(result.endsWith('images/bg.png') || result.endsWith('images\\bg.png'));
  });

  it('expands %USERPROFILE% environment variable', () => {
    const result = resolvePath('%USERPROFILE%/test.png');
    assert.ok(result.startsWith(process.env.USERPROFILE || ''));
  });

  it('resolves relative paths against ~/.amadeus/', () => {
    const result = resolvePath('images/bg.png');
    const home = process.env.USERPROFILE || process.env.HOME || '';
    assert.ok(result.includes('.amadeus'));
    assert.ok(result.endsWith('images/bg.png') || result.endsWith('images\\bg.png'));
  });

  it('returns absolute paths unchanged (normalized)', () => {
    const result = resolvePath('C:/Users/test/bg.png');
    assert.strictEqual(result, 'C:\\Users\\test\\bg.png');
  });

  it('normalizes forward slashes to backslashes on Windows', () => {
    const result = resolvePath('C:/some/path/file.txt');
    assert.ok(!result.includes('/') || process.platform !== 'win32');
  });
});
