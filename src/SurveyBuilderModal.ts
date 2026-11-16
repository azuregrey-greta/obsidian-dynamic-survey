/*
 * 「新建问卷」逐步录入弹窗:问题 → 回答方式(选择单/多选、手填)→ 下一个问题 → 完成创建。
 * 桌面与移动端共用(复用 dynamic-survey-modal 的宽度/滚动/折叠屏规则)。
 */
import { App, Modal, Notice } from "obsidian";
import type DynamicSurveyPlugin from "./main";
import { SurveyDraft, ANSWER_KIND_LABELS, AnswerKind, buildSurveyFromDraft } from "./SurveyCollection";

export function openSurveyBuilder(app: App, plugin: DynamicSurveyPlugin, onDone?: () => void): void { new SurveyBuilderModal(app, plugin, onDone).open(); }

export class SurveyBuilderModal extends Modal {
  private draft: SurveyDraft = {
    name: "",
    folder: "问卷收集",
    questions: [{ label: "", kind: "single", options: ["", ""], required: true }]
  };
  private statusEl!: HTMLElement;

  constructor(app: App, private readonly plugin: DynamicSurveyPlugin, private readonly onDone?: () => void) {
    super(app);
    this.modalEl.addClass("dynamic-survey-modal");
  }
  onOpen(): void { this.renderForm(); }
  onClose(): void { this.contentEl.empty(); }

  private setStatus(message: string, isError: boolean): void {
    this.statusEl.empty();
    this.statusEl.setText(message);
    this.statusEl.toggleClass("is-error", isError);
  }

  private renderForm(): void {
    this.contentEl.empty(); this.contentEl.scrollTop = 0;
    this.contentEl.createEl("h2", { text: "新建问卷(逐步录入)" });
    this.contentEl.createEl("p", { text: "一个问题一个问题地录入:填问题 → 选回答方式(选择题要规定单选/多选)→「下一个问题」。", cls: "dynamic-survey-description" });

    const basics = this.contentEl.createDiv({ cls: "dynamic-survey-builder-basics" });
    const nameRow = basics.createDiv({ cls: "dynamic-survey-builder-row" });
    nameRow.createSpan({ text: "问卷名称", cls: "dynamic-survey-builder-label" });
    const nameInput = nameRow.createEl("input", { type: "text", attr: { placeholder: "例如:睡前复盘" } });
    nameInput.value = this.draft.name;
    nameInput.addEventListener("input", () => { this.draft.name = nameInput.value; });

    const folderRow = basics.createDiv({ cls: "dynamic-survey-builder-row" });
    folderRow.createSpan({ text: "保存文件夹", cls: "dynamic-survey-builder-label" });
    const folderInput = folderRow.createEl("input", { type: "text", attr: { placeholder: "问卷收集" } });
    folderInput.value = this.draft.folder;
    folderInput.addEventListener("input", () => { this.draft.folder = folderInput.value; });

    // 题目卡片
    this.draft.questions.forEach((q, index) => this.renderQuestionCard(index));

    const addRow = this.contentEl.createDiv({ cls: "dynamic-survey-builder-add-row" });
    const addBtn = addRow.createEl("button", { text: "＋ 下一个问题", attr: { type: "button" } });
    addBtn.addEventListener("click", () => {
      this.draft.questions.push({ label: "", kind: "single", options: ["", ""], required: true });
      this.renderForm();
    });

    this.statusEl = this.contentEl.createDiv({ cls: "dynamic-survey-validation-message" });

    const footer = this.contentEl.createDiv({ cls: "dynamic-survey-footer" });
    const cancel = footer.createEl("button", { text: "取消", attr: { type: "button" } });
    cancel.addEventListener("click", () => this.close());
    const submit = footer.createEl("button", { text: "完成创建", cls: "mod-cta", attr: { type: "button" } });
    submit.addEventListener("click", () => void this.submit());
  }

