var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  default: () => DynamicSurveyPlugin2
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/SurveyWizardModal.ts
var import_obsidian = require("obsidian");
var SurveyWizardModal = class extends import_obsidian.Modal {
  constructor(app, survey, onSubmit) {
    super(app);
    this.survey = survey;
    this.onSubmit = onSubmit;
    this.index = 0;
    this.answers = {};
    this.saving = false;
    this.timer = null;
    this.modalEl.addClass("dynamic-survey-modal");
  }
  onOpen() {
    this.scope.register(["Mod"], "Enter", () => {
      void this.next();
      return false;
    });
    this.render();
  }
  onClose() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.contentEl.empty();
  }
  render() {
    this.contentEl.empty();
    this.contentEl.scrollTop = 0;
    const q = this.survey.questions[this.index];
    if (!q) {
      new import_obsidian.Notice("\u95EE\u5377\u914D\u7F6E\u9519\u8BEF\uFF1A\u627E\u4E0D\u5230\u5F53\u524D\u9898\u76EE\u3002");
      this.close();
      return;
    }
    const header = this.contentEl.createDiv({ cls: "dynamic-survey-header" });
    const row = header.createDiv({ cls: "dynamic-survey-header-row" });
    row.createSpan({ text: this.survey.name, cls: "dynamic-survey-name" });
    row.createSpan({ text: `${this.index + 1} / ${this.survey.questions.length}`, cls: "dynamic-survey-progress-text" });
    const track = header.createDiv({ cls: "dynamic-survey-progress-track" });
    track.createDiv({ cls: "dynamic-survey-progress-bar" }).style.width = `${(this.index + 1) / this.survey.questions.length * 100}%`;
    const titleRow = this.contentEl.createDiv({ cls: "dynamic-survey-question-title-row" });
    titleRow.createEl("h2", { text: q.label });
    if (q.required) titleRow.createSpan({ text: "\u5FC5\u586B", cls: "dynamic-survey-required-badge" });
    if (q.description) this.contentEl.createEl("p", { text: q.description, cls: "dynamic-survey-description" });
    const body = this.contentEl.createDiv({ cls: "dynamic-survey-input-container" });
    if (q.type === "single") this.renderSingle(body, q);
    else if (q.type === "multiple") this.renderMultiple(body, q);
    else this.renderText(body, q, q.type === "textarea");
    this.renderFooter();
  }
  renderSingle(el, q) {
    const options = el.createDiv({ cls: "dynamic-survey-options" });
    for (const option of this.options(q)) {
      const button = options.createEl("button", { text: option.label, cls: "dynamic-survey-option-card", attr: { type: "button" } });
      if (this.answers[q.id] === option.value) button.addClass("is-selected");
      button.addEventListener("click", () => {
        this.answers[q.id] = option.value;
        options.querySelectorAll("button").forEach((x) => x.removeClass("is-selected"));
        button.addClass("is-selected");
        if (q.autoAdvance !== false) this.timer = window.setTimeout(() => {
          this.timer = null;
          void this.next();
        }, 180);
      });
    }
  }
  renderMultiple(el, q) {
    const selected = new Set(Array.isArray(this.answers[q.id]) ? this.answers[q.id] : Array.isArray(q.defaultValue) ? q.defaultValue : []);
    this.answers[q.id] = [...selected];
    const options = el.createDiv({ cls: "dynamic-survey-options" });
    for (const option of this.options(q)) {
      const label = options.createEl("label", { cls: "dynamic-survey-option-card" });
      const input = label.createEl("input", { type: "checkbox" });
      input.checked = selected.has(option.value);
      label.createSpan({ text: option.label });
      input.addEventListener("change", () => {
        input.checked ? selected.add(option.value) : selected.delete(option.value);
        this.answers[q.id] = [...selected];
      });
    }
  }
  renderText(el, q, multiline) {
    var _a, _b;
    const isLast = this.index === this.survey.questions.length - 1;
    const input = multiline ? el.createEl("textarea", { cls: "dynamic-survey-textarea", attr: { rows: "10", placeholder: (_a = q.placeholder) != null ? _a : "" } }) : el.createEl("input", { type: "text", cls: "dynamic-survey-text-input", attr: { placeholder: (_b = q.placeholder) != null ? _b : "", enterkeyhint: isLast ? "done" : "next" } });
    const current = this.answers[q.id];
    input.value = typeof current === "string" ? current : typeof q.defaultValue === "string" ? q.defaultValue : "";
    this.answers[q.id] = input.value;
    input.addEventListener("input", () => {
      this.answers[q.id] = input.value;
    });
    if (!multiline) input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        void this.next();
      }
    });
    if (!import_obsidian.Platform.isMobile) window.setTimeout(() => input.focus(), 0);
  }
  renderFooter() {
    const footer = this.contentEl.createDiv({ cls: "dynamic-survey-footer" });
    const back = footer.createEl("button", { attr: { type: "button" } });
    const icon = back.createSpan();
    (0, import_obsidian.setIcon)(icon, "arrow-left");
    back.createSpan({ text: "\u4E0A\u4E00\u6B65" });
    back.disabled = this.index === 0 || this.saving;
    back.addEventListener("click", () => {
      if (this.index > 0) {
        this.index--;
        this.render();
      }
    });
    const last = this.index === this.survey.questions.length - 1;
    const forward = footer.createEl("button", { text: last ? "\u5B8C\u6210\u5E76\u4FDD\u5B58" : "\u4E0B\u4E00\u6B65", cls: "mod-cta", attr: { type: "button" } });
    forward.disabled = this.saving;
    forward.addEventListener("click", () => void this.next());
  }
  async next() {
    if (this.saving) return;
    const q = this.survey.questions[this.index];
    const answer = this.answers[q.id];
    const empty = answer == null || typeof answer === "string" && !answer.trim() || Array.isArray(answer) && answer.length === 0;
    if (q.required && empty) {
      new import_obsidian.Notice(`\u8BF7\u5148\u56DE\u7B54\u201C${q.label}\u201D\u3002`);
      return;
    }
    if (this.index < this.survey.questions.length - 1) {
      this.index++;
      this.render();
      return;
    }
    this.saving = true;
    this.render();
    try {
      await this.onSubmit(structuredClone(this.answers));
      this.close();
    } catch (e) {
      this.saving = false;
      this.render();
    }
  }
  options(q) {
    var _a;
    return ((_a = q.options) != null ? _a : []).map((x) => typeof x === "string" ? { label: x, value: x } : x);
  }
};

