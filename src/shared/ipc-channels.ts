export const IPC = {
  PTY_CREATE: 'pty:create',
  PTY_CREATED: 'pty:created',
  PTY_DATA: 'pty:data',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_CLOSE: 'pty:close',
  PTY_EXITED: 'pty:exited',
  CONFIG_UPDATED: 'config:updated',
  CONFIG_GET: 'config:get',
  CONFIG_CURRENT: 'config:current',
  LAYOUT_SAVE: 'layout:save',
  LAYOUT_LOAD: 'layout:load',
  LAYOUT_DATA: 'layout:data',
  SHELL_LIST: 'shell:list',
  SHELL_AVAILABLE: 'shell:available',
  ERROR: 'error',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];
