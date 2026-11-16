/*
 * Node 单元测试：不打 UI，直接验证业务逻辑与内置模板架构。
 * 运行：node test/out/unit.cjs（由 esbuild.test.mjs 打包后执行）
 */
import { Notice, Platform, TFolder, Vault, noticeLog } from "./obsidian-stub";
import DynamicSurveyPlugin, { DEFAULT_SETTINGS } from "../src/main";
import { BUILT_IN_MOOD_REVIEW, BUILT_IN_MOOD_REVIEW_ID, BUILT_IN_TEMPLATES, getBuiltInTemplate, instantiateBuiltInTemplate } from "../src/BuiltInSurvey";
import { SurveyFileWriter } from "../src/SurveyFileWriter";
import { SurveyDefinition } from "../src/types";

let passed = 0;
const failures: string[] = [];
const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>): void { tests.push({ name, fn }); }
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }
function assertEquals(actual: unknown, expected: unknown, msg: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg}\n  实际: ${JSON.stringify(actual)}\n  期望: ${JSON.stringify(expected)}`);
}
function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------- */
/* 1. 内置（出厂）模板                                                */
/* ---------------------------------------------------------------- */

test("出厂模板随源码分发：id/name/三道题类型正确", () => {
  const t = BUILT_IN_MOOD_REVIEW;
  assert(t.id === "mood_review", "id 应为 mood_review");
  assert(t.name === "今日情绪复盘", "name 应为 今日情绪复盘");
  assert(t.targetFolder === "复盘/情绪记录", "每个问卷独立 targetFolder");
  assert(t.fileNameTemplate === "{{date}} {{survey_name}}", "默认笔记名模板");
  assert(t.collisionMode === "increment", "默认 increment");
  assertEquals(t.questions.map(q => q.type), ["single", "multiple", "textarea", "textarea", "textarea", "textarea", "textarea", "textarea", "textarea"], "题目类型应为 single/multiple + 7 个 textarea");
  assertEquals(t.questions.map(q => q.id), ["env", "status", "f1", "f2", "f3", "f4", "f5", "f6", "f7"], "题目 id");
});

test("今日状态内置 10 个 emoji 选项（与原始快捷指令一致）", () => {
  const status = BUILT_IN_MOOD_REVIEW.questions.find(q => q.id === "status")!;
  const options = status.options as string[];
  assert(options.length === 10, `应有 10 个选项，实际 ${options.length}`);
  assertEquals(options, ["👍 有收获", "👎 被掏空", "😰 焦虑", "😎 安宁", "🐷 轻松", "🐶 劳累", "😁 开心", "🫣 心累", "🥛 养生", "🍻 放纵"], "10 个 emoji 状态");
});

test("4F 情绪记录为 7 问（Fact×2 / Feel×2 / Focus×2 / Future×1），文案与原始快捷指令一致", () => {
  const qs = BUILT_IN_MOOD_REVIEW.questions;
  assertEquals(qs.slice(2).map(q => q.label), [
    "Fact【1】今天发生了什么事情？",
    "Fact【2】过程中我印象最深刻的是什么？",
    "Feel【3】我体验到哪些情绪感受？",
    "Feel【4】我感觉到最享受的是什么？",
    "Focus【5】我有哪些新的联想？",
    "Focus【6】我有哪些积极的变化正在发生着？",
    "Future【7】未来我将怎么把今天的成长应用到生活与工作中？",
  ], "7 问文案");
  assert(qs[2].type === "textarea" && qs[8].type === "textarea", "4F 各问均为 textarea");
  assert(BUILT_IN_MOOD_REVIEW.template.includes("Fact【1】今天发生了什么事情？\n{{f1}}"), "笔记模板包含 Fact【1】与 {{f1}}");
  assert(BUILT_IN_MOOD_REVIEW.template.includes("Future【7】未来我将怎么把今天的成长应用到生活与工作中？\n{{f7}}"), "笔记模板包含 Future【7】与 {{f7}}");
});

test("出厂定义不可变（deep-frozen），修改副本不影响出厂", () => {
  assert(Object.isFrozen(BUILT_IN_MOOD_REVIEW), "顶层冻结");
  assert(Object.isFrozen(BUILT_IN_MOOD_REVIEW.questions), "questions 冻结");
  assert(Object.isFrozen(BUILT_IN_MOOD_REVIEW.questions[1].options), "options 冻结");
  let threw = false;
  try { (BUILT_IN_MOOD_REVIEW as { name: string }).name = "改过的"; } catch { threw = true; }
  assert(threw || BUILT_IN_MOOD_REVIEW.name === "今日情绪复盘", "严格模式下赋值应抛错或被忽略");
  const copy = instantiateBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)!;
  copy.name = "我的复盘"; copy.questions[1].options!.push("🌙 新增");
  assertEquals(getBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)!.name, "今日情绪复盘", "出厂模板不受副本编辑影响");
  assertEquals((getBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)!.questions[1].options as string[]).length, 10, "出厂模板选项数不变");
  assert(!Object.isFrozen(copy), "工作副本应可编辑（未冻结）");
  assert(getBuiltInTemplate("nope") === undefined && instantiateBuiltInTemplate("nope") === undefined, "未知 id 返回 undefined");
});

test("BUILT_IN_TEMPLATES 数组本身冻结", () => {
  assert(Object.isFrozen(BUILT_IN_TEMPLATES), "数组冻结");
});

test("DEFAULT_SETTINGS 由内置模板实例化而来", () => {
  assertEquals(DEFAULT_SETTINGS.surveys.length, 1, "默认一个问卷");
  assertEquals(DEFAULT_SETTINGS.surveys[0].id, BUILT_IN_MOOD_REVIEW_ID, "id 一致");
  assertEquals(DEFAULT_SETTINGS.surveys[0].questions[1].type, "multiple", "今日状态为多选");
});

/* ---------------------------------------------------------------- */
/* 2. 首次安装自动实例化 + 持久化                                     */
/* ---------------------------------------------------------------- */

test("首次安装：loadSettings 自动实例化内置模板并写入用户设置", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  const persisted: unknown[] = [];
  (plugin as unknown as { saveData: (d: unknown) => Promise<void> }).saveData = async (d: unknown) => { persisted.push(JSON.parse(JSON.stringify(d))); };
  await plugin.loadSettings();
  assert(plugin.settings.surveys.length === 1, "首次安装应实例化 1 个内置问卷");
  assertEquals(plugin.settings.surveys[0].id, BUILT_IN_MOOD_REVIEW_ID, "实例化的是内置模板");
  assert(persisted.length === 1, "应立即持久化到用户设置");
  // 用户编辑副本后，出厂模板不受影响
  plugin.settings.surveys[0].name = "我的情绪复盘";
  assertEquals(getBuiltInTemplate(BUILT_IN_MOOD_REVIEW_ID)!.name, "今日情绪复盘", "出厂定义仍不可变");
});

test("已有用户设置时不会重新实例化（尊重用户编辑/删除）", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  const userData = { surveys: [{ id: "custom_x", name: "自定义", targetFolder: "x", template: "t", questions: [{ id: "q", label: "q", type: "text" }] }] };
  (plugin as unknown as { loadData: () => Promise<unknown> }).loadData = async () => JSON.parse(JSON.stringify(userData));
  let saved = 0;
  (plugin as unknown as { saveData: (d: unknown) => Promise<void> }).saveData = async () => { saved++; };
  await plugin.loadSettings();
  assertEquals(plugin.settings.surveys.map(s => s.id), ["custom_x"], "保留用户数据");
  assertEquals(saved, 0, "不应覆盖保存");
});

test("重启（disable/re-enable）后设置不损坏", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  let stored: unknown = null;
  (plugin as unknown as { loadData: () => Promise<unknown> }).loadData = async () => stored;
  (plugin as unknown as { saveData: (d: unknown) => Promise<void> }).saveData = async (d: unknown) => { stored = JSON.parse(JSON.stringify(d)); };
  await plugin.loadSettings();
  plugin.settings.surveys[0].enabled = false; // 用户停用内置问卷
  plugin.settings.surveys[0].targetFolder = "复盘/我的情绪";
  await plugin.saveSettings();
  // 模拟重载插件（disable → enable）
  const plugin2 = new DynamicSurveyPlugin(vault as never);
  (plugin2 as unknown as { loadData: () => Promise<unknown> }).loadData = async () => stored;
  await plugin2.loadSettings();
  assertEquals(plugin2.settings.surveys.length, 1, "问卷仍在");
  assertEquals(plugin2.settings.surveys[0].enabled, false, "停用状态保留");
  assertEquals(plugin2.settings.surveys[0].targetFolder, "复盘/我的情绪", "targetFolder 编辑保留");
  assertEquals(plugin2.settings.surveys[0].questions[1].options?.length, 10, "选项完整");
});

/* ---------------------------------------------------------------- */
/* 3. Restore built-in template / duplicate                          */
/* ---------------------------------------------------------------- */

test("restoreBuiltInTemplate：覆盖被改坏的工作副本", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  await plugin.loadSettings();
  plugin.settings.surveys[0].name = "被改坏"; plugin.settings.surveys[0].questions.pop()!;
  const restored = plugin.restoreBuiltInTemplate()!;
  assertEquals(restored.name, "今日情绪复盘", "恢复出厂名称");
  assertEquals(restored.questions.length, 9, "恢复出厂题目");
  assertEquals(restored.questions[1].type, "multiple", "今日状态恢复为多选");
  assertEquals(plugin.settings.surveys.length, 1, "覆盖而非追加");
  assertEquals(plugin.settings.surveys[0].id, BUILT_IN_MOOD_REVIEW_ID, "id 不变");
});

test("restoreBuiltInTemplate：无工作副本时新建", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  await plugin.loadSettings();
  plugin.settings.surveys = [];
  const restored = plugin.restoreBuiltInTemplate()!;
  assert(!!restored, "应返回恢复的副本");
  assertEquals(plugin.settings.surveys.map(s => s.id), [BUILT_IN_MOOD_REVIEW_ID], "追加到末尾");
});

/* ---------------------------------------------------------------- */
/* 4. SurveyFileWriter：三种重名模式 + targetFolder                   */
/* ---------------------------------------------------------------- */

test("increment：同日重复填写生成 (2)、(3)", async () => {
  const vault = new Vault();
  const writer = new SurveyFileWriter({ vault } as never);
  const f1 = await writer.write("复盘/情绪记录", `2026-11-16 今日情绪复盘`, "内容一", "increment");
  const f2 = await writer.write("复盘/情绪记录", `2026-11-16 今日情绪复盘`, "内容二", "increment");
  const f3 = await writer.write("复盘/情绪记录", `2026-11-16 今日情绪复盘`, "内容三", "increment");
  assertEquals(f1.path, `复盘/情绪记录/2026-11-16 今日情绪复盘.md`, "首份路径");
  assertEquals(f2.path, `复盘/情绪记录/2026-11-16 今日情绪复盘 (2).md`, "重名第二份");
  assertEquals(f3.path, `复盘/情绪记录/2026-11-16 今日情绪复盘 (3).md`, "重名第三份");
  assertEquals(vault.getContent(`复盘/情绪记录/2026-11-16 今日情绪复盘.md`), "内容一", "原文件不被改动");
  assertEquals(vault.getContent(`复盘/情绪记录/2026-11-16 今日情绪复盘 (2).md`), "内容二", "(2) 文件内容");
  assert(vault.paths().includes("复盘") && vault.paths().includes("复盘/情绪记录"), "targetFolder 自动创建");
});

test("append：追加到已有笔记", async () => {
  const vault = new Vault();
  const writer = new SurveyFileWriter({ vault } as never);
  await writer.write("复盘", "情绪", "第一份", "append");
  const f = await writer.write("复盘", "情绪", "第二份", "append");
  assertEquals(f.path, "复盘/情绪.md", "仍写同一文件");
  assertEquals(vault.getContent("复盘/情绪.md"), "第一份\n\n第二份", "追加内容以空行分隔");
});

test("overwrite：覆盖已有笔记", async () => {
  const vault = new Vault();
  const writer = new SurveyFileWriter({ vault } as never);
  await writer.write("复盘", "情绪", "旧内容", "overwrite");
  const f = await writer.write("复盘", "情绪", "新内容", "overwrite");
  assertEquals(f.path, "复盘/情绪.md", "同一文件");
  assertEquals(vault.getContent("复盘/情绪.md"), "新内容", "内容被覆盖");
  assertEquals(vault.paths().filter(p => p.startsWith("复盘/")).length, 1, "不产生新文件");
});

test("中文/emoji 笔记名与非法字符清理", async () => {
  const vault = new Vault();
  const writer = new SurveyFileWriter({ vault } as never);
  const f = await writer.write("复盘/emoji 🎉", "今日：情绪?记录", "x", "increment");
  assertEquals(f.path, "复盘/emoji 🎉/今日：情绪-记录.md", "中文/emoji/全角冒号保留，ASCII 非法字符替换为 -");
});

test("目标路径是文件夹时报错；上级目录路径被拒绝", async () => {
  const vault = new Vault();
  const writer = new SurveyFileWriter({ vault } as never);
  await vault.createFolder("复盘/情绪记录");
  let threw = false;
  try { await writer.write("复盘/情绪记录", "", "x", "increment"); } catch { threw = true; }
  assert(threw, "空笔记名应报错");
  threw = false;
  try { await writer.write("复盘/../逃逸", "x", "y", "increment"); } catch { threw = true; }
  assert(threw, "../ 路径应被拒绝");
});

test("同名文件夹阻断创建时报错", async () => {
  const vault = new Vault();
  const writer = new SurveyFileWriter({ vault } as never);
  await vault.create("复盘", "内容"); // 复盘 是文件不是文件夹
  let threw = false;
  try { await writer.write("复盘/子目录", "x", "y", "increment"); } catch { threw = true; }
  assert(threw, "同名文件挡住文件夹创建应报错");
  assert(vault.getAbstractFileByPath("复盘") instanceof TFolder === false, "复盘 仍是文件");
});

/* ---------------------------------------------------------------- */
/* 5. 完整保存流（token 替换 / multiple join / 中文 emoji）            */
/* ---------------------------------------------------------------- */

test("save：生成 {{date}} {{survey_name}}.md，multiple 用、连接，emoji 保留", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin({ vault } as never);
  await plugin.onload();
  noticeLog.length = 0;
  const survey = JSON.parse(JSON.stringify(plugin.settings.surveys[0])) as SurveyDefinition;
  await (plugin as unknown as { save: (s: SurveyDefinition, a: Record<string, string | string[]>) => Promise<void> }).save(survey, {
    env: "🌟 好", status: ["👍 有收获", "😁 开心"],
    f1: "写了插件验收 🎉", f3: "开心、踏实"
  });
  const expectedName = `${today()} 今日情绪复盘`;
  const path = `复盘/情绪记录/${expectedName}.md`;
  assert(vault.paths().includes(path), `应创建 ${path}，实际 ${JSON.stringify(vault.paths())}`);
  const content = vault.getContent(path);
  assert(content.startsWith(`# ${today()} 今日情绪复盘`), "标题含日期与问卷名");
  assert(content.includes("## 今日环境\n🌟 好"), "环境答案");
  assert(content.includes("## 今日状态\n👍 有收获、😁 开心"), "多选答案用、连接");
  assert(content.includes("Fact【1】今天发生了什么事情？\n写了插件验收 🎉"), "4F 第 1 问渲染");
  assert(content.includes("Feel【3】我体验到哪些情绪感受？\n开心、踏实"), "4F 第 3 问渲染");
  assert(content.includes("Fact【2】过程中我印象最深刻的是什么？\n\n"), "未回答的 4F 问渲染为空");
  assert(content.includes("写了插件验收 🎉"), "中文与 emoji 保留");
});

