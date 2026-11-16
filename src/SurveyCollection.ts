/*
 * 问卷收集:逐步录入草稿 → 问卷定义,以及 JSON 导入的解析/规范化。
 * 纯函数,便于单元测试;上限 MAX_USER_SURVEYS = 10(内置模板不计入)。
 */
import { SurveyDefinition, SurveyQuestion } from "./types";
import { getBuiltInTemplate } from "./BuiltInSurvey";

export const MAX_USER_SURVEYS = 10;

/** 回答方式:选择(单选)/选择(多选)/手填(单行)/手填(多行) */
export type AnswerKind = "single" | "multiple" | "text" | "textarea";
export const ANSWER_KIND_LABELS: Record<AnswerKind, string> = {
  single: "选择(单选)",
  multiple: "选择(多选)",
  text: "手填(单行)",
  textarea: "手填(多行)"
};

export interface DraftQuestion { label: string; kind: AnswerKind; options: string[]; required: boolean; }
export interface SurveyDraft { name: string; folder: string; questions: DraftQuestion[]; }

export function isBuiltInSurvey(def: SurveyDefinition): boolean { return getBuiltInTemplate(def.id) !== undefined; }
export function countUserSurveys(surveys: SurveyDefinition[]): number { return surveys.filter(s => !isBuiltInSurvey(s)).length; }

/** 生成不与现有 id 冲突的问卷 id(问卷名可能是中文,不能直接当 id)。 */
export function generateSurveyId(existingIds: ReadonlySet<string>): string {
  let id = `survey-${Date.now().toString(36)}`;
  let n = 2;
  while (existingIds.has(id)) id = `survey-${Date.now().toString(36)}-${n++}`;
  return id;
}

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

function draftDefaultTemplate(questions: SurveyQuestion[]): string {
  return ["# {{date}} {{survey_name}}", ...questions.map(q => `## ${q.label}\n{{${q.id}}}`)].join("\n\n") + "\n";
}

/** 逐步录入草稿 → 问卷定义;失败时返回所有错误(由弹窗统一展示)。 */
export function buildSurveyFromDraft(draft: SurveyDraft): { survey?: SurveyDefinition; errors: string[] } {
  const errors: string[] = [];
  const name = (draft.name ?? "").trim();
  if (!name) errors.push("请填写问卷名称。");
  const questions = draft.questions ?? [];
  if (!questions.length) errors.push("至少要有一个问题(点击「下一个问题」添加)。");
  questions.forEach((q, i) => {
    if (!(q.label ?? "").trim()) errors.push(`第 ${i + 1} 题缺少问题文本。`);
    if ((q.kind === "single" || q.kind === "multiple") && !(q.options ?? []).some(o => (o ?? "").trim())) errors.push(`第 ${i + 1} 题是选择题,请至少填写一个选项。`);
  });
  if (errors.length || !name || !questions.length) return { errors };

  const surveyQuestions: SurveyQuestion[] = questions.map((q, i) => {
    const question: SurveyQuestion = { id: `q${i + 1}`, label: (q.label ?? "").trim(), type: q.kind, required: q.required !== false };
    if (q.kind === "single" || q.kind === "multiple") {
      question.options = (q.options ?? []).map(o => (o ?? "").trim()).filter(Boolean);
      if (q.kind === "single") question.autoAdvance = true;
    }
    if (q.kind === "textarea") question.placeholder = "";
    return question;
  });

  const survey: SurveyDefinition = {
    id: "",
    name,
    description: "",
    enabled: true,
    targetFolder: (draft.folder ?? "").trim() || "问卷收集",
    fileNameTemplate: "{{date}} {{survey_name}}",
    collisionMode: "increment",
    multipleSeparator: "、",
    template: draftDefaultTemplate(surveyQuestions),
    questions: surveyQuestions
  };
  return { survey, errors };
}

export type ImportPayloadResult = { surveys?: unknown[]; error?: string };

