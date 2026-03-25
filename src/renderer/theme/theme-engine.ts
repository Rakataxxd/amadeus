import type { AmadeusConfig, ProfileConfig } from '../../shared/types.js';
import type { TerminalContainer } from '../terminal/terminal-container.js';

export class ThemeEngine {
  private config: AmadeusConfig | null = null;

  applyConfig(config: AmadeusConfig): void {
    this.config = config;
  }

  resolveProfile(shellId: string): ProfileConfig | null {
    if (!this.config) return null;

    const shell = this.config.shells[shellId];
    if (!shell) return null;

    const profileName = shell.profile || this.config.general.default_profile;
    return this.config.profiles[profileName] ?? null;
  }

  applyToContainer(container: TerminalContainer, shellId: string): void {
    const profile = this.resolveProfile(shellId);
    if (!profile) return;
    container.applyProfile(profile);
  }
}
