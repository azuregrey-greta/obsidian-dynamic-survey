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
var import_obsidian6 = require("obsidian");

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
var import_obsidian5 = require("obsidian");

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

// src/SurveyCollection.ts
var MAX_USER_SURVEYS = 10;
var ANSWER_KIND_LABELS = {
  single: "\u9009\u62E9(\u5355\u9009)",
  multiple: "\u9009\u62E9(\u591A\u9009)",
  text: "\u624B\u586B(\u5355\u884C)",
  textarea: "\u624B\u586B(\u591A\u884C)"
};
function isBuiltInSurvey(def) {
  return getBuiltInTemplate(def.id) !== void 0;
}
function countUserSurveys(surveys) {
  return surveys.filter((s) => !isBuiltInSurvey(s)).length;
}
function generateSurveyId(existingIds) {
  let id = `survey-${Date.now().toString(36)}`;
  let n = 2;
  while (existingIds.has(id)) id = `survey-${Date.now().toString(36)}-${n++}`;
  return id;
}
var ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
function draftDefaultTemplate(questions) {
  return ["# {{date}} {{survey_name}}", ...questions.map((q) => `## ${q.label}
{{${q.id}}}`)].join("\n\n") + "\n";
}
function buildSurveyFromDraft(draft) {
  var _a, _b, _c;
  const errors = [];
  const name = ((_a = draft.name) != null ? _a : "").trim();
  if (!name) errors.push("\u8BF7\u586B\u5199\u95EE\u5377\u540D\u79F0\u3002");
  const questions = (_b = draft.questions) != null ? _b : [];
  if (!questions.length) errors.push("\u81F3\u5C11\u8981\u6709\u4E00\u4E2A\u95EE\u9898(\u70B9\u51FB\u300C\u4E0B\u4E00\u4E2A\u95EE\u9898\u300D\u6DFB\u52A0)\u3002");
  questions.forEach((q, i) => {
    var _a2, _b2;
    if (!((_a2 = q.label) != null ? _a2 : "").trim()) errors.push(`\u7B2C ${i + 1} \u9898\u7F3A\u5C11\u95EE\u9898\u6587\u672C\u3002`);
    if ((q.kind === "single" || q.kind === "multiple") && !((_b2 = q.options) != null ? _b2 : []).some((o) => (o != null ? o : "").trim())) errors.push(`\u7B2C ${i + 1} \u9898\u662F\u9009\u62E9\u9898,\u8BF7\u81F3\u5C11\u586B\u5199\u4E00\u4E2A\u9009\u9879\u3002`);
  });
  if (errors.length || !name || !questions.length) return { errors };
  const surveyQuestions = questions.map((q, i) => {
    var _a2, _b2;
    const question = { id: `q${i + 1}`, label: ((_a2 = q.label) != null ? _a2 : "").trim(), type: q.kind, required: q.required !== false };
    if (q.kind === "single" || q.kind === "multiple") {
      question.options = ((_b2 = q.options) != null ? _b2 : []).map((o) => (o != null ? o : "").trim()).filter(Boolean);
      if (q.kind === "single") question.autoAdvance = true;
    }
    if (q.kind === "textarea") question.placeholder = "";
    return question;
  });
  const survey = {
    id: "",
    name,
    description: "",
    enabled: true,
    targetFolder: ((_c = draft.folder) != null ? _c : "").trim() || "\u95EE\u5377\u6536\u96C6",
    fileNameTemplate: "{{date}} {{survey_name}}",
    collisionMode: "increment",
    multipleSeparator: "\u3001",
    template: draftDefaultTemplate(surveyQuestions),
    questions: surveyQuestions
  };
  return { survey, errors };
}
function parseImportPayload(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { error: `JSON \u89E3\u6790\u5931\u8D25:${e instanceof Error ? e.message : String(e)}` };
  }
  const usage = '\u53EF\u7C98\u8D34:\u5355\u4E2A\u95EE\u5377\u5BF9\u8C61 / \u95EE\u5377\u6570\u7EC4 / {"surveys":[\u2026]}\u3002';
  if (Array.isArray(raw)) return raw.length ? { surveys: raw } : { error: `\u6570\u7EC4\u4E3A\u7A7A\u3002${usage}` };
  if (raw && typeof raw === "object") {
    const obj = raw;
    if (Array.isArray(obj.surveys)) return obj.surveys.length ? { surveys: obj.surveys } : { error: `surveys \u4E3A\u7A7A\u3002${usage}` };
    if (obj.questions) return { surveys: [obj] };
    return { error: `\u65E0\u6CD5\u8BC6\u522B\u7684\u683C\u5F0F\u3002${usage}` };
  }
  return { error: `\u65E0\u6CD5\u8BC6\u522B\u7684\u683C\u5F0F\u3002${usage}` };
}
function normalizeImportedSurvey(raw, existingIds) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "\u95EE\u5377\u5FC5\u987B\u662F JSON \u5BF9\u8C61\u3002" };
  const r = raw;
  if (typeof r.name !== "string" || !r.name.trim()) return { error: "\u95EE\u5377\u7F3A\u5C11 name(\u540D\u79F0)\u3002" };
  if (!Array.isArray(r.questions) || !r.questions.length) return { error: `\u95EE\u5377\u300C${r.name}\u300D\u81F3\u5C11\u8981\u6709\u4E00\u4E2A\u95EE\u9898\u3002` };
  if (typeof r.targetFolder !== "string" || !r.targetFolder.trim()) return { error: `\u95EE\u5377\u300C${r.name}\u300D\u7F3A\u5C11 targetFolder(\u4FDD\u5B58\u6587\u4EF6\u5939)\u3002` };
  const ids = new Set(existingIds);
  let id = typeof r.id === "string" && ID_PATTERN.test(r.id) ? r.id : "";
  if (!id || ids.has(id)) id = generateSurveyId(ids);
  ids.add(id);
  const questionIds = r.questions.map((q, i) => q && typeof q.id === "string" && ID_PATTERN.test(q.id) ? q.id : `q${i + 1}`);
  const hasDuplicateQuestionIds = new Set(questionIds).size !== questionIds.length;
  const userTemplate = typeof r.template === "string" && r.template.trim() ? r.template : "";
  const questions = r.questions.map((q, i) => {
    const question = {
      id: userTemplate && !hasDuplicateQuestionIds ? questionIds[i] : `q${i + 1}`,
      label: typeof (q == null ? void 0 : q.label) === "string" ? q.label : `\u7B2C ${i + 1} \u9898`,
      type: (q == null ? void 0 : q.type) === "single" || (q == null ? void 0 : q.type) === "multiple" || (q == null ? void 0 : q.type) === "textarea" ? q.type : "text",
      required: (q == null ? void 0 : q.required) !== false
    };
    if ((question.type === "single" || question.type === "multiple") && Array.isArray(q == null ? void 0 : q.options)) question.options = q.options;
    if (typeof (q == null ? void 0 : q.placeholder) === "string") question.placeholder = q.placeholder;
    if (typeof (q == null ? void 0 : q.description) === "string") question.description = q.description;
    if (typeof (q == null ? void 0 : q.autoAdvance) === "boolean") question.autoAdvance = q.autoAdvance;
    return question;
  });
  const survey = {
    id,
    name: r.name.trim(),
    description: typeof r.description === "string" ? r.description : "",
    enabled: r.enabled !== false,
    targetFolder: r.targetFolder.trim(),
    fileNameTemplate: typeof r.fileNameTemplate === "string" && r.fileNameTemplate.trim() ? r.fileNameTemplate : "{{date}} {{survey_name}}",
    collisionMode: r.collisionMode === "append" || r.collisionMode === "overwrite" ? r.collisionMode : "increment",
    multipleSeparator: typeof r.multipleSeparator === "string" && r.multipleSeparator ? r.multipleSeparator : "\u3001",
    template: userTemplate || draftDefaultTemplate(questions),
    questions
  };
  return { survey };
}

