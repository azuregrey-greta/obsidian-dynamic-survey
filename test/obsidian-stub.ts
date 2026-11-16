/*
 * 测试用 Obsidian API 桩（stubs）。
 * 覆盖本插件用到的 API 面：Plugin/Modal/SuggestModal/PluginSettingTab/Notice/
 * TFile/TFolder/normalizePath/setIcon/Platform/Setting，以及一个内存版 Vault。
 * 浏览器环境下还会给 HTMLElement 补上 Obsidian 的原型助手（createEl/addClass/empty 等）。
 */

export interface AppLike { vault: Vault; workspace?: unknown; [key: string]: unknown }
export type App = AppLike;
export interface PluginManifest { id: string; name: string; version: string; [key: string]: unknown }
export interface Component { load(): Promise<void>; unload(): Promise<void> }

/* ------------------------------------------------------------------ */
/* Notice                                                              */
/* ------------------------------------------------------------------ */

export const noticeLog: Array<{ message: string; ttl: number | undefined }> = [];

export class Notice {
  message: string;
  constructor(message: string | DocumentFragment, public ttl?: number) {
    this.message = typeof message === "string" ? message : (message as DocumentFragment).textContent ?? "";
    noticeLog.push({ message: this.message, ttl });
    if (typeof document !== "undefined") {
      const toast = document.createElement("div");
      toast.className = "notice-container";
      toast.textContent = this.message;
      document.body.appendChild(toast);
      window.setTimeout(() => toast.remove(), ttl ?? 4000);
    }
  }
  hide(): void {}
}

/* ------------------------------------------------------------------ */
/* Vault / TFile / TFolder                                             */
/* ------------------------------------------------------------------ */

export class TAbstractFile {
  vault!: Vault;
  path = "";
  name = "";
  parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
  basename = "";
  extension = "md";
  stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
  isRoot(): boolean { return this.path === "/"; }
}

export function normalizePath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(p => p.length > 0 && p !== ".");
  return parts.join("/");
}

/** 内存版 Vault：行为对齐 Obsidian 官方 API（create 已存在时抛错等）。 */
export class Vault {
  private files = new Map<string, TAbstractFile>();
  private contents = new Map<string, string>();
  adapter = { path: "" };

  getAbstractFileByPath(path: string): TAbstractFile | null {
    return this.files.get(normalizePath(path)) ?? null;
  }
  async createFolder(path: string): Promise<TFolder> {
    path = normalizePath(path);
    if (this.files.has(path)) throw new Error("createFolder: folder already exists: " + path);
    // 与真实 vault 一致：中间目录一并创建。
    const segments = path.split("/");
    let current = "";
    let created: TFolder | null = null;
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (this.files.has(current)) continue;
      const folder = new TFolder();
      folder.vault = this; folder.path = current; folder.name = segment;
      this.files.set(current, folder); this.linkParent(current, folder);
      created = folder;
    }
    return created!;
  }
  async create(path: string, content: string): Promise<TFile> {
    path = normalizePath(path);
    if (this.files.has(path)) throw new Error("create: file already exists: " + path);
    const file = new TFile();
    file.vault = this; file.path = path; file.name = path.split("/").pop()!;
    file.basename = file.name.replace(/\.[^.]+$/, ""); file.extension = file.name.includes(".") ? file.name.split(".").pop()! : "md";
    this.files.set(path, file); this.linkParent(path, file);
    this.contents.set(path, content);
    return file;
  }
  async modify(file: TFile, content: string): Promise<void> {
    this.contents.set(normalizePath(file.path), content);
  }
  async append(file: TFile, content: string): Promise<void> {
    const path = normalizePath(file.path);
    this.contents.set(path, (this.contents.get(path) ?? "") + content);
  }
  async read(file: TFile): Promise<string> {
    return this.contents.get(normalizePath(file.path)) ?? "";
  }
  async process(file: TFile, fn: (content: string) => string): Promise<string> {
    const next = fn(await this.read(file));
    await this.modify(file, next);
    return next;
  }
  /* 测试辅助 */
  getContent(path: string): string { return this.contents.get(normalizePath(path)) ?? ""; }
  paths(): string[] { return [...this.files.keys()].sort(); }
  dump(): Record<string, string> { return Object.fromEntries([...this.contents.entries()].sort()); }
  private linkParent(path: string, node: TAbstractFile): void {
    const idx = path.lastIndexOf("/");
    if (idx <= 0) return;
    const parent = this.files.get(path.slice(0, idx));
    if (parent instanceof TFolder) { node.parent = parent; parent.children.push(node); }
  }
}

