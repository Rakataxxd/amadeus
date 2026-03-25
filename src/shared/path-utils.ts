import * as path from 'path';
import * as os from 'os';

export function resolvePath(inputPath: string): string {
  let resolved = inputPath;

  // Expand ~
  if (resolved.startsWith('~')) {
    resolved = path.join(os.homedir(), resolved.slice(1));
  }

  // Expand %ENV_VAR%
  resolved = resolved.replace(/%([^%]+)%/g, (_, varName) => {
    return process.env[varName] || `%${varName}%`;
  });

  // Resolve relative paths against ~/.amadeus/
  if (!path.isAbsolute(resolved)) {
    resolved = path.join(os.homedir(), '.amadeus', resolved);
  }

  // Normalize separators
  return path.normalize(resolved);
}
