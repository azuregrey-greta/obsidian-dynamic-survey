export type QuestionType = "single" | "multiple" | "text" | "textarea";
export interface SurveyOption { label: string; value: string; }
export interface SurveyQuestion {
  id: string;
  label: string;
  description?: string;
  type: QuestionType;
  options?: Array<string | SurveyOption>;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | string[];
  autoAdvance?: boolean;
}
export interface SurveyDefinition {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  targetFolder: string;
  fileNameTemplate?: string;
  collisionMode?: "append" | "increment" | "overwrite";
  multipleSeparator?: string;
  template: string;
  questions: SurveyQuestion[];
}
export interface DynamicSurveySettings { surveys: SurveyDefinition[]; }
export type SurveyAnswers = Record<string, string | string[]>;