/** 懒人 JSON 窗口:接受单个问卷对象、问卷数组或 {"surveys":[…]}。 */
export function parseImportPayload(text: string): ImportPayloadResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { return { error: `JSON 解析失败:${e instanceof Error ? e.message : String(e)}` }; }
  const usage = "可粘贴:单个问卷对象 / 问卷数组 / {\"surveys\":[…]}。";
  if (Array.isArray(raw)) return raw.length ? { surveys: raw } : { error: `数组为空。${usage}` };
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.surveys)) return obj.surveys.length ? { surveys: obj.surveys } : { error: `surveys 为空。${usage}` };
    if (obj.questions) return { surveys: [obj] };
    return { error: `无法识别的格式。${usage}` };
  }
  return { error: `无法识别的格式。${usage}` };
}

/** 规范化一份导入的问卷:补默认值、生成/修正 id;错误时返回 error。 */
export function normalizeImportedSurvey(raw: unknown, existingIds: ReadonlySet<string>): { survey?: SurveyDefinition; error?: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "问卷必须是 JSON 对象。" };
  const r = raw as Record<string, any>;
  if (typeof r.name !== "string" || !r.name.trim()) return { error: "问卷缺少 name(名称)。" };
  if (!Array.isArray(r.questions) || !r.questions.length) return { error: `问卷「${r.name}」至少要有一个问题。` };
  if (typeof r.targetFolder !== "string" || !r.targetFolder.trim()) return { error: `问卷「${r.name}」缺少 targetFolder(保存文件夹)。` };

  const ids = new Set(existingIds);
  let id = typeof r.id === "string" && ID_PATTERN.test(r.id) ? r.id : "";
  if (!id || ids.has(id)) id = generateSurveyId(ids);
  ids.add(id);

  // 题目 id 缺失/非法/重复且未提供自定义 template 时,自动重排为 q1…qn(保证模板引用正确)。
  const questionIds: string[] = r.questions.map((q: any, i: number) => (q && typeof q.id === "string" && ID_PATTERN.test(q.id) ? q.id : `q${i + 1}`));
  const hasDuplicateQuestionIds = new Set(questionIds).size !== questionIds.length;
  const userTemplate = typeof r.template === "string" && r.template.trim() ? r.template : "";
  const questions: SurveyQuestion[] = r.questions.map((q: any, i: number) => {
    const question: SurveyQuestion = {
      id: userTemplate && !hasDuplicateQuestionIds ? questionIds[i] : `q${i + 1}`,
      label: typeof (q as any)?.label === "string" ? q.label : `第 ${i + 1} 题`,
      type: (q as any)?.type === "single" || (q as any)?.type === "multiple" || (q as any)?.type === "textarea" ? (q as any).type : "text",
      required: (q as any)?.required !== false
    };
    if ((question.type === "single" || question.type === "multiple") && Array.isArray((q as any)?.options)) question.options = (q as any).options;
    if (typeof (q as any)?.placeholder === "string") question.placeholder = q.placeholder;
    if (typeof (q as any)?.description === "string") question.description = q.description;
    if (typeof (q as any)?.autoAdvance === "boolean") question.autoAdvance = q.autoAdvance;
    return question;
  });

  const survey: SurveyDefinition = {
    id,
    name: r.name.trim(),
    description: typeof r.description === "string" ? r.description : "",
    enabled: r.enabled !== false,
    targetFolder: r.targetFolder.trim(),
    fileNameTemplate: typeof r.fileNameTemplate === "string" && r.fileNameTemplate.trim() ? r.fileNameTemplate : "{{date}} {{survey_name}}",
    collisionMode: r.collisionMode === "append" || r.collisionMode === "overwrite" ? r.collisionMode : "increment",
    multipleSeparator: typeof r.multipleSeparator === "string" && r.multipleSeparator ? r.multipleSeparator : "、",
    template: userTemplate || draftDefaultTemplate(questions),
    questions
  };
  return { survey };
}
