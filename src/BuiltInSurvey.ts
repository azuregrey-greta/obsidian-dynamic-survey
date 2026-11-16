import { SurveyDefinition } from "./types";
import { deepClone } from "./utils";

/**
 * 内置（出厂）问卷模板。
 *
 * 该定义随插件源码一起分发，恢复内置模板完全不依赖网络，在
 * Obsidian macOS 桌面端与 Android 移动端上的行为完全一致。
 * 定义本身被深度冻结（immutable），用户拿到的是它的可编辑副本。
 */
export const BUILT_IN_MOOD_REVIEW_ID = "mood_review";

/** 递归冻结：保证出厂定义整体不可变。 */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

const MOOD_REVIEW_FACTORY = deepFreeze({
  id: BUILT_IN_MOOD_REVIEW_ID,
  name: "今日情绪复盘",
  description: "记录今日环境、状态和 4F 情绪。",
  enabled: true,
  targetFolder: "复盘/情绪记录",
  fileNameTemplate: "{{date}} {{survey_name}}",
  collisionMode: "increment",
  multipleSeparator: "、",
  template: [
    "# {{date}} {{survey_name}}",
    "",
    "## 今日环境",
    "{{env}}",
    "",
    "## 今日状态",
    "{{status}}",
    "",
    "---",
    "",
    "## 今日 4F 情绪记录 🥰",
    "",
    "Fact【1】今天发生了什么事情？",
    "{{f1}}",
    "",
    "Fact【2】过程中我印象最深刻的是什么？",
    "{{f2}}",
    "",
    "Feel【3】我体验到哪些情绪感受？",
    "{{f3}}",
    "",
    "Feel【4】我感觉到最享受的是什么？",
    "{{f4}}",
    "",
    "Focus【5】我有哪些新的联想？",
    "{{f5}}",
    "",
    "Focus【6】我有哪些积极的变化正在发生着？",
    "{{f6}}",
    "",
    "Future【7】未来我将怎么把今天的成长应用到生活与工作中？",
    "{{f7}}",
    ""
  ].join("\n"),
  questions: [
    { id: "env", label: "今日环境", type: "single", required: true, autoAdvance: true, options: ["🌟 好", "⛅ 一般", "☔ 糟糕"] },
    {
      id: "status",
      label: "今日状态",
      description: "可多选。",
      type: "multiple",
      required: true,
      options: ["👍 有收获", "👎 被掏空", "😰 焦虑", "😎 安宁", "🐷 轻松", "🐶 劳累", "😁 开心", "🫣 心累", "🥛 养生", "🍻 放纵"]
    },
    { id: "f1", label: "Fact【1】今天发生了什么事情？", description: "下面记录今天 4F 情绪吧 🥰（Fact → Feel → Focus → Future，共 7 问）", type: "textarea", placeholder: "今天发生了什么事情？" },
    { id: "f2", label: "Fact【2】过程中我印象最深刻的是什么？", type: "textarea", placeholder: "过程中我印象最深刻的是什么？" },
    { id: "f3", label: "Feel【3】我体验到哪些情绪感受？", type: "textarea", placeholder: "我体验到哪些情绪感受？" },
    { id: "f4", label: "Feel【4】我感觉到最享受的是什么？", type: "textarea", placeholder: "我感觉到最享受的是什么？" },
    { id: "f5", label: "Focus【5】我有哪些新的联想？", type: "textarea", placeholder: "我有哪些新的联想？" },
    { id: "f6", label: "Focus【6】我有哪些积极的变化正在发生着？", type: "textarea", placeholder: "我有哪些积极的变化正在发生着？" },
    { id: "f7", label: "Future【7】未来我将怎么把今天的成长应用到生活与工作中？", type: "textarea", placeholder: "未来我将怎么把今天的成长应用到生活与工作中？" }
  ]
} as SurveyDefinition);

/** 所有随插件分发的出厂模板（当前只有「今日情绪复盘」）。 */
export const BUILT_IN_MOOD_REVIEW: SurveyDefinition = MOOD_REVIEW_FACTORY;
export const BUILT_IN_TEMPLATES: readonly SurveyDefinition[] = deepFreeze([MOOD_REVIEW_FACTORY]);

export function getBuiltInTemplate(id: string): SurveyDefinition | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

/** 取一份可自由编辑的内置模板工作副本（永不要求网络）。 */
export function instantiateBuiltInTemplate(id: string): SurveyDefinition | undefined {
  const factory = getBuiltInTemplate(id);
  return factory ? deepClone(factory) : undefined;
}
