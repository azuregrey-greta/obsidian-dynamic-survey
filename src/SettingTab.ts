import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import DynamicSurveyPlugin, { DEFAULT_SETTINGS } from "./main";
import { DynamicSurveySettings } from "./types";
import { BUILT_IN_TEMPLATES } from "./BuiltInSurvey";
import { deepClone } from "./utils";

export class DynamicSurveySettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: DynamicSurveyPlugin) { super(app, plugin); }
  display(): void {
    this.containerEl.empty(); this.containerEl.createEl("h2", { text: "动态问卷设置" });
    this.containerEl.createEl("p", { text: "每个问卷通过 targetFolder 设置保存文件夹；笔记名默认是 {{date}} {{survey_name}}。同日重复填写默认生成 (2)、(3)。" });
    this.renderBuiltInSection();
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
