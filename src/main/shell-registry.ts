import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import type { ShellConfig } from '../shared/types.js';

export interface DetectedShell {
  id: string;
  name: string;
  command: string;
}

function tryExec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim();
  } catch {
    return '';
  }
}

function which(executable: string): string {
  const result = tryExec(`where ${executable}`);
  if (!result) return '';
  // `where` may return multiple lines; take the first
  return result.split('\n')[0].trim();
}

export function detectShells(): DetectedShell[] {
  const shells: DetectedShell[] = [];

  // PowerShell 7+ (pwsh)
  const pwshPath = which('pwsh.exe');
  if (pwshPath) {
    shells.push({ id: 'pwsh', name: 'PowerShell 7', command: 'pwsh.exe' });
  }

  // Legacy PowerShell 5 (powershell.exe)
  const psPath = which('powershell.exe');
  if (psPath) {
    shells.push({ id: 'powershell', name: 'PowerShell', command: 'powershell.exe' });
  }

  // CMD — always present on Windows
  shells.push({ id: 'cmd', name: 'CMD', command: 'cmd.exe' });

  // Git Bash
  const gitBashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  ];
  for (const p of gitBashPaths) {
    if (fs.existsSync(p)) {
      shells.push({ id: 'gitbash', name: 'Git Bash', command: p });
      break;
    }
  }

  // WSL distros
  const wslOutput = tryExec('wsl.exe --list --quiet');
  if (wslOutput) {
    const distros = wslOutput
      .split('\n')
      .map(line =>
        // WSL --list --quiet may output UTF-16 with null bytes; strip them
        line.replace(/\0/g, '').trim()
      )
      .filter(line => line.length > 0);

    for (const distro of distros) {
      // Normalise distro name to a safe id (lowercase, alphanumeric + dash)
      const id = `wsl-${distro.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      shells.push({ id, name: `WSL: ${distro}`, command: 'wsl.exe' });
    }
  }

  return shells;
}

export function buildShellConfigs(detected: DetectedShell[]): Record<string, ShellConfig> {
  const configs: Record<string, ShellConfig> = {};

  for (const shell of detected) {
    configs[shell.id] = {
      command: shell.command,
      args: [],
      profile: 'default',
      elevated: false,
      env: {},
    };
  }

  return configs;
}
