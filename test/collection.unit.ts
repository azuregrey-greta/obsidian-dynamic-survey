/*
 * 问卷收集测试:草稿→问卷、JSON 导入解析/规范化、10 个上限、增删 API。
 */
import { Vault } from "./obsidian-stub";
import DynamicSurveyPlugin from "../src/main";
import {
  MAX_USER_SURVEYS, countUserSurveys, buildSurveyFromDraft, parseImportPayload,
  normalizeImportedSurvey, generateSurveyId, SurveyDraft
} from "../src/SurveyCollection";
import { SurveyDefinition } from "../src/types";

let passed = 0;
const failures: string[] = [];
const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
function test(name: string, fn: () => void | Promise<void>): void { tests.push({ name, fn }); }
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }
function assertEquals(actual: unknown, expected: unknown, msg: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${msg}\n  实际: ${JSON.stringify(actual)}\n  期望: ${JSON.stringify(expected)}`);
}

function validDraft(): SurveyDraft {
  return {
    name: "睡前复盘",
    folder: "问卷收集",
    questions: [
      { label: "今天效率如何?", kind: "single", options: ["🔥 高", "💤 低"], required: true },
      { label: "想说什么?", kind: "textarea", options: [], required: false }
    ]
  };
}

test("buildSurveyFromDraft:合法草稿 → 问卷定义(q1/q2、单选 autoAdvance、模板含标签)", () => {
  const { survey, errors } = buildSurveyFromDraft(validDraft());
  assertEquals(errors, [], "无错误");
  assert(!!survey, "应返回问卷");
  assertEquals(survey!.questions.map(q => q.id), ["q1", "q2"], "题目 id 自动生成");
  assertEquals(survey!.questions[0].type, "single", "第 1 题单选");
  assertEquals(survey!.questions[0].autoAdvance, true, "单选自动前进");
  assertEquals(survey!.questions[1].type, "textarea", "第 2 题多行手填");
  assertEquals(survey!.targetFolder, "问卷收集", "默认文件夹");
  assert(survey!.template.includes("## 今天效率如何?\n{{q1}}"), "模板包含问题标签与引用");
  assert(survey!.template.startsWith("# {{date}} {{survey_name}}"), "模板标题");
  assertEquals(survey!.fileNameTemplate, "{{date}} {{survey_name}}", "默认笔记名");
  assertEquals(survey!.collisionMode, "increment", "默认重名模式");
});

test("buildSurveyFromDraft:多选题 kind/选项正确,autoAdvance 未设置", () => {
  const draft = validDraft();
  draft.questions[0].kind = "multiple";
  const { survey, errors } = buildSurveyFromDraft(draft);
  assertEquals(errors, [], "无错误");
  assertEquals(survey!.questions[0].type, "multiple", "多选");
  assertEquals(survey!.questions[0].autoAdvance, undefined, "多选不自动前进");
  assertEquals(survey!.questions[0].options, ["🔥 高", "💤 低"], "选项保留");
});

test("buildSurveyFromDraft:错误收集(空名称/无问题/空题干/选择题无选项)", () => {
  const noQuestion = buildSurveyFromDraft({ name: "", folder: "", questions: [] });
  assert(noQuestion.errors.some(e => e.includes("至少要有一个问题")), "无问题报错");
  const { errors } = buildSurveyFromDraft({ name: "", folder: "", questions: [
    { label: "", kind: "single", options: [], required: true },
  ] });
  assert(errors.some(e => e.includes("问卷名称")), "空名称报错");
  assert(errors.some(e => e.includes("第 1 题缺少问题文本")), "空题干报错");
  assert(errors.some(e => e.includes("第 1 题是选择题")), "选择题无选项报错");
});

test("buildSurveyFromDraft:空文件夹回退默认「问卷收集」", () => {
  const draft = validDraft(); draft.folder = "  ";
  const { survey } = buildSurveyFromDraft(draft);
  assertEquals(survey!.targetFolder, "问卷收集", "回退默认");
});

test("parseImportPayload:三种合法形状 + 两种非法", () => {
  const single = JSON.stringify({ name: "a", targetFolder: "x", questions: [{ label: "q", type: "text" }] });
  assertEquals(parseImportPayload(single).surveys!.length, 1, "单对象");
  assertEquals(parseImportPayload(JSON.stringify({ surveys: [JSON.parse(single), JSON.parse(single)] })).surveys!.length, 2, "surveys 包裹");
  assertEquals(parseImportPayload(JSON.stringify([JSON.parse(single)])).surveys!.length, 1, "数组");
  assert(!!parseImportPayload("{bad json").error, "坏 JSON 报错");
  assert(!!parseImportPayload(JSON.stringify({ foo: 1 })).error, "未知形状报错");
  assert(!!parseImportPayload("[]").error, "空数组报错");
});

test("normalizeImportedSurvey:补默认值、缺 id 自动生成、非法 id 重生成", () => {
  const ids = new Set<string>(["mood_review"]);
  const { survey, error } = normalizeImportedSurvey({
    name: "晨检", targetFolder: "问卷收集",
    questions: [{ label: "睡得好吗?", type: "single", options: ["😴 好", "😪 差"] }]
  }, ids);
  assertEquals(error, undefined, "无错误");
  assert(!ids.has("mood_review") === false, "原 id 集合不变(不修改入参)");
  assert(survey!.id.startsWith("survey-"), "自动生成 id");
  assertEquals(survey!.enabled, true, "默认启用");
  assertEquals(survey!.collisionMode, "increment", "默认重名模式");
  assertEquals(survey!.fileNameTemplate, "{{date}} {{survey_name}}", "默认笔记名");
  assertEquals(survey!.questions[0].id, "q1", "题目 id 重排");
  assert(survey!.template.includes("{{q1}}"), "自动模板引用题目");
});

test("normalizeImportedSurvey:非法问卷报错(缺 name/缺 questions/缺 targetFolder)", () => {
  const ids = new Set<string>();
  assert(!!normalizeImportedSurvey({ targetFolder: "x", questions: [] }, ids).error, "缺 name");
  assert(!!normalizeImportedSurvey({ name: "a", targetFolder: "x", questions: [] }, ids).error, "缺 questions");
  assert(!!normalizeImportedSurvey({ name: "a", questions: [{ label: "q", type: "text" }] }, ids).error, "缺 targetFolder");
  assert(!!normalizeImportedSurvey("字符串", ids).error, "非对象");
});

test("countUserSurveys:内置模板不计入", () => {
  const defs = [
    { id: "mood_review", name: "内置", targetFolder: "t", template: "t", questions: [{ id: "q", label: "q", type: "text" }] },
    { id: "survey-1", name: "收集1", targetFolder: "t", template: "t", questions: [{ id: "q", label: "q", type: "text" }] },
    { id: "survey-2", name: "收集2", targetFolder: "t", template: "t", questions: [{ id: "q", label: "q", type: "text" }] },
  ] as SurveyDefinition[];
  assertEquals(countUserSurveys(defs), 2, "只计 2 个收集问卷");
});

test("addUserSurvey:成功收集并持久化;id 冲突自动重生成", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin({ vault } as never);
  await plugin.loadSettings();
  const def = { id: "mood_review", name: "撞名问卷", targetFolder: "问卷收集", template: "t", questions: [{ id: "q1", label: "q", type: "text" }] } as SurveyDefinition;
  const res = await plugin.addUserSurvey(def);
  assert(res.ok, `应成功:${res.error}`);
  assert(res.survey!.id !== "mood_review", "与内置 id 冲突时自动重生成");
  assertEquals(plugin.settings.surveys.some(s => s.name === "撞名问卷"), true, "已加入收集");
  assertEquals((plugin as unknown as { _data: unknown })._data !== null, true, "已持久化");
});

test("addUserSurvey:上限 10 个,第 11 个被拒;删除后可再收集", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin({ vault } as never);
  await plugin.loadSettings();
  for (let i = 1; i <= MAX_USER_SURVEYS; i++) {
    const res = await plugin.addUserSurvey({ id: `s${i}`, name: `问卷${i}`, targetFolder: "问卷收集", template: "t", questions: [{ id: "q1", label: "q", type: "text" }] } as SurveyDefinition);
    assert(res.ok, `第 ${i} 个应成功:${res.error}`);
  }
  const over = await plugin.addUserSurvey({ id: "s99", name: "超出", targetFolder: "问卷收集", template: "t", questions: [{ id: "q1", label: "q", type: "text" }] } as SurveyDefinition);
  assertEquals(over.ok, false, "第 11 个被拒");
  assert(over.error!.includes("最多 10 个"), "错误提示包含上限");
  // 停用不算删除,仍占名额
  plugin.settings.surveys.find(s => s.id === "s1")!.enabled = false;
  const over2 = await plugin.addUserSurvey({ id: "s98", name: "停用也占位", targetFolder: "问卷收集", template: "t", questions: [{ id: "q1", label: "q", type: "text" }] } as SurveyDefinition);
  assertEquals(over2.ok, false, "停用问卷仍占收集名额");
  // 删除腾出名额
  await plugin.removeSurvey("s1");
  const okAgain = await plugin.addUserSurvey({ id: "s98", name: "删除后成功", targetFolder: "问卷收集", template: "t", questions: [{ id: "q1", label: "q", type: "text" }] } as SurveyDefinition);
  assertEquals(okAgain.ok, true, "删除后可再收集");
});

test("addUserSurvey:replaceIfIdExists 同 id 原地更新,不堆副本、不占新名额", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin({ vault } as never);
  await plugin.loadSettings();
  const def = (n: string) => ({ id: "film_breakdown", name: n, targetFolder: "t", template: "t", questions: [{ id: "q1", label: "q", type: "text" }] } as SurveyDefinition);
  const r1 = await plugin.addUserSurvey(def("第一版"), { replaceIfIdExists: true });
  const r2 = await plugin.addUserSurvey(def("第二版"), { replaceIfIdExists: true });
  assert(r1.ok && r2.ok, "两次都成功");
  assertEquals(r2.updated, true, "第二次标记为更新");
  assertEquals(plugin.settings.surveys.length, 2, "内置 + 1 个,不堆副本");
  assertEquals(plugin.settings.surveys.find(s => s.id === "film_breakdown")!.name, "第二版", "内容已更新");
  // 不带 replace 时同 id 自动重生成,正常堆积
  const r3 = await plugin.addUserSurvey(def("第三版"));
  assert(r3.ok && !r3.updated && r3.survey!.id !== "film_breakdown", "默认行为:冲突 id 重生成");
  assertEquals(plugin.settings.surveys.length, 3, "默认行为堆副本");
});

test("addUserSurvey:非法问卷被校验拒绝", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin({ vault } as never);
  await plugin.loadSettings();
  const res = await plugin.addUserSurvey({ id: "bad id!", name: "x", targetFolder: "t", template: "t", questions: [] } as unknown as SurveyDefinition);
  assertEquals(res.ok, false, "被拒");
  assert(!!res.error, "有错误信息");
});

test("removeSurvey:删除并持久化;不存在的 id 返回 false", async () => {
  const vault = new Vault();
  const plugin = new DynamicSurveyPlugin({ vault } as never);
  await plugin.loadSettings();
  await plugin.addUserSurvey({ id: "tmp1", name: "临时", targetFolder: "问卷收集", template: "t", questions: [{ id: "q1", label: "q", type: "text" }] } as SurveyDefinition);
  assert(await plugin.removeSurvey("tmp1"), "删除成功");
  assertEquals(plugin.settings.surveys.some(s => s.id === "tmp1"), false, "已移除");
  assert(!(await plugin.removeSurvey("不存在")), "不存在返回 false");
});

test("generateSurveyId:不与现有冲突;非法 id 也不安全复用", () => {
  const ids = new Set(["survey-abc", "mood_review"]);
  const id = generateSurveyId(ids);
  assert(!ids.has(id), "生成的 id 不冲突");
  assert(id.startsWith("survey-"), "前缀 survey-");
});

async function main(): Promise<void> {
  for (const t of tests) {
    try { await t.fn(); passed++; console.log(`✓ ${t.name}`); }
    catch (e) { failures.push(`${t.name}: ${e instanceof Error ? e.message : String(e)}`); console.error(`✗ ${t.name}\n    ${e instanceof Error ? e.message : String(e)}`); }
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) { console.error(failures.map(f => `- ${f}`).join("\n")); process.exit(1); }
}
void main();