test("save：多次调用同日重名 → (2)", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin({ vault } as never);
  await plugin.onload();
  const survey = JSON.parse(JSON.stringify(plugin.settings.surveys[0])) as SurveyDefinition;
  const run = () => (plugin as unknown as { save: (s: SurveyDefinition, a: Record<string, unknown>) => Promise<void> }).save(survey, { env: "⛅ 一般", status: ["🥛 养生"], f1: "x" });
  await run();
  await run();
  const paths = vault.paths().filter(p => p.startsWith("复盘/情绪记录/"));
  assertEquals(paths.length, 2, "两份笔记");
  assert(paths.some(p => p.endsWith(`${today()} 今日情绪复盘 (2).md`)), "第二份为 (2) 重名模式");
});

/* ---------------------------------------------------------------- */
/* 6. 校验与命令注册                                                  */
/* ---------------------------------------------------------------- */

test("validateSurvey：缺 options / 题目 id 重复 / 空 questions 报错", () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  const errors = plugin.validateSurvey({ id: "x", name: "x", targetFolder: "t", template: "t", questions: [
    { id: "q1", label: "q", type: "single", options: [] },
    { id: "q1", label: "q", type: "text" },
  ] });
  assert(errors.some(e => e.includes("q1 缺少 options")), "single 缺 options 报错");
  assert(errors.some(e => e.includes("题目 ID 重复")), "重复 id 报错");
  assert(plugin.validateSurvey({ id: "x", name: "x", targetFolder: "t", template: "t", questions: [] }).some(e => e.includes("至少需要一道题")), "空问卷报错");
});