// src/SurveyBuilderModal.ts
var import_obsidian3 = require("obsidian");
function openSurveyBuilder(app, plugin, onDone) {
  new SurveyBuilderModal(app, plugin, onDone).open();
}
var SurveyBuilderModal = class extends import_obsidian3.Modal {
  constructor(app, plugin, onDone) {
    super(app);
    this.plugin = plugin;
    this.onDone = onDone;
    this.draft = {
      name: "",
      folder: "\u95EE\u5377\u6536\u96C6",
      questions: [{ label: "", kind: "single", options: ["", ""], required: true }]
    };
    this.modalEl.addClass("dynamic-survey-modal");
  }
  onOpen() {
    this.renderForm();
  }
  onClose() {
    this.contentEl.empty();
  }
  setStatus(message, isError) {
    this.statusEl.empty();
    this.statusEl.setText(message);
    this.statusEl.toggleClass("is-error", isError);
  }
  renderForm() {
    this.contentEl.empty();
    this.contentEl.scrollTop = 0;
    this.contentEl.createEl("h2", { text: "\u65B0\u5EFA\u95EE\u5377(\u9010\u6B65\u5F55\u5165)" });
    this.contentEl.createEl("p", { text: "\u4E00\u4E2A\u95EE\u9898\u4E00\u4E2A\u95EE\u9898\u5730\u5F55\u5165:\u586B\u95EE\u9898 \u2192 \u9009\u56DE\u7B54\u65B9\u5F0F(\u9009\u62E9\u9898\u8981\u89C4\u5B9A\u5355\u9009/\u591A\u9009)\u2192\u300C\u4E0B\u4E00\u4E2A\u95EE\u9898\u300D\u3002", cls: "dynamic-survey-description" });
    const basics = this.contentEl.createDiv({ cls: "dynamic-survey-builder-basics" });
    const nameRow = basics.createDiv({ cls: "dynamic-survey-builder-row" });
    nameRow.createSpan({ text: "\u95EE\u5377\u540D\u79F0", cls: "dynamic-survey-builder-label" });
    const nameInput = nameRow.createEl("input", { type: "text", attr: { placeholder: "\u4F8B\u5982:\u7761\u524D\u590D\u76D8" } });
    nameInput.value = this.draft.name;
    nameInput.addEventListener("input", () => {
      this.draft.name = nameInput.value;
    });
    const folderRow = basics.createDiv({ cls: "dynamic-survey-builder-row" });
    folderRow.createSpan({ text: "\u4FDD\u5B58\u6587\u4EF6\u5939", cls: "dynamic-survey-builder-label" });
    const folderInput = folderRow.createEl("input", { type: "text", attr: { placeholder: "\u95EE\u5377\u6536\u96C6" } });
    folderInput.value = this.draft.folder;
    folderInput.addEventListener("input", () => {
      this.draft.folder = folderInput.value;
    });
    this.draft.questions.forEach((q, index) => this.renderQuestionCard(index));
    const addRow = this.contentEl.createDiv({ cls: "dynamic-survey-builder-add-row" });
    const addBtn = addRow.createEl("button", { text: "\uFF0B \u4E0B\u4E00\u4E2A\u95EE\u9898", attr: { type: "button" } });
    addBtn.addEventListener("click", () => {
      this.draft.questions.push({ label: "", kind: "single", options: ["", ""], required: true });
      this.renderForm();
    });
    this.statusEl = this.contentEl.createDiv({ cls: "dynamic-survey-validation-message" });
    const footer = this.contentEl.createDiv({ cls: "dynamic-survey-footer" });
    const cancel = footer.createEl("button", { text: "\u53D6\u6D88", attr: { type: "button" } });
    cancel.addEventListener("click", () => this.close());
    const submit = footer.createEl("button", { text: "\u5B8C\u6210\u521B\u5EFA", cls: "mod-cta", attr: { type: "button" } });
    submit.addEventListener("click", () => void this.submit());
  }
  renderQuestionCard(index) {
    const q = this.draft.questions[index];
    const card = this.contentEl.createDiv({ cls: "dynamic-survey-builder-question" });
    const head = card.createDiv({ cls: "dynamic-survey-builder-row" });
    head.createSpan({ text: `\u7B2C ${index + 1} \u9898`, cls: "dynamic-survey-builder-question-no" });
    const spacer = head.createDiv({ cls: "dynamic-survey-builder-head-spacer" });
    if (index > 0) {
      const up = spacer.createEl("button", { text: "\u2191", attr: { type: "button", title: "\u4E0A\u79FB" } });
      up.addEventListener("click", () => {
        [this.draft.questions[index - 1], this.draft.questions[index]] = [this.draft.questions[index], this.draft.questions[index - 1]];
        this.renderForm();
      });
    }
    if (index < this.draft.questions.length - 1) {
      const down = spacer.createEl("button", { text: "\u2193", attr: { type: "button", title: "\u4E0B\u79FB" } });
      down.addEventListener("click", () => {
        [this.draft.questions[index + 1], this.draft.questions[index]] = [this.draft.questions[index], this.draft.questions[index + 1]];
        this.renderForm();
      });
    }
    if (this.draft.questions.length > 1) {
      const del = spacer.createEl("button", { text: "\xD7", cls: "dynamic-survey-remove-btn", attr: { type: "button", title: "\u5220\u9664\u672C\u9898" } });
      del.addEventListener("click", () => {
        this.draft.questions.splice(index, 1);
        this.renderForm();
      });
    }
    const labelRow = card.createDiv({ cls: "dynamic-survey-builder-row" });
    const labelInput = labelRow.createEl("input", { type: "text", attr: { placeholder: "\u95EE\u9898\u6587\u672C,\u4F8B\u5982:\u4ECA\u5929\u6548\u7387\u5982\u4F55?" } });
    labelInput.value = q.label;
    labelInput.addEventListener("input", () => {
      q.label = labelInput.value;
    });
    const kindRow = card.createDiv({ cls: "dynamic-survey-builder-row" });
    kindRow.createSpan({ text: "\u56DE\u7B54\u65B9\u5F0F", cls: "dynamic-survey-builder-label" });
    const select = kindRow.createEl("select");
    Object.keys(ANSWER_KIND_LABELS).forEach((kind) => {
      const opt = select.createEl("option", { text: ANSWER_KIND_LABELS[kind] });
      opt.value = kind;
    });
    select.value = q.kind;
    select.addEventListener("change", () => {
      q.kind = select.value;
      if ((q.kind === "single" || q.kind === "multiple") && q.options.length === 0) q.options = ["", ""];
      this.renderForm();
    });
    if (q.kind === "single" || q.kind === "multiple") {
      card.createDiv({ text: `\u9009\u9879(${q.kind === "single" ? "\u5355\u9009" : "\u591A\u9009"}):`, cls: "dynamic-survey-builder-label" });
      q.options.forEach((optValue, optIndex) => {
        const row = card.createDiv({ cls: "dynamic-survey-option-row" });
        const input = row.createEl("input", { type: "text", attr: { placeholder: `\u9009\u9879 ${optIndex + 1},\u53EF\u542B emoji` } });
        input.value = optValue;
        input.addEventListener("input", () => {
          q.options[optIndex] = input.value;
        });
        const remove = row.createEl("button", { text: "\xD7", cls: "dynamic-survey-remove-btn", attr: { type: "button", title: "\u5220\u9664\u9009\u9879" } });
        remove.addEventListener("click", () => {
          q.options.splice(optIndex, 1);
          this.renderForm();
        });
      });
      const addOptRow = card.createDiv({ cls: "dynamic-survey-builder-row" });
      const addOpt = addOptRow.createEl("button", { text: "\uFF0B \u6DFB\u52A0\u9009\u9879", attr: { type: "button" } });
      addOpt.addEventListener("click", () => {
        q.options.push("");
        this.renderForm();
      });
    }
    const requiredRow = card.createDiv({ cls: "dynamic-survey-builder-row" });
    const requiredLabel = requiredRow.createEl("label", { cls: "dynamic-survey-builder-checkbox" });
    const checkbox = requiredLabel.createEl("input", { type: "checkbox" });
    checkbox.checked = q.required;
    requiredLabel.createSpan({ text: "\u5FC5\u586B" });
    checkbox.addEventListener("change", () => {
      q.required = checkbox.checked;
    });
  }
  async submit() {
    var _a, _b;
    const { survey, errors } = buildSurveyFromDraft(this.draft);
    if (errors.length || !survey) {
      this.setStatus(errors.join("\n"), true);
      return;
    }
    const result = await this.plugin.addUserSurvey(survey);
    if (!result.ok) {
      this.setStatus((_a = result.error) != null ? _a : "\u521B\u5EFA\u5931\u8D25\u3002", true);
      return;
    }
    new import_obsidian3.Notice(`\u5DF2\u521B\u5EFA\u95EE\u5377\u300C${result.survey.name}\u300D(${result.survey.questions.length} \u9898)\u3002\u300C\u6253\u5F00\u52A8\u6001\u95EE\u5377\u300D\u7ACB\u5373\u53EF\u7528,\u4E13\u5C5E\u547D\u4EE4\u9700\u91CD\u8F7D\u63D2\u4EF6\u540E\u51FA\u73B0\u3002`);
    (_b = this.onDone) == null ? void 0 : _b.call(this);
    this.close();
  }
};

