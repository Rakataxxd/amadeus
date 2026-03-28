export class WorkspaceManager {
  private workspaces: Map<number, HTMLElement> = new Map();
  private activeId = 0;
  private nextId = 1;
  private canvasEl: HTMLElement;
  private tabsContainer: HTMLElement;

  onTabChanged: (tabId: number) => void = () => {};

  constructor(canvasEl: HTMLElement, tabsContainer: HTMLElement) {
    this.canvasEl = canvasEl;
    this.tabsContainer = tabsContainer;
    // Create initial workspace
    this.createWorkspace();
  }

  createWorkspace(): number {
    const id = this.nextId++;
    const workspace = document.createElement('div');
    workspace.className = 'workspace';
    workspace.dataset['workspaceId'] = String(id);
    workspace.style.display = 'none'; // hidden by default
    workspace.style.position = 'relative';
    workspace.style.width = '100%';
    workspace.style.height = '100%';
    this.canvasEl.appendChild(workspace);
    this.workspaces.set(id, workspace);

    // Add tab
    this.addTab(id);

    // Switch to it
    this.switchTo(id);

    return id;
  }

  private addTab(id: number): void {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset['tab'] = String(id);

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = `Workspace ${id}`;

    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWorkspace(id);
    });

    tab.appendChild(label);
    tab.appendChild(closeBtn);

    tab.addEventListener('click', () => this.switchTo(id));

    // Double-click on tab to rename inline
    tab.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.startInlineRename(label);
    });

    this.tabsContainer.appendChild(tab);
    this.updateCloseBtnVisibility();
  }

  switchTo(id: number): void {
    // Hide all
    for (const [wId, ws] of this.workspaces) {
      ws.style.display = wId === id ? '' : 'none';
    }
    this.activeId = id;

    // Update tab active class
    this.tabsContainer.querySelectorAll('.tab').forEach(tab => {
      const el = tab as HTMLElement;
      el.classList.toggle('active', el.dataset['tab'] === String(id));
    });

    this.onTabChanged(id);
  }

  closeWorkspace(id: number): void {
    if (this.workspaces.size <= 1) return; // can't close last tab

    const ws = this.workspaces.get(id);
    if (ws) {
      ws.remove();
      this.workspaces.delete(id);
    }

    // Remove tab
    const tab = this.tabsContainer.querySelector(`[data-tab="${id}"]`);
    if (tab) tab.remove();

    // Switch to another tab if this was active
    if (this.activeId === id) {
      const firstId = this.workspaces.keys().next().value as number | undefined;
      if (firstId !== undefined) this.switchTo(firstId);
    }

    this.updateCloseBtnVisibility();
  }

  getActiveWorkspace(): HTMLElement | null {
    return this.workspaces.get(this.activeId) || null;
  }

  getActiveId(): number {
    return this.activeId;
  }

  getWorkspaceById(id: number): HTMLElement | null {
    return this.workspaces.get(id) || null;
  }

  /** Inline rename: replace label with an input field */
  private startInlineRename(label: HTMLElement): void {
    const currentName = label.textContent || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-rename-input';
    input.value = currentName;
    input.maxLength = 30;

    const commit = () => {
      const newName = input.value.trim() || currentName;
      label.textContent = newName;
      label.style.display = '';
      input.remove();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    });
    // Prevent tab click from firing while renaming
    input.addEventListener('click', (e) => e.stopPropagation());

    label.style.display = 'none';
    label.parentElement!.insertBefore(input, label);
    input.focus();
    input.select();
  }

  /** Get session state for persistence */
  getSessionState(): { workspaces: { id: number; name: string }[]; activeId: number } {
    const workspaces: { id: number; name: string }[] = [];
    this.tabsContainer.querySelectorAll('.tab').forEach(tab => {
      const el = tab as HTMLElement;
      const id = parseInt(el.dataset['tab'] || '0');
      const label = el.querySelector('.tab-label') as HTMLElement;
      workspaces.push({ id, name: label?.textContent || `Workspace ${id}` });
    });
    return { workspaces, activeId: this.activeId };
  }

  /** Restore workspaces from saved session (call BEFORE creating terminals) */
  restoreWorkspaces(state: { workspaces: { id: number; name: string }[]; activeId: number }): Map<number, number> {
    // Map from old workspace id -> new workspace id
    const idMap = new Map<number, number>();

    // Remove the default workspace that was created in constructor
    const defaultId = this.activeId;
    const defaultWs = this.workspaces.get(defaultId);
    if (defaultWs) { defaultWs.remove(); this.workspaces.delete(defaultId); }
    const defaultTab = this.tabsContainer.querySelector(`[data-tab="${defaultId}"]`);
    if (defaultTab) defaultTab.remove();

    // Create workspaces from saved state
    for (const ws of state.workspaces) {
      const id = this.nextId++;
      const workspace = document.createElement('div');
      workspace.className = 'workspace';
      workspace.dataset['workspaceId'] = String(id);
      workspace.style.display = 'none';
      workspace.style.position = 'relative';
      workspace.style.width = '100%';
      workspace.style.height = '100%';
      this.canvasEl.appendChild(workspace);
      this.workspaces.set(id, workspace);
      this.addTabWithName(id, ws.name);
      idMap.set(ws.id, id);
    }

    // Switch to the previously active workspace
    const newActiveId = idMap.get(state.activeId) ?? this.workspaces.keys().next().value as number;
    this.switchTo(newActiveId);
    this.updateCloseBtnVisibility();

    return idMap;
  }

  private addTabWithName(id: number, name: string): void {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset['tab'] = String(id);

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = name;

    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWorkspace(id);
    });

    tab.appendChild(label);
    tab.appendChild(closeBtn);
    tab.addEventListener('click', () => this.switchTo(id));
    tab.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.startInlineRename(label);
    });

    this.tabsContainer.appendChild(tab);
  }

  /** Hide close buttons when only one tab remains */
  private updateCloseBtnVisibility(): void {
    const tabs = this.tabsContainer.querySelectorAll('.tab');
    const onlyOne = tabs.length <= 1;
    tabs.forEach(tab => {
      const btn = tab.querySelector('.tab-close') as HTMLElement | null;
      if (btn) btn.style.visibility = onlyOne ? 'hidden' : '';
    });
  }
}
