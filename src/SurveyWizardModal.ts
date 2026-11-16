import { App, Modal, Notice, Platform, setIcon } from "obsidian";
import { SurveyAnswers, SurveyDefinition, SurveyOption, SurveyQuestion } from "./types";

export class SurveyWizardModal extends Modal {
  private index = 0;
  private answers: SurveyAnswers = {};
  private saving = false;
  private timer: number | null = null;

  constructor(app: App, private readonly survey: SurveyDefinition, private readonly onSubmit: (answers: SurveyAnswers) => Promise<void>) {
    super(app); this.modalEl.addClass("dynamic-survey-modal");
  }
  onOpen(): void {
    this.scope.register(["Mod"], "Enter", () => { void this.next(); return false; });
    this.render();
  }
  onClose(): void { if (this.timer !== null) window.clearTimeout(this.timer); this.contentEl.empty(); }

  private render(): void {
    this.contentEl.empty(); this.contentEl.scrollTop = 0;
    const q = this.survey.questions[this.index];
    if (!q) { new Notice("问卷配置错误：找不到当前题目。"); this.close(); return; }
    const header = this.contentEl.createDiv({ cls: "dynamic-survey-header" });
    const row = header.createDiv({ cls: "dynamic-survey-header-row" });
    row.createSpan({ text: this.survey.name, cls: "dynamic-survey-name" });
    row.createSpan({ text: `${this.index + 1} / ${this.survey.questions.length}`, cls: "dynamic-survey-progress-text" });
    const track = header.createDiv({ cls: "dynamic-survey-progress-track" });
    track.createDiv({ cls: "dynamic-survey-progress-bar" }).style.width = `${((this.index + 1) / this.survey.questions.length) * 100}%`;
    const titleRow = this.contentEl.createDiv({ cls: "dynamic-survey-question-title-row" });
    titleRow.createEl("h2", { text: q.label });
    if (q.required) titleRow.createSpan({ text: "必填", cls: "dynamic-survey-required-badge" });
    if (q.description) this.contentEl.createEl("p", { text: q.description, cls: "dynamic-survey-description" });
    const body = this.contentEl.createDiv({ cls: "dynamic-survey-input-container" });
    if (q.type === "single") this.renderSingle(body, q);
    else if (q.type === "multiple") this.renderMultiple(body, q);
    else this.renderText(body, q, q.type === "textarea");
    this.renderFooter();
  }

  private renderSingle(el: HTMLElement, q: SurveyQuestion): void {
    const options = el.createDiv({ cls: "dynamic-survey-options" });
    for (const option of this.options(q)) {
      const button = options.createEl("button", { text: option.label, cls: "dynamic-survey-option-card", attr: { type: "button" } });
      if (this.answers[q.id] === option.value) button.addClass("is-selected");
      button.addEventListener("click", () => {
        this.answers[q.id] = option.value;
        options.querySelectorAll("button").forEach(x => x.removeClass("is-selected")); button.addClass("is-selected");
        if (q.autoAdvance !== false) this.timer = window.setTimeout(() => { this.timer = null; void this.next(); }, 180);
      });
    }
  }

  private renderMultiple(el: HTMLElement, q: SurveyQuestion): void {
    const selected = new Set(Array.isArray(this.answers[q.id]) ? this.answers[q.id] as string[] : Array.isArray(q.defaultValue) ? q.defaultValue : []);
    this.answers[q.id] = [...selected];
    const options = el.createDiv({ cls: "dynamic-survey-options" });
    for (const option of this.options(q)) {
      const label = options.createEl("label", { cls: "dynamic-survey-option-card" });
      const input = label.createEl("input", { type: "checkbox" }); input.checked = selected.has(option.value);
      label.createSpan({ text: option.label });
      input.addEventListener("change", () => { input.checked ? selected.add(option.value) : selected.delete(option.value); this.answers[q.id] = [...selected]; });
    }
  }

  private renderText(el: HTMLElement, q: SurveyQuestion, multiline: boolean): void {
    const isLast = this.index === this.survey.questions.length - 1;
    const input = multiline
      ? el.createEl("textarea", { cls: "dynamic-survey-textarea", attr: { rows: "10", placeholder: q.placeholder ?? "" } })
      : el.createEl("input", { type: "text", cls: "dynamic-survey-text-input", attr: { placeholder: q.placeholder ?? "", enterkeyhint: isLast ? "done" : "next" } });
    const current = this.answers[q.id]; input.value = typeof current === "string" ? current : typeof q.defaultValue === "string" ? q.defaultValue : "";
    this.answers[q.id] = input.value;
    input.addEventListener("input", () => { this.answers[q.id] = input.value; });
    // Android 软键盘：单行输入框按回车（键盘上的“下一步/完成”）直接推进问卷，
    // 让 Next/Save 工作流不依赖被键盘遮挡的底部按钮。
    if (!multiline) input.addEventListener("keydown", ev => { if ((ev as KeyboardEvent).key === "Enter") { ev.preventDefault(); void this.next(); } });
    // 移动端不自动弹软键盘（由用户点击输入框触发），桌面端保持自动聚焦。
    if (!Platform.isMobile) window.setTimeout(() => input.focus(), 0);
  }

  private renderFooter(): void {
    const footer = this.contentEl.createDiv({ cls: "dynamic-survey-footer" });
    const back = footer.createEl("button", { attr: { type: "button" } }); const icon = back.createSpan(); setIcon(icon, "arrow-left"); back.createSpan({ text: "上一步" });
    back.disabled = this.index === 0 || this.saving; back.addEventListener("click", () => { if (this.index > 0) { this.index--; this.render(); } });
    const last = this.index === this.survey.questions.length - 1;
    const forward = footer.createEl("button", { text: last ? "完成并保存" : "下一步", cls: "mod-cta", attr: { type: "button" } });
    forward.disabled = this.saving; forward.addEventListener("click", () => void this.next());
  }

  private async next(): Promise<void> {
    if (this.saving) return;
    const q = this.survey.questions[this.index]; const answer = this.answers[q.id];
    const empty = answer == null || (typeof answer === "string" && !answer.trim()) || (Array.isArray(answer) && answer.length === 0);
    if (q.required && empty) { new Notice(`请先回答“${q.label}”。`); return; }
    if (this.index < this.survey.questions.length - 1) { this.index++; this.render(); return; }
    this.saving = true; this.render();
    try { await this.onSubmit(structuredClone(this.answers)); this.close(); }
    catch { this.saving = false; this.render(); }
  }
  private options(q: SurveyQuestion): SurveyOption[] { return (q.options ?? []).map(x => typeof x === "string" ? { label: x, value: x } : x); }
}