// src/SurveyImportModal.ts
var import_obsidian4 = require("obsidian");
function openSurveyImport(app, plugin, onDone) {
  new SurveyImportModal(app, plugin, onDone).open();
}
var SurveyImportModal = class extends import_obsidian4.Modal {
  constructor(app, plugin, onDone) {
    super(app);
    this.plugin = plugin;
    this.onDone = onDone;
    this.modalEl.addClass("dynamic-survey-modal");
  }
  onOpen() {
    this.renderForm();
  }
  onClose() {
    this.contentEl.empty();
  }
  setStatus(message, isError) {
    this.statusEl.empty();
    this.statusEl.setText(message);
    this.statusEl.toggleClass("is-error", isError);
  }
  renderForm() {
    this.contentEl.empty();
    this.contentEl.scrollTop = 0;
    this.contentEl.createEl("h2", { text: "\u7C98\u8D34 JSON \u5BFC\u5165\u95EE\u5377" });
    this.contentEl.createEl("p", {
      text: '\u9002\u5408\u5DF2\u6709 JSON \u914D\u7F6E\u7684\u61D2\u4EBA:\u76F4\u63A5\u7C98\u8D34\u5E76\u5BFC\u5165,\u81EA\u52A8\u8865\u9ED8\u8BA4\u503C\u548C id\u3002\u652F\u6301\u5355\u4E2A\u95EE\u5377\u5BF9\u8C61\u3001\u95EE\u5377\u6570\u7EC4\u6216 {"surveys":[\u2026]}\u3002',
      cls: "dynamic-survey-description"
    });
    const textarea = this.contentEl.createEl("textarea", {
      cls: "dynamic-survey-textarea dynamic-survey-import-editor",
      attr: { rows: "14", spellcheck: "false", placeholder: '{\n  "name": "\u6668\u95F4\u68C0\u67E5",\n  "targetFolder": "\u95EE\u5377\u6536\u96C6",\n  "questions": [\n    { "id": "q1", "label": "\u7761\u5F97\u597D\u5417?", "type": "single", "options": ["\u{1F634} \u5F88\u597D", "\u{1F62F} \u4E00\u822C", "\u{1F62A} \u5F88\u5DEE"] },\n    { "id": "q2", "label": "\u60F3\u8BF4\u4EC0\u4E48?", "type": "textarea" }\n  ]\n}' }
    });
    this.statusEl = this.contentEl.createDiv({ cls: "dynamic-survey-validation-message" });
    const footer = this.contentEl.createDiv({ cls: "dynamic-survey-footer" });
    const cancel = footer.createEl("button", { text: "\u53D6\u6D88", attr: { type: "button" } });
    cancel.addEventListener("click", () => this.close());
    const submit = footer.createEl("button", { text: "\u5BFC\u5165", cls: "mod-cta", attr: { type: "button" } });
    submit.addEventListener("click", () => void this.submit(textarea.value));
  }
  async submit(text) {
    var _a, _b, _c;
    const payload = parseImportPayload(text);
    if (payload.error || !payload.surveys) {
      this.setStatus((_a = payload.error) != null ? _a : "\u65E0\u6CD5\u89E3\u6790\u3002", true);
      return;
    }
    const ids = new Set(this.plugin.settings.surveys.map((s) => s.id));
    const normalized = [];
    const normalizeErrors = [];
    for (const raw of payload.surveys) {
      const result = normalizeImportedSurvey(raw, ids);
      if (result.error || !result.survey) normalizeErrors.push((_b = result.error) != null ? _b : "\u672A\u77E5\u9519\u8BEF\u3002");
      else normalized.push(result.survey);
    }
    if (normalizeErrors.length) {
      this.setStatus(normalizeErrors.join("\n"), true);
      return;
    }
    const used = countUserSurveys(this.plugin.settings.surveys);
    const free = MAX_USER_SURVEYS - used;
    if (normalized.length > free) {
      this.setStatus(`\u95EE\u5377\u6536\u96C6\u5DF2\u6EE1:\u6700\u591A ${MAX_USER_SURVEYS} \u4E2A,\u5F53\u524D ${used} \u4E2A,\u672C\u6B21\u8981\u5BFC\u5165 ${normalized.length} \u4E2A(\u8FD8\u53EF\u6536\u96C6 ${free} \u4E2A)\u3002\u8BF7\u5148\u5220\u9664\u4E0D\u9700\u8981\u7684\u95EE\u5377\u3002`, true);
      return;
    }
    let imported = 0;
    let updated = 0;
    const failures = [];
    for (const survey of normalized) {
      const result = await this.plugin.addUserSurvey(survey, { replaceIfIdExists: true });
      if (result.ok) {
        imported++;
        if (result.updated) updated++;
      } else failures.push(`\u300C${survey.name}\u300D:${result.error}`);
    }
    if (failures.length) {
      this.setStatus(`\u5BFC\u5165\u5B8C\u6210 ${imported} \u4E2A,\u5931\u8D25 ${failures.length} \u4E2A:
${failures.join("\n")}`, true);
      return;
    }
    new import_obsidian4.Notice(updated > 0 ? `\u5DF2\u5BFC\u5165 ${imported} \u4E2A\u95EE\u5377(\u5176\u4E2D ${updated} \u4E2A\u4E3A\u66F4\u65B0\u5DF2\u6709\u95EE\u5377)\u3002` : `\u5DF2\u5BFC\u5165 ${imported} \u4E2A\u95EE\u5377\u3002\u300C\u6253\u5F00\u52A8\u6001\u95EE\u5377\u300D\u7ACB\u5373\u53EF\u7528,\u4E13\u5C5E\u547D\u4EE4\u9700\u91CD\u8F7D\u63D2\u4EF6\u540E\u51FA\u73B0\u3002`);
    (_c = this.onDone) == null ? void 0 : _c.call(this);
    this.close();
  }
};

