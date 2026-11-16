import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import DynamicSurveyPlugin, { DEFAULT_SETTINGS } from "./main";
import { DynamicSurveySettings } from "./types";
import { BUILT_IN_TEMPLATES } from "./BuiltInSurvey";
import { MAX_USER_SURVEYS, countUserSurveys, isBuiltInSurvey } from "./SurveyCollection";
import { openSurveyBuilder } from "./SurveyBuilderModal";
import { openSurveyImport } from "./SurveyImportModal";
import { deepClone } from "./utils";

export class DynamicSurveySettingTab extends PluginSettingTab {
  private pendingDeleteId: string | null = null;
  constructor(app: App, private readonly plugin: DynamicSurveyPlugin) { super(app, plugin); }
  display(): void {
    this.containerEl.empty(); this.containerEl.createEl("h2", { text: "动态问卷设置" });
    this.containerEl.createEl("p", { text: "每个问卷通过 targetFolder 设置保存文件夹；笔记名默认是 {{date}} {{survey_name}}。同日重复填写默认生成 (2)、(3)。" });
    this.renderBuiltInSection();
    this.renderCollectionSection();
    this.renderJsonEditor();
  }

  /** 内置模板区：状态 + 恢复内置模板（离线）+ 存为副本。 */
  private renderBuiltInSection(): void {
    const section = this.containerEl.createDiv({ cls: "dynamic-survey-builtin-section" });
    section.createEl("h3", { text: "内置模板" });
    section.createEl("p", { text: "出厂模板随插件内置，恢复内置模板不需要网络，桌面端与 Android 移动端行为一致。", cls: "dynamic-survey-builtin-hint" });
    for (const factory of BUILT_IN_TEMPLATES) {
      const copy = this.plugin.settings.surveys.find(s => s.id === factory.id);
      const statusText = copy ? `工作副本已存在（${copy.enabled === false ? "已停用" : "启用中"}，可自由编辑）。` : "暂无工作副本，可一键恢复。";
      new Setting(section)
        .setName(factory.name)
        .setDesc(`${factory.description ?? ""}（${statusText}）`)
        .addButton(b => b.setButtonText("恢复内置模板").onClick(async () => {
          const restored = this.plugin.restoreBuiltInTemplate(factory.id);
          if (!restored) { new Notice("未找到该内置模板。"); return; }
          await this.plugin.saveSettings();
          this.display();
          new Notice(`已恢复内置模板「${restored.name}」的工作副本。`);
        }))
        .addButton(b => b.setButtonText("存为副本").onClick(async () => {
          const duplicated = this.plugin.duplicateSurvey(factory.id);
          if (!duplicated) { new Notice("没有可复制的工作副本，请先恢复内置模板。"); return; }
          await this.plugin.saveSettings();
          this.display();
          new Notice(`已创建副本「${duplicated.name}」（id: ${duplicated.id}）。`);
        }));
    }
  }

  /** 问卷收集区:列表 + 逐步录入 + JSON 导入,最多 10 个(内置模板不计入)。 */
  private renderCollectionSection(): void {
    const section = this.containerEl.createDiv({ cls: "dynamic-survey-collection-section" });
    const used = countUserSurveys(this.plugin.settings.surveys);
    section.createEl("h3", { text: `问卷收集(${used}/${MAX_USER_SURVEYS})` });
    section.createEl("p", {
      text: "收集其他问卷:逐步录入(问题 → 回答方式 → 下一个问题),或直接粘贴 JSON 导入。最多收集 10 个,内置模板不计入。",
      cls: "dynamic-survey-builtin-hint"
    });
    new Setting(section).setName("添加问卷")
      .addButton(b => b.setButtonText("＋ 新建问卷(逐步录入)").setCta().onClick(() => openSurveyBuilder(this.app, this.plugin, () => this.display())))
      .addButton(b => b.setButtonText("粘贴 JSON 导入").onClick(() => openSurveyImport(this.app, this.plugin, () => this.display())));
    for (const survey of this.plugin.settings.surveys) {
      const tag = isBuiltInSurvey(survey) ? "内置" : "收集";
      const row = new Setting(section)
        .setName(survey.name)
        .setDesc(`[${tag}] ${survey.questions.length} 题 · ${survey.enabled === false ? "已停用" : "启用中"}`);
      // 保存位置填入框:改完自动生效
      const folderInput = row.controlEl.createEl("input", {
        type: "text",
        cls: "dynamic-survey-folder-input",
        attr: { placeholder: "保存位置,例如:08 日记/01 问心日记", "aria-label": `${survey.name} 保存位置` }
      });
      folderInput.value = survey.targetFolder;
      folderInput.addEventListener("change", async () => {
        const next = folderInput.value.trim();
        if (!next || next === survey.targetFolder) { folderInput.value = survey.targetFolder; return; }
        survey.targetFolder = next;
        await this.plugin.saveSettings();
        new Notice(`「${survey.name}」保存位置已更新:${next}`);
      });
      row.addButton(b => b.setButtonText(survey.enabled === false ? "启用" : "停用").onClick(async () => {
        survey.enabled = survey.enabled === false;
        await this.plugin.saveSettings();
        this.display();
      }))
        .addButton(b => b.setButtonText("删除").setWarning().onClick(async () => {
          if (this.pendingDeleteId === survey.id) {
            this.pendingDeleteId = null;
            const removed = await this.plugin.removeSurvey(survey.id);
            if (removed) new Notice(`已删除「${survey.name}」。`);
            this.display();
          } else {
            this.pendingDeleteId = survey.id;
            b.setButtonText("确认删除?");
            window.setTimeout(() => { this.pendingDeleteId = null; b.setButtonText("删除"); }, 4000);
          }
        }));
    }
  }

  private renderJsonEditor(): void {
    let draft = JSON.stringify(this.plugin.settings, null, 2);
    const editor = this.containerEl.createEl("textarea", { cls: "dynamic-survey-json-editor", attr: { rows: "30", spellcheck: "false" } }); editor.value = draft; editor.addEventListener("input", () => draft = editor.value);
    const status = this.containerEl.createDiv({ cls: "dynamic-survey-validation-message" });
    const parse = (): DynamicSurveySettings | null => { status.empty(); try { const value = JSON.parse(draft) as DynamicSurveySettings; const errors = this.plugin.validateSettings(value); if (errors.length) { status.setText(errors.join("\n")); status.addClass("is-error"); return null; } status.setText(`配置有效，共 ${value.surveys.length} 个问卷。`); return value; } catch (e) { status.setText(`JSON 错误：${e instanceof Error ? e.message : String(e)}`); status.addClass("is-error"); return null; } };
    new Setting(this.containerEl).setName("检查配置").addButton(b => b.setButtonText("检查 JSON").onClick(() => { parse(); }));
    new Setting(this.containerEl).setName("保存配置").setDesc("固定入口立即读取新配置；专属命令需重新加载插件后刷新。").addButton(b => b.setButtonText("保存").setCta().onClick(async () => { const value = parse(); if (!value) return; this.plugin.settings = value; await this.plugin.saveSettings(); new Notice("配置已保存。"); this.display(); }));
    new Setting(this.containerEl).setName("重置默认配置").addButton(b => b.setButtonText("重置").setWarning().onClick(() => { draft = JSON.stringify(deepClone(DEFAULT_SETTINGS), null, 2); editor.value = draft; status.empty(); }));
  }
}