// src/SurveyFileWriter.ts
var import_obsidian2 = require("obsidian");
var SurveyFileWriter = class {
  constructor(app) {
    this.app = app;
  }
  async write(folder, fileName, content, collisionMode) {
    const safeFolder = this.normalizeFolder(folder);
    const safeName = this.sanitizeFileName(fileName);
    const initialPath = (0, import_obsidian2.normalizePath)(safeFolder ? `${safeFolder}/${safeName}.md` : `${safeName}.md`);
    await this.ensureFolders(safeFolder);
    const existing = this.app.vault.getAbstractFileByPath(initialPath);
    if (existing instanceof import_obsidian2.TFolder) throw new Error(`\u76EE\u6807\u8DEF\u5F84\u201C${initialPath}\u201D\u662F\u6587\u4EF6\u5939\u3002`);
    if (existing instanceof import_obsidian2.TFile) {
      if (collisionMode === "overwrite") {
        await this.app.vault.modify(existing, content);
        return existing;
      }
      if (collisionMode === "append") {
        await this.app.vault.append(existing, `

${content}`);
        return existing;
      }
      const uniquePath = this.nextAvailablePath(safeFolder, safeName);
      return this.app.vault.create(uniquePath, content);
    }
    return this.app.vault.create(initialPath, content);
  }
  normalizeFolder(folder) {
    const value = (0, import_obsidian2.normalizePath)((folder != null ? folder : "").trim()).replace(/^\/+|\/+$/g, "");
    if (value === ".") return "";
    if (value === ".." || value.startsWith("../") || value.includes("/../")) throw new Error("\u76EE\u6807\u6587\u4EF6\u5939\u4E0D\u80FD\u5305\u542B\u4E0A\u7EA7\u76EE\u5F55\u8DEF\u5F84\u3002 ");
    return value;
  }
  sanitizeFileName(name) {
    const value = name.replace(/[\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().replace(/\.+$/g, "");
    if (!value) throw new Error("\u751F\u6210\u7684\u7B14\u8BB0\u540D\u4E3A\u7A7A\u3002 ");
    return value;
  }
  async ensureFolders(folder) {
    if (!folder) return;
    let current = "";
    for (const part of folder.split("/")) {
      current = current ? `${current}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (existing instanceof import_obsidian2.TFile) throw new Error(`\u65E0\u6CD5\u521B\u5EFA\u6587\u4EF6\u5939\u201C${current}\u201D\uFF0C\u56E0\u4E3A\u540C\u540D\u6587\u4EF6\u5DF2\u5B58\u5728\u3002`);
      if (!existing) await this.app.vault.createFolder(current);
    }
  }
  nextAvailablePath(folder, baseName) {
    for (let i = 2; i <= 9999; i++) {
      const path = (0, import_obsidian2.normalizePath)(folder ? `${folder}/${baseName} (${i}).md` : `${baseName} (${i}).md`);
      if (!this.app.vault.getAbstractFileByPath(path)) return path;
    }
    throw new Error("\u65E0\u6CD5\u751F\u6210\u4E0D\u91CD\u590D\u7684\u7B14\u8BB0\u540D\u3002 ");
  }
};

// src/SettingTab.ts
var import_obsidian3 = require("obsidian");

// src/utils.ts
function deepClone(value) {
  if (value === null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (e) {
    }
  }
  return JSON.parse(JSON.stringify(value));
}

// src/BuiltInSurvey.ts
var BUILT_IN_MOOD_REVIEW_ID = "mood_review";
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}
var MOOD_REVIEW_FACTORY = deepFreeze({
  id: BUILT_IN_MOOD_REVIEW_ID,
  name: "\u4ECA\u65E5\u60C5\u7EEA\u590D\u76D8",
  description: "\u8BB0\u5F55\u4ECA\u65E5\u73AF\u5883\u3001\u72B6\u6001\u548C 4F \u60C5\u7EEA\u3002",
  enabled: true,
  targetFolder: "\u590D\u76D8/\u60C5\u7EEA\u8BB0\u5F55",
  fileNameTemplate: "{{date}} {{survey_name}}",
  collisionMode: "increment",
  multipleSeparator: "\u3001",
  template: [
    "# {{date}} {{survey_name}}",
    "",
    "## \u4ECA\u65E5\u73AF\u5883",
    "{{env}}",
    "",
    "## \u4ECA\u65E5\u72B6\u6001",
    "{{status}}",
    "",
    "---",
    "",
    "## \u4ECA\u65E5 4F \u60C5\u7EEA\u8BB0\u5F55 \u{1F970}",
    "",
    "Fact\u30101\u3011\u4ECA\u5929\u53D1\u751F\u4E86\u4EC0\u4E48\u4E8B\u60C5\uFF1F",
    "{{f1}}",
    "",
    "Fact\u30102\u3011\u8FC7\u7A0B\u4E2D\u6211\u5370\u8C61\u6700\u6DF1\u523B\u7684\u662F\u4EC0\u4E48\uFF1F",
    "{{f2}}",
    "",
    "Feel\u30103\u3011\u6211\u4F53\u9A8C\u5230\u54EA\u4E9B\u60C5\u7EEA\u611F\u53D7\uFF1F",
    "{{f3}}",
    "",
    "Feel\u30104\u3011\u6211\u611F\u89C9\u5230\u6700\u4EAB\u53D7\u7684\u662F\u4EC0\u4E48\uFF1F",
    "{{f4}}",
    "",
    "Focus\u30105\u3011\u6211\u6709\u54EA\u4E9B\u65B0\u7684\u8054\u60F3\uFF1F",
    "{{f5}}",
    "",
    "Focus\u30106\u3011\u6211\u6709\u54EA\u4E9B\u79EF\u6781\u7684\u53D8\u5316\u6B63\u5728\u53D1\u751F\u7740\uFF1F",
    "{{f6}}",
    "",
    "Future\u30107\u3011\u672A\u6765\u6211\u5C06\u600E\u4E48\u628A\u4ECA\u5929\u7684\u6210\u957F\u5E94\u7528\u5230\u751F\u6D3B\u4E0E\u5DE5\u4F5C\u4E2D\uFF1F",
    "{{f7}}",
    ""
  ].join("\n"),
  questions: [
    { id: "env", label: "\u4ECA\u65E5\u73AF\u5883", type: "single", required: true, autoAdvance: true, options: ["\u{1F31F} \u597D", "\u26C5 \u4E00\u822C", "\u2614 \u7CDF\u7CD5"] },
    {
      id: "status",
      label: "\u4ECA\u65E5\u72B6\u6001",
      description: "\u53EF\u591A\u9009\u3002",
      type: "multiple",
      required: true,
      options: ["\u{1F44D} \u6709\u6536\u83B7", "\u{1F44E} \u88AB\u638F\u7A7A", "\u{1F630} \u7126\u8651", "\u{1F60E} \u5B89\u5B81", "\u{1F437} \u8F7B\u677E", "\u{1F436} \u52B3\u7D2F", "\u{1F601} \u5F00\u5FC3", "\u{1FAE3} \u5FC3\u7D2F", "\u{1F95B} \u517B\u751F", "\u{1F37B} \u653E\u7EB5"]
    },
    { id: "f1", label: "Fact\u30101\u3011\u4ECA\u5929\u53D1\u751F\u4E86\u4EC0\u4E48\u4E8B\u60C5\uFF1F", description: "\u4E0B\u9762\u8BB0\u5F55\u4ECA\u5929 4F \u60C5\u7EEA\u5427 \u{1F970}\uFF08Fact \u2192 Feel \u2192 Focus \u2192 Future\uFF0C\u5171 7 \u95EE\uFF09", type: "textarea", placeholder: "\u4ECA\u5929\u53D1\u751F\u4E86\u4EC0\u4E48\u4E8B\u60C5\uFF1F" },
    { id: "f2", label: "Fact\u30102\u3011\u8FC7\u7A0B\u4E2D\u6211\u5370\u8C61\u6700\u6DF1\u523B\u7684\u662F\u4EC0\u4E48\uFF1F", type: "textarea", placeholder: "\u8FC7\u7A0B\u4E2D\u6211\u5370\u8C61\u6700\u6DF1\u523B\u7684\u662F\u4EC0\u4E48\uFF1F" },
    { id: "f3", label: "Feel\u30103\u3011\u6211\u4F53\u9A8C\u5230\u54EA\u4E9B\u60C5\u7EEA\u611F\u53D7\uFF1F", type: "textarea", placeholder: "\u6211\u4F53\u9A8C\u5230\u54EA\u4E9B\u60C5\u7EEA\u611F\u53D7\uFF1F" },
    { id: "f4", label: "Feel\u30104\u3011\u6211\u611F\u89C9\u5230\u6700\u4EAB\u53D7\u7684\u662F\u4EC0\u4E48\uFF1F", type: "textarea", placeholder: "\u6211\u611F\u89C9\u5230\u6700\u4EAB\u53D7\u7684\u662F\u4EC0\u4E48\uFF1F" },
    { id: "f5", label: "Focus\u30105\u3011\u6211\u6709\u54EA\u4E9B\u65B0\u7684\u8054\u60F3\uFF1F", type: "textarea", placeholder: "\u6211\u6709\u54EA\u4E9B\u65B0\u7684\u8054\u60F3\uFF1F" },
    { id: "f6", label: "Focus\u30106\u3011\u6211\u6709\u54EA\u4E9B\u79EF\u6781\u7684\u53D8\u5316\u6B63\u5728\u53D1\u751F\u7740\uFF1F", type: "textarea", placeholder: "\u6211\u6709\u54EA\u4E9B\u79EF\u6781\u7684\u53D8\u5316\u6B63\u5728\u53D1\u751F\u7740\uFF1F" },
    { id: "f7", label: "Future\u30107\u3011\u672A\u6765\u6211\u5C06\u600E\u4E48\u628A\u4ECA\u5929\u7684\u6210\u957F\u5E94\u7528\u5230\u751F\u6D3B\u4E0E\u5DE5\u4F5C\u4E2D\uFF1F", type: "textarea", placeholder: "\u672A\u6765\u6211\u5C06\u600E\u4E48\u628A\u4ECA\u5929\u7684\u6210\u957F\u5E94\u7528\u5230\u751F\u6D3B\u4E0E\u5DE5\u4F5C\u4E2D\uFF1F" }
  ]
});
var BUILT_IN_TEMPLATES = deepFreeze([MOOD_REVIEW_FACTORY]);
function getBuiltInTemplate(id) {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id);
}
function instantiateBuiltInTemplate(id) {
  const factory = getBuiltInTemplate(id);
  return factory ? deepClone(factory) : void 0;
}

// src/SettingTab.ts
var DynamicSurveySettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "\u52A8\u6001\u95EE\u5377\u8BBE\u7F6E" });
    this.containerEl.createEl("p", { text: "\u6BCF\u4E2A\u95EE\u5377\u901A\u8FC7 targetFolder \u8BBE\u7F6E\u4FDD\u5B58\u6587\u4EF6\u5939\uFF1B\u7B14\u8BB0\u540D\u9ED8\u8BA4\u662F {{date}} {{survey_name}}\u3002\u540C\u65E5\u91CD\u590D\u586B\u5199\u9ED8\u8BA4\u751F\u6210 (2)\u3001(3)\u3002" });
    this.renderBuiltInSection();
    this.renderJsonEditor();
  }
  /** 内置模板区：状态 + 恢复内置模板（离线）+ 存为副本。 */
  renderBuiltInSection() {
    var _a;
    const section = this.containerEl.createDiv({ cls: "dynamic-survey-builtin-section" });
    section.createEl("h3", { text: "\u5185\u7F6E\u6A21\u677F" });
    section.createEl("p", { text: "\u51FA\u5382\u6A21\u677F\u968F\u63D2\u4EF6\u5185\u7F6E\uFF0C\u6062\u590D\u5185\u7F6E\u6A21\u677F\u4E0D\u9700\u8981\u7F51\u7EDC\uFF0C\u684C\u9762\u7AEF\u4E0E Android \u79FB\u52A8\u7AEF\u884C\u4E3A\u4E00\u81F4\u3002", cls: "dynamic-survey-builtin-hint" });
    for (const factory of BUILT_IN_TEMPLATES) {
      const copy = this.plugin.settings.surveys.find((s) => s.id === factory.id);
      const statusText = copy ? `\u5DE5\u4F5C\u526F\u672C\u5DF2\u5B58\u5728\uFF08${copy.enabled === false ? "\u5DF2\u505C\u7528" : "\u542F\u7528\u4E2D"}\uFF0C\u53EF\u81EA\u7531\u7F16\u8F91\uFF09\u3002` : "\u6682\u65E0\u5DE5\u4F5C\u526F\u672C\uFF0C\u53EF\u4E00\u952E\u6062\u590D\u3002";
      new import_obsidian3.Setting(section).setName(factory.name).setDesc(`${(_a = factory.description) != null ? _a : ""}\uFF08${statusText}\uFF09`).addButton((b) => b.setButtonText("\u6062\u590D\u5185\u7F6E\u6A21\u677F").onClick(async () => {
        const restored = this.plugin.restoreBuiltInTemplate(factory.id);
        if (!restored) {
          new import_obsidian3.Notice("\u672A\u627E\u5230\u8BE5\u5185\u7F6E\u6A21\u677F\u3002");
          return;
        }
        await this.plugin.saveSettings();
        this.display();
        new import_obsidian3.Notice(`\u5DF2\u6062\u590D\u5185\u7F6E\u6A21\u677F\u300C${restored.name}\u300D\u7684\u5DE5\u4F5C\u526F\u672C\u3002`);
      })).addButton((b) => b.setButtonText("\u5B58\u4E3A\u526F\u672C").onClick(async () => {
        const duplicated = this.plugin.duplicateSurvey(factory.id);
        if (!duplicated) {
          new import_obsidian3.Notice("\u6CA1\u6709\u53EF\u590D\u5236\u7684\u5DE5\u4F5C\u526F\u672C\uFF0C\u8BF7\u5148\u6062\u590D\u5185\u7F6E\u6A21\u677F\u3002");
          return;
        }
        await this.plugin.saveSettings();
        this.display();
        new import_obsidian3.Notice(`\u5DF2\u521B\u5EFA\u526F\u672C\u300C${duplicated.name}\u300D\uFF08id: ${duplicated.id}\uFF09\u3002`);
      }));
    }
  }
  renderJsonEditor() {
    let draft = JSON.stringify(this.plugin.settings, null, 2);
    const editor = this.containerEl.createEl("textarea", { cls: "dynamic-survey-json-editor", attr: { rows: "30", spellcheck: "false" } });
    editor.value = draft;
    editor.addEventListener("input", () => draft = editor.value);
    const status = this.containerEl.createDiv({ cls: "dynamic-survey-validation-message" });
    const parse = () => {
      status.empty();
      try {
        const value = JSON.parse(draft);
        const errors = this.plugin.validateSettings(value);
        if (errors.length) {
          status.setText(errors.join("\n"));
          status.addClass("is-error");
          return null;
        }
        status.setText(`\u914D\u7F6E\u6709\u6548\uFF0C\u5171 ${value.surveys.length} \u4E2A\u95EE\u5377\u3002`);
        return value;
      } catch (e) {
        status.setText(`JSON \u9519\u8BEF\uFF1A${e instanceof Error ? e.message : String(e)}`);
        status.addClass("is-error");
        return null;
      }
    };
    new import_obsidian3.Setting(this.containerEl).setName("\u68C0\u67E5\u914D\u7F6E").addButton((b) => b.setButtonText("\u68C0\u67E5 JSON").onClick(() => {
      parse();
    }));
    new import_obsidian3.Setting(this.containerEl).setName("\u4FDD\u5B58\u914D\u7F6E").setDesc("\u56FA\u5B9A\u5165\u53E3\u7ACB\u5373\u8BFB\u53D6\u65B0\u914D\u7F6E\uFF1B\u4E13\u5C5E\u547D\u4EE4\u9700\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6\u540E\u5237\u65B0\u3002").addButton((b) => b.setButtonText("\u4FDD\u5B58").setCta().onClick(async () => {
      const value = parse();
      if (!value) return;
      this.plugin.settings = value;
      await this.plugin.saveSettings();
      new import_obsidian3.Notice("\u914D\u7F6E\u5DF2\u4FDD\u5B58\u3002");
      this.display();
    }));
    new import_obsidian3.Setting(this.containerEl).setName("\u91CD\u7F6E\u9ED8\u8BA4\u914D\u7F6E").addButton((b) => b.setButtonText("\u91CD\u7F6E").setWarning().onClick(() => {
      draft = JSON.stringify(deepClone(DEFAULT_SETTINGS), null, 2);
      editor.value = draft;
      status.empty();
    }));
  }
};

// src/main.ts
var DEFAULT_SETTINGS = { surveys: [instantiateBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)] };
var DynamicSurveyPlugin2 = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = deepClone(DEFAULT_SETTINGS);
  }
  async onload() {
    await this.loadSettings();
    this.writer = new SurveyFileWriter(this.app);
    this.addSettingTab(new DynamicSurveySettingTab(this.app, this));
    this.addCommand({ id: "open-survey-picker", name: "\u6253\u5F00\u52A8\u6001\u95EE\u5377", callback: () => new SurveyPicker(this, this.enabled()).open() });
    const seen = /* @__PURE__ */ new Set();
    for (const survey of this.enabled()) {
      const id = `run-survey-${survey.id.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`;
      if (seen.has(id)) continue;
      seen.add(id);
      this.addCommand({ id, name: `\u586B\u5199\u95EE\u5377: ${survey.name}`, callback: () => this.run(deepClone(survey)) });
    }
  }
  enabled() {
    return this.settings.surveys.filter((s) => s.enabled !== false);
  }
  run(survey) {
    const errors = this.validateSurvey(survey);
    if (errors.length) {
      new import_obsidian4.Notice(`\u95EE\u5377\u914D\u7F6E\u65E0\u6548\uFF1A${errors[0]}`);
      return;
    }
    new SurveyWizardModal(this.app, survey, async (answers) => this.save(survey, answers)).open();
  }
  /**
   * 恢复内置模板：用随插件分发的出厂定义（离线、不依赖网络）覆盖现有工作副本；
   * 若尚无工作副本则新建一个。返回恢复后的可编辑副本。
   */
  restoreBuiltInTemplate(id = BUILT_IN_MOOD_REVIEW_ID) {
    const copy = instantiateBuiltInTemplate(id);
    if (!copy) return null;
    const index = this.settings.surveys.findIndex((s) => s.id === id);
    if (index >= 0) this.settings.surveys[index] = copy;
    else this.settings.surveys.push(copy);
    return copy;
  }
  /** 复制一份现有问卷作为新副本（id 自动去重，默认启用）。 */
  duplicateSurvey(id) {
    const source = this.settings.surveys.find((s) => s.id === id);
    if (!source) return null;
    const copy = deepClone(source);
    let suffix = 2;
    let newId = `${id}-copy`;
    while (this.settings.surveys.some((s) => s.id === newId)) newId = `${id}-copy-${suffix++}`;
    copy.id = newId;
    copy.name = `${source.name} \u526F\u672C`;
    copy.enabled = true;
    this.settings.surveys.push(copy);
    return copy;
  }
  async save(survey, answers) {
    var _a, _b;
    try {
      const values = this.values(survey, answers);
      const note = this.replaceTokens(survey.template, values);
      const nameTemplate = ((_a = survey.fileNameTemplate) == null ? void 0 : _a.trim()) || "{{date}} {{survey_name}}";
      const fileName = this.replaceTokens(nameTemplate, values);
      const file = await this.writer.write(survey.targetFolder, fileName, note, (_b = survey.collisionMode) != null ? _b : "increment");
      new import_obsidian4.Notice(`\u5DF2\u4FDD\u5B58\uFF1A${file.path}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      new import_obsidian4.Notice(`\u4FDD\u5B58\u5931\u8D25\uFF1A${message}`, 7e3);
      throw e;
    }
  }
  values(survey, answers) {
    var _a;
    const now = /* @__PURE__ */ new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const time = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
    const values = { date, time, datetime: `${date} ${time}`, survey_name: survey.name };
    for (const q of survey.questions) {
      const a = answers[q.id];
      values[q.id] = Array.isArray(a) ? a.join((_a = survey.multipleSeparator) != null ? _a : "\u3001") : a != null ? a : "";
    }
    return values;
  }
  replaceTokens(text, values) {
    return text.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*\}\}/g, (_m, key) => {
      var _a;
      return (_a = values[key]) != null ? _a : "";
    });
  }
  validateSettings(settings) {
    if (!settings || !Array.isArray(settings.surveys)) return ["\u914D\u7F6E\u5FC5\u987B\u5305\u542B surveys \u6570\u7EC4\u3002"];
    const errors = [];
    const ids = /* @__PURE__ */ new Set();
    settings.surveys.forEach((s, i) => {
      this.validateSurvey(s).forEach((e) => errors.push(`\u7B2C ${i + 1} \u4E2A\u95EE\u5377\uFF1A${e}`));
      if (ids.has(s.id)) errors.push(`\u95EE\u5377 ID \u91CD\u590D\uFF1A${s.id}`);
      ids.add(s.id);
    });
    return errors;
  }
  validateSurvey(s) {
    var _a, _b, _c;
    const e = [];
    if (!s.id || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s.id)) e.push("id \u683C\u5F0F\u65E0\u6548\u3002");
    if (!((_a = s.name) == null ? void 0 : _a.trim())) e.push("\u7F3A\u5C11 name\u3002");
    if (typeof s.targetFolder !== "string") e.push("\u7F3A\u5C11 targetFolder\u3002");
    if (!s.template) e.push("\u7F3A\u5C11 template\u3002");
    if (!Array.isArray(s.questions) || !s.questions.length) e.push("\u81F3\u5C11\u9700\u8981\u4E00\u9053\u9898\u3002");
    const ids = /* @__PURE__ */ new Set();
    for (const q of (_b = s.questions) != null ? _b : []) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(q.id)) e.push(`\u9898\u76EE ID \u65E0\u6548\uFF1A${q.id}`);
      if (ids.has(q.id)) e.push(`\u9898\u76EE ID \u91CD\u590D\uFF1A${q.id}`);
      ids.add(q.id);
      if ((q.type === "single" || q.type === "multiple") && !((_c = q.options) == null ? void 0 : _c.length)) e.push(`\u9898\u76EE ${q.id} \u7F3A\u5C11 options\u3002`);
    }
    return e;
  }
  async loadSettings() {
    const data = await this.loadData();
    if (data && Array.isArray(data.surveys)) {
      this.settings = data;
      return;
    }
    this.settings = { surveys: [instantiateBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)] };
    await this.saveData(this.settings);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var SurveyPicker = class extends import_obsidian4.SuggestModal {
  constructor(plugin, surveys) {
    super(plugin.app);
    this.plugin = plugin;
    this.surveys = surveys;
    this.setPlaceholder("\u9009\u62E9\u8981\u586B\u5199\u7684\u95EE\u5377");
  }
  getSuggestions(query) {
    const q = query.toLowerCase();
    return this.surveys.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }
  renderSuggestion(s, el) {
    el.createEl("div", { text: s.name });
    if (s.description) el.createEl("small", { text: s.description });
  }
  onChooseSuggestion(s) {
    this.plugin.run(deepClone(s));
  }
};
