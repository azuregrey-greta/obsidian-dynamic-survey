/*
 * 懒人 JSON 导入窗口:直接粘贴 JSON 转成问卷(单个对象 / 数组 / {"surveys":[…]})。
 * 导入受「最多收集 10 个」限制;逐份校验,失败项在窗口内提示。
 */
import { App, Modal, Notice } from "obsidian";
import type DynamicSurveyPlugin from "./main";
import { MAX_USER_SURVEYS, countUserSurveys, normalizeImportedSurvey, parseImportPayload } from "./SurveyCollection";
import { SurveyDefinition } from "./types";

export function openSurveyImport(app: App, plugin: DynamicSurveyPlugin): void { new SurveyImportModal(app, plugin).open(); }

export class SurveyImportModal extends Modal {
  private statusEl!: HTMLElement;

  constructor(app: App, private readonly plugin: DynamicSurveyPlugin) {
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
    this.contentEl.createEl("h2", { text: "粘贴 JSON 导入问卷" });
    this.contentEl.createEl("p", {
      text: "适合已有 JSON 配置的懒人:直接粘贴并导入,自动补默认值和 id。支持单个问卷对象、问卷数组或 {\"surveys\":[…]}。",
      cls: "dynamic-survey-description"
    });
    const textarea = this.contentEl.createEl("textarea", {
      cls: "dynamic-survey-textarea dynamic-survey-import-editor",
      attr: { rows: "14", spellcheck: "false", placeholder: '{\n  "name": "晨间检查",\n  "targetFolder": "问卷收集",\n  "questions": [\n    { "id": "q1", "label": "睡得好吗?", "type": "single", "options": ["😴 很好", "😯 一般", "😪 很差"] },\n    { "id": "q2", "label": "想说什么?", "type": "textarea" }\n  ]\n}' }
    });
    this.statusEl = this.contentEl.createDiv({ cls: "dynamic-survey-validation-message" });
    const footer = this.contentEl.createDiv({ cls: "dynamic-survey-footer" });
    const cancel = footer.createEl("button", { text: "取消", attr: { type: "button" } });
    cancel.addEventListener("click", () => this.close());
    const submit = footer.createEl("button", { text: "导入", cls: "mod-cta", attr: { type: "button" } });
    submit.addEventListener("click", () => void this.submit(textarea.value));
  }

  private async submit(text: string): Promise<void> {
    const payload = parseImportPayload(text);
    if (payload.error || !payload.surveys) { this.setStatus(payload.error ?? "无法解析。", true); return; }

    const ids = new Set(this.plugin.settings.surveys.map(s => s.id));
    const normalized: SurveyDefinition[] = [];
    const normalizeErrors: string[] = [];
    for (const raw of payload.surveys) {
      const result = normalizeImportedSurvey(raw, ids);
      if (result.error || !result.survey) normalizeErrors.push(result.error ?? "未知错误。");
      else normalized.push(result.survey);
    }
    if (normalizeErrors.length) { this.setStatus(normalizeErrors.join("\n"), true); return; }

    const used = countUserSurveys(this.plugin.settings.surveys);
    const free = MAX_USER_SURVEYS - used;
    if (normalized.length > free) {
      this.setStatus(`问卷收集已满:最多 ${MAX_USER_SURVEYS} 个,当前 ${used} 个,本次要导入 ${normalized.length} 个(还可收集 ${free} 个)。请先删除不需要的问卷。`, true);
      return;
    }

    let imported = 0;
    const failures: string[] = [];
    for (const survey of normalized) {
      const result = await this.plugin.addUserSurvey(survey);
      if (result.ok) imported++;
      else failures.push(`「${survey.name}」:${result.error}`);
    }
    if (failures.length) { this.setStatus(`导入完成 ${imported} 个,失败 ${failures.length} 个:\n${failures.join("\n")}`, true); return; }
    new Notice(`已导入 ${imported} 个问卷。「打开动态问卷」立即可用,专属命令需重载插件后出现。`);
    this.close();
  }
}