// src/SettingTab.ts
var DynamicSurveySettingTab = class extends import_obsidian5.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.pendingDeleteId = null;
  }
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "\u52A8\u6001\u95EE\u5377\u8BBE\u7F6E" });
    this.containerEl.createEl("p", { text: "\u6BCF\u4E2A\u95EE\u5377\u901A\u8FC7 targetFolder \u8BBE\u7F6E\u4FDD\u5B58\u6587\u4EF6\u5939\uFF1B\u7B14\u8BB0\u540D\u9ED8\u8BA4\u662F {{date}} {{survey_name}}\u3002\u540C\u65E5\u91CD\u590D\u586B\u5199\u9ED8\u8BA4\u751F\u6210 (2)\u3001(3)\u3002" });
    this.renderBuiltInSection();
    this.renderCollectionSection();
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
      new import_obsidian5.Setting(section).setName(factory.name).setDesc(`${(_a = factory.description) != null ? _a : ""}\uFF08${statusText}\uFF09`).addButton((b) => b.setButtonText("\u6062\u590D\u5185\u7F6E\u6A21\u677F").onClick(async () => {
        const restored = this.plugin.restoreBuiltInTemplate(factory.id);
        if (!restored) {
          new import_obsidian5.Notice("\u672A\u627E\u5230\u8BE5\u5185\u7F6E\u6A21\u677F\u3002");
          return;
        }
        await this.plugin.saveSettings();
        this.display();
        new import_obsidian5.Notice(`\u5DF2\u6062\u590D\u5185\u7F6E\u6A21\u677F\u300C${restored.name}\u300D\u7684\u5DE5\u4F5C\u526F\u672C\u3002`);
      })).addButton((b) => b.setButtonText("\u5B58\u4E3A\u526F\u672C").onClick(async () => {
        const duplicated = this.plugin.duplicateSurvey(factory.id);
        if (!duplicated) {
          new import_obsidian5.Notice("\u6CA1\u6709\u53EF\u590D\u5236\u7684\u5DE5\u4F5C\u526F\u672C\uFF0C\u8BF7\u5148\u6062\u590D\u5185\u7F6E\u6A21\u677F\u3002");
          return;
        }
        await this.plugin.saveSettings();
        this.display();
        new import_obsidian5.Notice(`\u5DF2\u521B\u5EFA\u526F\u672C\u300C${duplicated.name}\u300D\uFF08id: ${duplicated.id}\uFF09\u3002`);
      }));
    }
  }
  /** 问卷收集区:列表 + 逐步录入 + JSON 导入,最多 10 个(内置模板不计入)。 */
  renderCollectionSection() {
    const section = this.containerEl.createDiv({ cls: "dynamic-survey-collection-section" });
    const used = countUserSurveys(this.plugin.settings.surveys);
    section.createEl("h3", { text: `\u95EE\u5377\u6536\u96C6(${used}/${MAX_USER_SURVEYS})` });
    section.createEl("p", {
      text: "\u6536\u96C6\u5176\u4ED6\u95EE\u5377:\u9010\u6B65\u5F55\u5165(\u95EE\u9898 \u2192 \u56DE\u7B54\u65B9\u5F0F \u2192 \u4E0B\u4E00\u4E2A\u95EE\u9898),\u6216\u76F4\u63A5\u7C98\u8D34 JSON \u5BFC\u5165\u3002\u6700\u591A\u6536\u96C6 10 \u4E2A,\u5185\u7F6E\u6A21\u677F\u4E0D\u8BA1\u5165\u3002",
      cls: "dynamic-survey-builtin-hint"
    });
    new import_obsidian5.Setting(section).setName("\u6DFB\u52A0\u95EE\u5377").addButton((b) => b.setButtonText("\uFF0B \u65B0\u5EFA\u95EE\u5377(\u9010\u6B65\u5F55\u5165)").setCta().onClick(() => openSurveyBuilder(this.app, this.plugin, () => this.display()))).addButton((b) => b.setButtonText("\u7C98\u8D34 JSON \u5BFC\u5165").onClick(() => openSurveyImport(this.app, this.plugin, () => this.display())));
    for (const survey of this.plugin.settings.surveys) {
      const tag = isBuiltInSurvey(survey) ? "\u5185\u7F6E" : "\u6536\u96C6";
      const row = new import_obsidian5.Setting(section).setName(survey.name).setDesc(`[${tag}] ${survey.questions.length} \u9898 \xB7 ${survey.enabled === false ? "\u5DF2\u505C\u7528" : "\u542F\u7528\u4E2D"}`);
      const folderInput = row.controlEl.createEl("input", {
        type: "text",
        cls: "dynamic-survey-folder-input",
        attr: { placeholder: "\u4FDD\u5B58\u4F4D\u7F6E,\u4F8B\u5982:08 \u65E5\u8BB0/01 \u95EE\u5FC3\u65E5\u8BB0", "aria-label": `${survey.name} \u4FDD\u5B58\u4F4D\u7F6E` }
      });
      folderInput.value = survey.targetFolder;
      folderInput.addEventListener("change", async () => {
        const next = folderInput.value.trim();
        if (!next || next === survey.targetFolder) {
          folderInput.value = survey.targetFolder;
          return;
        }
        survey.targetFolder = next;
        await this.plugin.saveSettings();
        new import_obsidian5.Notice(`\u300C${survey.name}\u300D\u4FDD\u5B58\u4F4D\u7F6E\u5DF2\u66F4\u65B0:${next}`);
      });
      row.addButton((b) => b.setButtonText(survey.enabled === false ? "\u542F\u7528" : "\u505C\u7528").onClick(async () => {
        survey.enabled = survey.enabled === false;
        await this.plugin.saveSettings();
        this.display();
      })).addButton((b) => b.setButtonText("\u5220\u9664").setWarning().onClick(async () => {
        if (this.pendingDeleteId === survey.id) {
          this.pendingDeleteId = null;
          const removed = await this.plugin.removeSurvey(survey.id);
          if (removed) new import_obsidian5.Notice(`\u5DF2\u5220\u9664\u300C${survey.name}\u300D\u3002`);
          this.display();
        } else {
          this.pendingDeleteId = survey.id;
          b.setButtonText("\u786E\u8BA4\u5220\u9664?");
          window.setTimeout(() => {
            this.pendingDeleteId = null;
            b.setButtonText("\u5220\u9664");
          }, 4e3);
        }
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
    new import_obsidian5.Setting(this.containerEl).setName("\u68C0\u67E5\u914D\u7F6E").addButton((b) => b.setButtonText("\u68C0\u67E5 JSON").onClick(() => {
      parse();
    }));
    new import_obsidian5.Setting(this.containerEl).setName("\u4FDD\u5B58\u914D\u7F6E").setDesc("\u56FA\u5B9A\u5165\u53E3\u7ACB\u5373\u8BFB\u53D6\u65B0\u914D\u7F6E\uFF1B\u4E13\u5C5E\u547D\u4EE4\u9700\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6\u540E\u5237\u65B0\u3002").addButton((b) => b.setButtonText("\u4FDD\u5B58").setCta().onClick(async () => {
      const value = parse();
      if (!value) return;
      this.plugin.settings = value;
      await this.plugin.saveSettings();
      new import_obsidian5.Notice("\u914D\u7F6E\u5DF2\u4FDD\u5B58\u3002");
      this.display();
    }));
    new import_obsidian5.Setting(this.containerEl).setName("\u91CD\u7F6E\u9ED8\u8BA4\u914D\u7F6E").addButton((b) => b.setButtonText("\u91CD\u7F6E").setWarning().onClick(() => {
      draft = JSON.stringify(deepClone(DEFAULT_SETTINGS), null, 2);
      editor.value = draft;
      status.empty();
    }));
  }
};

// src/main.ts
var DEFAULT_SETTINGS = { surveys: [instantiateBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)] };
var DynamicSurveyPlugin2 = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.settings = deepClone(DEFAULT_SETTINGS);
  }
  async onload() {
    await this.loadSettings();
    this.writer = new SurveyFileWriter(this.app);
    this.addSettingTab(new DynamicSurveySettingTab(this.app, this));
    this.addRibbonIcon("clipboard-list", "\u6253\u5F00\u52A8\u6001\u95EE\u5377", () => new SurveyPicker(this, this.enabled()).open());
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
      new import_obsidian6.Notice(`\u95EE\u5377\u914D\u7F6E\u65E0\u6548\uFF1A${errors[0]}`);
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
  /**
   * 收集一份问卷(逐步录入 / JSON 导入共用)。
   * replaceIfIdExists=true 时(JSON 导入),同 id 的问卷原地更新,不堆副本;
   * 否则 id 冲突时自动重生成。上限 10 个仅对"新增"生效(内置模板不计入)。
   */
  async addUserSurvey(def, opts) {
    const ids = new Set(this.settings.surveys.map((s) => s.id));
    const replace = (opts == null ? void 0 : opts.replaceIfIdExists) === true && !!def.id && ids.has(def.id);
    if (!replace) {
      if (!def.id || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(def.id) || ids.has(def.id)) def.id = generateSurveyId(ids);
    }
    const errors = this.validateSurvey(def);
    if (errors.length) return { ok: false, error: errors[0] };
    if (!replace && countUserSurveys(this.settings.surveys) >= MAX_USER_SURVEYS) {
      return { ok: false, error: `\u95EE\u5377\u6536\u96C6\u5DF2\u6EE1(\u6700\u591A ${MAX_USER_SURVEYS} \u4E2A,\u5185\u7F6E\u6A21\u677F\u4E0D\u8BA1\u5165)\u3002\u8BF7\u5148\u5220\u9664\u4E0D\u9700\u8981\u7684\u95EE\u5377\u3002` };
    }
    if (replace) {
      const index = this.settings.surveys.findIndex((s) => s.id === def.id);
      this.settings.surveys[index] = def;
    } else {
      this.settings.surveys.push(def);
    }
    await this.saveSettings();
    return { ok: true, survey: def, updated: replace };
  }
  /** 删除一份问卷(含内置模板的工作副本;出厂定义仍在,可随时恢复)。 */
  async removeSurvey(id) {
    const before = this.settings.surveys.length;
    this.settings.surveys = this.settings.surveys.filter((s) => s.id !== id);
    if (this.settings.surveys.length === before) return false;
    await this.saveSettings();
    return true;
  }
  async save(survey, answers) {
    var _a, _b;
    try {
      const values = this.values(survey, answers);
      const note = this.replaceTokens(survey.template, values);
      const nameTemplate = ((_a = survey.fileNameTemplate) == null ? void 0 : _a.trim()) || "{{date}} {{survey_name}}";
      const fileName = this.replaceTokens(nameTemplate, values);
      const file = await this.writer.write(survey.targetFolder, fileName, note, (_b = survey.collisionMode) != null ? _b : "increment");
      new import_obsidian6.Notice(`\u5DF2\u4FDD\u5B58\uFF1A${file.path}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      new import_obsidian6.Notice(`\u4FDD\u5B58\u5931\u8D25\uFF1A${message}`, 7e3);
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
var SurveyPicker = class extends import_obsidian6.SuggestModal {
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