/* ------------------------------------------------------------------ */
/* Platform                                                            */
/* ------------------------------------------------------------------ */

export const Platform = {
  isMobile: false,
  isDesktop: true,
  isMobileApp: false,
  isDesktopApp: true,
  isIosApp: false,
  isAndroidApp: false,
};

/* ------------------------------------------------------------------ */
/* UI：Modal / SuggestModal / Setting / setIcon                        */
/* ------------------------------------------------------------------ */

function createElementHelper(parent: HTMLElement, tag: string, o?: { cls?: string; text?: string; type?: string; attr?: Record<string, string | number> }): HTMLElement {
  const el = document.createElement(tag);
  if (o?.type && tag === "input") (el as HTMLInputElement).type = String(o.type);
  if (o?.cls) el.className = o.cls;
  if (o?.text != null) el.textContent = o.text;
  if (o?.attr) for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, String(v));
  parent.appendChild(el);
  return el;
}

if (typeof HTMLElement !== "undefined") {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  if (!proto.createEl) {
    proto.createDiv = function (this: HTMLElement, o?: { cls?: string; text?: string; type?: string; attr?: Record<string, string | number> }) { return createElementHelper(this, "div", o); };
    proto.createSpan = function (this: HTMLElement, o?: { cls?: string; text?: string; type?: string; attr?: Record<string, string | number> }) { return createElementHelper(this, "span", o); };
    proto.createEl = function (this: HTMLElement, tag: string, o?: { cls?: string; text?: string; type?: string; attr?: Record<string, string | number> }) { return createElementHelper(this, tag, o); };
    proto.addClass = function (this: HTMLElement, c: string) { this.classList.add(c); };
    proto.removeClass = function (this: HTMLElement, c: string) { this.classList.remove(c); };
    proto.toggleClass = function (this: HTMLElement, c: string, value?: boolean) { this.classList.toggle(c, value); };
    proto.empty = function (this: HTMLElement) { this.replaceChildren(); };
    proto.setText = function (this: HTMLElement, t: string) { this.textContent = t; };
  }
}

export class Scope {
  register(_key: unknown, _evt: unknown, _fn: unknown): void {}
}

export class Modal {
  app: App;
  containerEl: HTMLElement;
  modalEl: HTMLElement;
  contentEl: HTMLElement;
  titleEl: HTMLElement;
  scope = new Scope();
  constructor(app: App) {
    this.app = app;
    if (typeof document === "undefined") return;
    this.containerEl = document.createElement("div"); this.containerEl.className = "modal-container";
    const bg = document.createElement("div"); bg.className = "modal-bg"; this.containerEl.appendChild(bg);
    this.modalEl = document.createElement("div"); this.modalEl.className = "modal";
    this.titleEl = document.createElement("div"); this.titleEl.className = "modal-title"; this.modalEl.appendChild(this.titleEl);
    this.contentEl = document.createElement("div"); this.contentEl.className = "modal-content";
    this.modalEl.appendChild(this.contentEl);
    this.containerEl.appendChild(this.modalEl);
  }
  open(): void { if (typeof document !== "undefined") { document.body.appendChild(this.containerEl); } this.onOpen(); }
  close(): void { if (typeof document !== "undefined") { this.containerEl.remove(); } this.onClose(); }
  onOpen(): void {}
  onClose(): void {}
}

export abstract class SuggestModal<T> extends Modal {
  placeholder = "";
  setPlaceholder(text: string): this { this.placeholder = text; return this; }
  abstract getSuggestions(query: string): T[];
  abstract renderSuggestion(value: T, el: HTMLElement): void;
  abstract onChooseSuggestion(value: T, evt: MouseEvent | KeyboardEvent): void;
}

export class PluginSettingTab {
  app: App;
  containerEl: HTMLElement;
  constructor(app: App, _plugin: unknown) {
    this.app = app;
    this.containerEl = (typeof document !== "undefined"
      ? document.createElement("div")
      : { className: "", style: {}, createEl: () => ({}) as HTMLElement, createDiv: () => ({}) as HTMLElement, empty: () => {} }) as unknown as HTMLElement;
    this.containerEl.className = "plugin-settings";
  }
  display(): void {}
  hide(): void {}
}

