/*
 * 浏览器测试台入口：把插件源码 + Obsidian 桩装进真实 DOM，
 * 暴露 window.harness 供自动化驱动（桌面 + app.emulateMobile 移动端模拟）。
 */
import { installGlobalApp, Vault, noticeLog, Platform } from "./obsidian-stub";
import DynamicSurveyPlugin from "../src/main";
import { SurveyWizardModal } from "../src/SurveyWizardModal";
import { DynamicSurveySettingTab } from "../src/SettingTab";
import { deepClone } from "../src/utils";
import { BUILT_IN_MOOD_REVIEW_ID } from "../src/BuiltInSurvey";

/* 控制台错误 / 未捕获异常收集 —— “无 console 错误”验收门 */
const consoleErrors: string[] = [];
const origError = console.error.bind(console);
console.error = (...args: unknown[]) => { consoleErrors.push(args.map(a => (a instanceof Error ? a.stack ?? a.message : String(a))).join(" ")); origError(...args); };
window.addEventListener("error", e => consoleErrors.push(`window.onerror: ${e.message}`));
window.addEventListener("unhandledrejection", e => consoleErrors.push(`unhandledrejection: ${String(e.reason)}`));

const vault = new Vault();
const app = { vault, workspace: {} };
installGlobalApp(app as never);

const plugin = new DynamicSurveyPlugin(app as never);
void (async () => {
  await plugin.onload();
})();

/* 一个用于滚动验收的长问卷（20 题） */
function addLongSurvey(): void {
  const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i + 1}`, label: `第 ${i + 1} 题：今天的感觉？`, type: i % 4 === 3 ? "textarea" : i % 4 === 2 ? "text" : i % 4 === 1 ? "multiple" : "single", required: false, options: ["选项甲", "选项乙 🌈", "选项丙", "选项丁 🙂"] })) as never[];
  plugin.settings.surveys.push({
    id: "long_survey", name: "超长问卷（滚动验收）", description: "20 题滚动测试", enabled: true,
    targetFolder: "测试/长问卷", fileNameTemplate: "{{date}} {{survey_name}}", collisionMode: "increment", multipleSeparator: "、",
    template: "# {{date}} {{survey_name}}\n", questions
  });
}

function openSettings(): void {
  const tab = new DynamicSurveySettingTab(app as never, plugin);
  tab.display();
  tab.containerEl.id = "settings-panel";
  document.body.appendChild(tab.containerEl);
}

/* 供自动化点击的便捷入口：返回当前 modal 中可点的按钮文本列表 */
function modalButtons(): string[] {
  const modal = document.querySelector(".dynamic-survey-modal");
  if (!modal) return [];
  return [...modal.querySelectorAll("button")].map(b => (b.textContent ?? "").trim());
}

function currentQuestion(): { label: string; type: string; index: number } | null {
  const modal = document.querySelector(".dynamic-survey-modal");
  if (!modal) return null;
  const label = modal.querySelector("h2")?.textContent ?? "";
  const type = modal.querySelector(".dynamic-survey-textarea, .dynamic-survey-text-input") ? (modal.querySelector(".dynamic-survey-textarea") ? "textarea" : "text") : (modal.querySelector("input[type=checkbox]") ? "multiple" : "single");
  const index = Number((modal.querySelector(".dynamic-survey-progress-text")?.textContent ?? "0/0").split("/")[0]) - 1;
  return { label, type, index };
}

window.addEventListener("DOMContentLoaded", () => {
  const root = (window as unknown as { harness?: unknown });
  root.harness = {
    plugin, vault, app, Platform, noticeLog, consoleErrors,
    runSurvey: (id: string) => { const s = plugin.settings.surveys.find(x => x.id === id); if (!s) throw new Error(`no survey: ${id}`); plugin.run(deepClone(s)); },
    openSettings,
    addLongSurvey,
    addTextSurvey: () => {
      plugin.settings.surveys.push({
        id: "text_flow", name: "文本流转问卷", description: "单行输入回车推进", enabled: true,
        targetFolder: "测试/文本流转", fileNameTemplate: "{{date}} {{survey_name}}", collisionMode: "increment", multipleSeparator: "、",
        template: "# {{survey_name}}\n{{note}}\n", questions: [
          { id: "note", label: "一句话记录", type: "text", required: true, placeholder: "输入后按键盘回车" },
        ],
      });
    },
    modalButtons,
    currentQuestion,
    dumpVault: () => ({ paths: vault.paths(), contents: vault.dump() }),
    openModalDirectly: () => { const s = plugin.settings.surveys.find(x => x.id === BUILT_IN_MOOD_REVIEW_ID); new SurveyWizardModal(app as never, deepClone(s!), async () => {}).open(); },
  };
  (window as unknown as { harnessReady: boolean }).harnessReady = true;
  document.getElementById("status")!.textContent = "harness ready";
});
