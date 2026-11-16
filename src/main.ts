import { Notice, Plugin, SuggestModal } from "obsidian";
import { DynamicSurveySettings, SurveyAnswers, SurveyDefinition } from "./types";
import { SurveyWizardModal } from "./SurveyWizardModal";
import { SurveyFileWriter } from "./SurveyFileWriter";
import { DynamicSurveySettingTab } from "./SettingTab";
import { BUILT_IN_MOOD_REVIEW_ID, instantiateBuiltInTemplate } from "./BuiltInSurvey";
import { MAX_USER_SURVEYS, countUserSurveys, generateSurveyId } from "./SurveyCollection";
import { deepClone } from "./utils";

/** 默认设置：由随插件分发的内置模板实例化而来的初始工作副本。 */
export const DEFAULT_SETTINGS: DynamicSurveySettings = { surveys: [instantiateBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)!] };

export default class DynamicSurveyPlugin extends Plugin {
  settings: DynamicSurveySettings = deepClone(DEFAULT_SETTINGS);
  private writer!: SurveyFileWriter;
  async onload(): Promise<void> {
    await this.loadSettings(); this.writer = new SurveyFileWriter(this.app); this.addSettingTab(new DynamicSurveySettingTab(this.app, this));
    this.addCommand({ id: "open-survey-picker", name: "打开动态问卷", callback: () => new SurveyPicker(this, this.enabled()).open() });
    const seen = new Set<string>();
    for (const survey of this.enabled()) {
      const id = `run-survey-${survey.id.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`;
      if (seen.has(id)) continue; seen.add(id);
      this.addCommand({ id, name: `填写问卷: ${survey.name}`, callback: () => this.run(deepClone(survey)) });
    }
  }
  enabled(): SurveyDefinition[] { return this.settings.surveys.filter(s => s.enabled !== false); }
  run(survey: SurveyDefinition): void {
    const errors = this.validateSurvey(survey); if (errors.length) { new Notice(`问卷配置无效：${errors[0]}`); return; }
    new SurveyWizardModal(this.app, survey, async answers => this.save(survey, answers)).open();
  }
  /**
   * 恢复内置模板：用随插件分发的出厂定义（离线、不依赖网络）覆盖现有工作副本；
   * 若尚无工作副本则新建一个。返回恢复后的可编辑副本。
   */
  restoreBuiltInTemplate(id: string = BUILT_IN_MOOD_REVIEW_ID): SurveyDefinition | null {
    const copy = instantiateBuiltInTemplate(id);
    if (!copy) return null;
    const index = this.settings.surveys.findIndex(s => s.id === id);
    if (index >= 0) this.settings.surveys[index] = copy; else this.settings.surveys.push(copy);
    return copy;
  }
  /** 复制一份现有问卷作为新副本（id 自动去重，默认启用）。 */
  duplicateSurvey(id: string): SurveyDefinition | null {
    const source = this.settings.surveys.find(s => s.id === id);
    if (!source) return null;
    const copy = deepClone(source);
    let suffix = 2;
    let newId = `${id}-copy`;
    while (this.settings.surveys.some(s => s.id === newId)) newId = `${id}-copy-${suffix++}`;
    copy.id = newId; copy.name = `${source.name} 副本`; copy.enabled = true;
    this.settings.surveys.push(copy);
    return copy;
  }
  /** 收集一份问卷(逐步录入 / JSON 导入共用):id 去重 + 校验 + 最多 10 个(内置模板不计入)+ 持久化。 */
  async addUserSurvey(def: SurveyDefinition): Promise<{ ok: boolean; survey?: SurveyDefinition; error?: string }> {
    const ids = new Set(this.settings.surveys.map(s => s.id));
    // 逐步录入/导入可能不带合法 id(问卷名常是中文),先补齐再校验。
    if (!def.id || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(def.id) || ids.has(def.id)) def.id = generateSurveyId(ids);
    const errors = this.validateSurvey(def);
    if (errors.length) return { ok: false, error: errors[0] };
    if (countUserSurveys(this.settings.surveys) >= MAX_USER_SURVEYS) {
      return { ok: false, error: `问卷收集已满(最多 ${MAX_USER_SURVEYS} 个,内置模板不计入)。请先删除不需要的问卷。` };
    }
    this.settings.surveys.push(def);
    await this.saveSettings();
    return { ok: true, survey: def };
  }
  /** 删除一份问卷(含内置模板的工作副本;出厂定义仍在,可随时恢复)。 */
  async removeSurvey(id: string): Promise<boolean> {
    const before = this.settings.surveys.length;
    this.settings.surveys = this.settings.surveys.filter(s => s.id !== id);
    if (this.settings.surveys.length === before) return false;
    await this.saveSettings();
    return true;
  }
  private async save(survey: SurveyDefinition, answers: SurveyAnswers): Promise<void> {
    try {
      const values = this.values(survey, answers);
      const note = this.replaceTokens(survey.template, values);
      const nameTemplate = survey.fileNameTemplate?.trim() || "{{date}} {{survey_name}}";
      const fileName = this.replaceTokens(nameTemplate, values);
      const file = await this.writer.write(survey.targetFolder, fileName, note, survey.collisionMode ?? "increment");
      new Notice(`已保存：${file.path}`);
    } catch (e) { const message = e instanceof Error ? e.message : String(e); new Notice(`保存失败：${message}`, 7000); throw e; }
  }
  private values(survey: SurveyDefinition, answers: SurveyAnswers): Record<string, string> {
    const now = new Date(); const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const time = `${String(now.getHours()).padStart(2,"0")}-${String(now.getMinutes()).padStart(2,"0")}-${String(now.getSeconds()).padStart(2,"0")}`;
    const values: Record<string,string> = { date, time, datetime: `${date} ${time}`, survey_name: survey.name };
    for (const q of survey.questions) { const a = answers[q.id]; values[q.id] = Array.isArray(a) ? a.join(survey.multipleSeparator ?? "、") : a ?? ""; }
    return values;
  }
  private replaceTokens(text: string, values: Record<string,string>): string { return text.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*\}\}/g, (_m, key: string) => values[key] ?? ""); }
  validateSettings(settings: DynamicSurveySettings): string[] {
    if (!settings || !Array.isArray(settings.surveys)) return ["配置必须包含 surveys 数组。"]; const errors: string[] = []; const ids = new Set<string>();
    settings.surveys.forEach((s, i) => { this.validateSurvey(s).forEach(e => errors.push(`第 ${i+1} 个问卷：${e}`)); if (ids.has(s.id)) errors.push(`问卷 ID 重复：${s.id}`); ids.add(s.id); }); return errors;
  }
  validateSurvey(s: SurveyDefinition): string[] {
    const e: string[] = []; if (!s.id || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s.id)) e.push("id 格式无效。"); if (!s.name?.trim()) e.push("缺少 name。");
    if (typeof s.targetFolder !== "string") e.push("缺少 targetFolder。"); if (!s.template) e.push("缺少 template。"); if (!Array.isArray(s.questions) || !s.questions.length) e.push("至少需要一道题。");
    const ids = new Set<string>(); for (const q of s.questions ?? []) { if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(q.id)) e.push(`题目 ID 无效：${q.id}`); if (ids.has(q.id)) e.push(`题目 ID 重复：${q.id}`); ids.add(q.id); if ((q.type === "single" || q.type === "multiple") && !q.options?.length) e.push(`题目 ${q.id} 缺少 options。`); }
    return e;
  }
  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as DynamicSurveySettings | null;
    if (data && Array.isArray(data.surveys)) { this.settings = data; return; }
    // 首次安装：把内置模板自动实例化成用户的工作副本，并立即持久化。
    this.settings = { surveys: [instantiateBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)!] };
    await this.saveData(this.settings);
  }
  async saveSettings(): Promise<void> { await this.saveData(this.settings); }
}

class SurveyPicker extends SuggestModal<SurveyDefinition> {
  constructor(private plugin: DynamicSurveyPlugin, private surveys: SurveyDefinition[]) { super(plugin.app); this.setPlaceholder("选择要填写的问卷"); }
  getSuggestions(query: string): SurveyDefinition[] { const q = query.toLowerCase(); return this.surveys.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)); }
  renderSuggestion(s: SurveyDefinition, el: HTMLElement): void { el.createEl("div", { text: s.name }); if (s.description) el.createEl("small", { text: s.description }); }
  onChooseSuggestion(s: SurveyDefinition): void { this.plugin.run(deepClone(s)); }
}