test("validateSettings：重复问卷 id 报错", () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  const s = { surveys: [
    JSON.parse(JSON.stringify(plugin.settings.surveys[0])),
    JSON.parse(JSON.stringify(plugin.settings.surveys[0])),
  ] as SurveyDefinition[] };
  assert(plugin.validateSettings(s).some(e => e.includes("问卷 ID 重复")), "问卷 id 重复报错");
});

test("onload：注册选择器命令与每个启用问卷的专属命令", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  await plugin.loadSettings();
  await plugin.onload();
  const cmds = (plugin as unknown as { commands: Array<{ id: string }> }).commands;
  assert(cmds.some(c => c.id === "open-survey-picker"), "选择器命令");
  assert(cmds.some(c => c.id === "run-survey-mood_review"), `内置问卷专属命令，实际 ${JSON.stringify(cmds)}`);
  const ribbons = (plugin as unknown as { ribbons?: Array<{ icon: string; tooltip: string }> }).ribbons ?? [];
  assert(ribbons.length === 1 && ribbons[0].icon === "clipboard-list", `左侧栏 ribbon 图标，实际 ${JSON.stringify(ribbons)}`);
  assert(ribbons[0]?.tooltip === "打开动态问卷", "ribbon 悬停提示");
});

test("enabled() 过滤停用问卷", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin(vault as never);
  await plugin.loadSettings();
  const copy = plugin.duplicateSurvey(BUILT_IN_MOOD_REVIEW_ID)!;
  assertEquals(copy.id, "mood_review-copy", "副本 id");
  assertEquals(copy.name, "今日情绪复盘 副本", "副本名");
  copy.enabled = false;
  assertEquals(plugin.enabled().map(s => s.id), [BUILT_IN_MOOD_REVIEW_ID], "停用问卷被过滤");
  const dup2 = plugin.duplicateSurvey(BUILT_IN_MOOD_REVIEW_ID)!;
  assertEquals(dup2.id, "mood_review-copy-2", "副本 id 自动去重");
});

/* ---------------------------------------------------------------- */
/* 7. Platform 切换（模拟 app.emulateMobile）                         */
/* ---------------------------------------------------------------- */

test("Platform 默认桌面，可切换移动端", () => {
  assert(Platform.isDesktop && !Platform.isMobile, "默认桌面");
  Platform.isMobile = true; Platform.isDesktop = false;
  assert(Platform.isMobile, "切换为移动端");
  Platform.isMobile = false; Platform.isDesktop = true;
});

/* ---------------------------------------------------------------- */

async function main(): Promise<void> {
  for (const t of tests) {
    try { await t.fn(); passed++; console.log(`✓ ${t.name}`); }
    catch (e) { failures.push(`${t.name}: ${e instanceof Error ? e.message : String(e)}`); console.error(`✗ ${t.name}\n    ${e instanceof Error ? e.message : String(e)}`); }
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) { console.error(failures.map(f => `- ${f}`).join("\n")); process.exit(1); }
}
void main();
