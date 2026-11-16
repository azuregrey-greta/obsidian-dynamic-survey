/*
 * 产物冒烟测试：直接加载 dist 里的真实 main.js（CJS），
 * require("obsidian") 解析到打包好的桩模块，模拟 Obsidian 运行时。
 */
const assert = require("node:assert");
const path = require("node:path");

const obsidian = require("obsidian");
const pluginModule = require("./main.js");

async function main() {
  const PluginClass = pluginModule.default;
  assert(typeof PluginClass === "function", "main.js 应导出插件类");

  const vault = new obsidian.Vault();
  const app = { vault, workspace: {} };
  const plugin = new PluginClass(app);
  assert(plugin.manifest.id === "dynamic-survey", "manifest 默认值");

  // 首次安装
  await plugin.loadSettings();
  assert(plugin.settings.surveys.length === 1, "首次安装实例化内置模板");
  const survey = plugin.settings.surveys[0];
  assert(survey.id === "mood_review", "内置问卷 id");
  assert(survey.questions[1].type === "multiple", "今日状态为多选");
  assert(survey.questions[1].options.length === 10, "10 个 emoji 选项");

  // 完整保存流（真实打包产物；save 为插件运行时方法）
  await plugin.onload();
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  await plugin.save(survey, { env: "☔ 糟糕", status: ["😰 焦虑", "🫣 心累"], f1: "验证产物", f3: "紧张 😅" });

  const p1 = `复盘/情绪记录/${date} 今日情绪复盘.md`;
  assert(vault.paths().includes(p1), `产物应创建 ${p1}，实际 ${JSON.stringify(vault.paths())}`);
  const content = vault.getContent(p1);
  assert(content.includes("☔ 糟糕") && content.includes("😰 焦虑、🫣 心累"), "中文/emoji 与 multiple 连接符正确");
  assert(content.includes("Fact【1】今天发生了什么事情？\n验证产物"), "4F 七问模板渲染");

  // 同日重名
  await plugin.save(survey, { env: "🌟 好", status: ["😁 开心"], f1: "第二次" });
  assert(vault.paths().includes(`复盘/情绪记录/${date} 今日情绪复盘 (2).md`), "同日第二份 → (2)");

  // 恢复内置模板（离线）
  survey.name = "被改坏的名字";
  const restored = plugin.restoreBuiltInTemplate();
  assert(restored.name === "今日情绪复盘", "恢复内置模板（离线）");

  console.log("✓ shipped main.js smoke passed");
}

main().catch(e => { console.error("✗ shipped smoke failed:", e.message); process.exit(1); });