export function setIcon(el: HTMLElement, _iconId: string): void { el.innerHTML = '<svg width="16" height="16" viewBox="0 0 100 100" class="svg-icon"></svg>'; }

/* Setting（设置面板行控件，仅覆盖插件用到的链式 API） */
export class ExtraButtonComponent { constructor() {} setIcon(_i: string): this { return this; } setTooltip(_t: string): this { return this; } onClick(_fn: () => void): this { return this; } }
export class ButtonComponent {
  el = document.createElement("button");
  private handler?: () => void;
  setButtonText(t: string): this { this.el.textContent = t; return this; }
  setCta(): this { this.el.classList.add("mod-cta"); return this; }
  setWarning(): this { this.el.classList.add("mod-warning"); return this; }
  onClick(fn: () => void): this { this.handler = fn; this.el.addEventListener("click", () => this.handler?.()); return this; }
  /** 测试辅助：模拟点击 */
  simulateClick(): void { this.el.click(); }
}
export class Setting {
  settingEl: HTMLElement; nameEl: HTMLElement; descEl: HTMLElement; controlEl: HTMLElement;
  constructor(containerEl: HTMLElement) {
    this.settingEl = containerEl.createDiv({ cls: "setting-item" });
    const info = this.settingEl.createDiv({ cls: "setting-item-info" });
    this.nameEl = info.createDiv({ cls: "setting-item-name" });
    this.descEl = info.createDiv({ cls: "setting-item-description" });
    this.controlEl = this.settingEl.createDiv({ cls: "setting-item-control" });
  }
  setName(t: string | DocumentFragment): this { this.nameEl.textContent = typeof t === "string" ? t : t.textContent; return this; }
  setDesc(t: string | DocumentFragment): this { this.descEl.textContent = typeof t === "string" ? t : t.textContent; return this; }
  addButton(cb: (b: ButtonComponent) => unknown): this { const b = new ButtonComponent(); void cb(b); this.controlEl.appendChild(b.el); return this; }
  addExtraButton(cb: (b: ExtraButtonComponent) => unknown): this { void cb(new ExtraButtonComponent()); return this; }
}

/* ------------------------------------------------------------------ */
/* Plugin 基类                                                         */
/* ------------------------------------------------------------------ */

export interface CommandLike { id: string; name: string; callback?: () => void; checkCallback?: (checking: boolean) => boolean | void }

export class Plugin implements Component {
  app: App;
  manifest: PluginManifest;
  commands: CommandLike[] = [];
  settingTabs: PluginSettingTab[] = [];
  constructor(app: App, manifest?: PluginManifest) {
    this.app = app;
    this.manifest = manifest ?? ({ id: "dynamic-survey", name: "Dynamic Survey", version: "0.1.0" } as PluginManifest);
  }
  async loadData(): Promise<unknown> { return this._data; }
  async saveData(data: unknown): Promise<void> { this._data = typeof structuredClone === "function" ? structuredClone(data) : JSON.parse(JSON.stringify(data)); }
  private _data: unknown = null;
  addCommand(cmd: CommandLike): CommandLike { this.commands.push(cmd); return cmd; }
  addSettingTab(tab: PluginSettingTab): void { this.settingTabs.push(tab); }
  addRibbonIcon(): unknown { return null; }
  registerEvent(_ref: EventRef): void {}
  registerDomEvent(): void {}
  registerInterval(id: number): number { return id; }
  registerMarkdownPostProcessor(): void {}
  onExternalSettingsChange(): Promise<void> {}
  onUnload(): Promise<void> {}
  load(): Promise<void> {}
  unload(): Promise<void> {}
  onload(): Promise<void> | void {}
}

/* 供浏览器测试台把窗口 app 关联到全局，模拟 Obsidian 的 app.emulateMobile */
export function installGlobalApp(app: App & { emulateMobile?: (mobile: boolean) => void }): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>).app = app;
  app.emulateMobile = (mobile: boolean) => {
    Platform.isMobile = mobile;
    Platform.isDesktop = !mobile;
    Platform.isMobileApp = mobile;
    Platform.isDesktopApp = !mobile;
    document.body.classList.toggle("is-mobile", mobile);
    document.body.classList.toggle("is-phone", mobile);
  };
}

/* 未使用但保持类型面完整的占位导出 */
export type Debouncer = unknown;
export type EventRef = unknown;
export type RequestUrlParam = unknown;
export type RequestUrlResponse = unknown;