  private renderQuestionCard(index: number): void {
    const q = this.draft.questions[index];
    const card = this.contentEl.createDiv({ cls: "dynamic-survey-builder-question" });

    const head = card.createDiv({ cls: "dynamic-survey-builder-row" });
    head.createSpan({ text: `第 ${index + 1} 题`, cls: "dynamic-survey-builder-question-no" });
    const spacer = head.createDiv({ cls: "dynamic-survey-builder-head-spacer" });
    if (index > 0) {
      const up = spacer.createEl("button", { text: "↑", attr: { type: "button", title: "上移" } });
      up.addEventListener("click", () => { [this.draft.questions[index - 1], this.draft.questions[index]] = [this.draft.questions[index], this.draft.questions[index - 1]]; this.renderForm(); });
    }
    if (index < this.draft.questions.length - 1) {
      const down = spacer.createEl("button", { text: "↓", attr: { type: "button", title: "下移" } });
      down.addEventListener("click", () => { [this.draft.questions[index + 1], this.draft.questions[index]] = [this.draft.questions[index], this.draft.questions[index + 1]]; this.renderForm(); });
    }
    if (this.draft.questions.length > 1) {
      const del = spacer.createEl("button", { text: "×", cls: "dynamic-survey-remove-btn", attr: { type: "button", title: "删除本题" } });
      del.addEventListener("click", () => { this.draft.questions.splice(index, 1); this.renderForm(); });
    }

    const labelRow = card.createDiv({ cls: "dynamic-survey-builder-row" });
    const labelInput = labelRow.createEl("input", { type: "text", attr: { placeholder: "问题文本,例如:今天效率如何?" } });
    labelInput.value = q.label;
    labelInput.addEventListener("input", () => { q.label = labelInput.value; });

    const kindRow = card.createDiv({ cls: "dynamic-survey-builder-row" });
    kindRow.createSpan({ text: "回答方式", cls: "dynamic-survey-builder-label" });
    const select = kindRow.createEl("select");
    (Object.keys(ANSWER_KIND_LABELS) as AnswerKind[]).forEach(kind => {
      const opt = select.createEl("option", { text: ANSWER_KIND_LABELS[kind] });
      opt.value = kind;
    });
    select.value = q.kind;
    select.addEventListener("change", () => {
      q.kind = select.value as AnswerKind;
      if ((q.kind === "single" || q.kind === "multiple") && q.options.length === 0) q.options = ["", ""];
      this.renderForm();
    });

    if (q.kind === "single" || q.kind === "multiple") {
      card.createDiv({ text: `选项(${q.kind === "single" ? "单选" : "多选"}):`, cls: "dynamic-survey-builder-label" });
      q.options.forEach((optValue, optIndex) => {
        const row = card.createDiv({ cls: "dynamic-survey-option-row" });
        const input = row.createEl("input", { type: "text", attr: { placeholder: `选项 ${optIndex + 1},可含 emoji` } });
        input.value = optValue;
        input.addEventListener("input", () => { q.options[optIndex] = input.value; });
        const remove = row.createEl("button", { text: "×", cls: "dynamic-survey-remove-btn", attr: { type: "button", title: "删除选项" } });
        remove.addEventListener("click", () => { q.options.splice(optIndex, 1); this.renderForm(); });
      });
      const addOptRow = card.createDiv({ cls: "dynamic-survey-builder-row" });
      const addOpt = addOptRow.createEl("button", { text: "＋ 添加选项", attr: { type: "button" } });
      addOpt.addEventListener("click", () => { q.options.push(""); this.renderForm(); });
    }

    const requiredRow = card.createDiv({ cls: "dynamic-survey-builder-row" });
    const requiredLabel = requiredRow.createEl("label", { cls: "dynamic-survey-builder-checkbox" });
    const checkbox = requiredLabel.createEl("input", { type: "checkbox" });
    checkbox.checked = q.required;
    requiredLabel.createSpan({ text: "必填" });
    checkbox.addEventListener("change", () => { q.required = checkbox.checked; });
  }

  private async submit(): Promise<void> {
    const { survey, errors } = buildSurveyFromDraft(this.draft);
    if (errors.length || !survey) { this.setStatus(errors.join("\n"), true); return; }
    const result = await this.plugin.addUserSurvey(survey);
    if (!result.ok) { this.setStatus(result.error ?? "创建失败。", true); return; }
    new Notice(`已创建问卷「${result.survey!.name}」(${result.survey!.questions.length} 题)。「打开动态问卷」立即可用,专属命令需重载插件后出现。`);
    this.onDone?.();
    this.close();
  }
}
