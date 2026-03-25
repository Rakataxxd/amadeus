export interface AmadeusConfig {
  version: number;
  general: GeneralConfig;
  canvas: CanvasConfig;
  shells: Record<string, ShellConfig>;
  profiles: Record<string, ProfileConfig>;
  keybindings: KeybindingConfig;
  layouts: Record<string, LayoutConfig>;
}

export interface GeneralConfig {
  default_shell: string;
  default_profile: string;
  start_layout: string;
}

export interface CanvasConfig {
  snap_enabled: boolean;
  snap_threshold: number;
  snap_to_grid: boolean;
  grid_size: number;
}

export interface ShellConfig {
  command: string;
  args: string[];
  profile: string;
  elevated: boolean;
  env: Record<string, string>;
}

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
}

export interface BackgroundConfig {
  color: string;
  image: string;
  image_opacity: number;
  image_blur: number;
  image_size: string;
  image_position: string;
  image_draggable: boolean;
}

export interface OverlayConfig {
  image: string;
  opacity: number;
}

export interface KeybindingConfig {
  new_terminal: string;
  close_terminal: string;
  next_terminal: string;
  prev_terminal: string;
  save_layout: string;
  load_layout: string;
  fullscreen: string;
  reload_config: string;
  copy: string;
  paste: string;
}

export interface LayoutConfig {
  terminals: LayoutTerminal[];
}

export interface LayoutTerminal {
  shell: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  bg_offset_x: number;
  bg_offset_y: number;
  bg_scale: number;
}

export interface ShellInfo {
  id: string;
  name: string;
  command: string;
  elevated: boolean;
  profile: string;
}

export interface TerminalInfo {
  terminalId: string;
  shellId: string;
  pid: number;
  elevated: boolean;
}
