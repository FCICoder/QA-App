// Enum values match prisma/schema.prisma. Arabic labels live here only.

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type PriorityValue = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<PriorityValue, string> = {
  HIGH: "عالية",
  MEDIUM: "متوسطة",
  LOW: "منخفضة",
};

export const CASE_TYPES = [
  "FUNCTIONAL",
  "REGRESSION",
  "NEGATIVE",
  "BOUNDARY",
  "UI_RTL",
  "SECURITY",
  "OTHER",
] as const;
export type CaseTypeValue = (typeof CASE_TYPES)[number];
export const CASE_TYPE_LABEL: Record<CaseTypeValue, string> = {
  FUNCTIONAL: "Functional",
  REGRESSION: "Regression",
  NEGATIVE: "Negative",
  BOUNDARY: "Boundary",
  UI_RTL: "UI / RTL",
  SECURITY: "Security",
  OTHER: "أخرى",
};

export const STATUSES = ["DRAFT", "READY", "DEPRECATED"] as const;
export type StatusValue = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<StatusValue, string> = {
  DRAFT: "مسودة",
  READY: "جاهزة",
  DEPRECATED: "متوقفة",
};

export const LANGUAGES = ["AR", "EN"] as const;
export type LanguageValue = (typeof LANGUAGES)[number];
export const LANGUAGE_LABEL: Record<LanguageValue, string> = {
  AR: "عربي",
  EN: "English",
};

export function caseKey(n: number): string {
  return `TC-${String(n).padStart(3, "0")}`;
}

const dateFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(d: Date): string {
  return dateFormatter.format(d);
}

export function formatDateTime(d: Date): string {
  return dateTimeFormatter.format(d);
}

// ---- Test runs ----

export const STEP_RESULTS = ["UNTESTED", "PASSED", "FAILED", "BLOCKED"] as const;
export type StepResultValue = (typeof STEP_RESULTS)[number];
export const STEP_RESULT_LABEL: Record<StepResultValue, string> = {
  UNTESTED: "لم يُنفّذ",
  PASSED: "نجح",
  FAILED: "فشل",
  BLOCKED: "محجوب",
};

export const CASE_RUN_STATUSES = ["UNTESTED", "IN_PROGRESS", "PASSED", "FAILED", "BLOCKED"] as const;
export type CaseRunStatusValue = (typeof CASE_RUN_STATUSES)[number];
export const CASE_RUN_STATUS_LABEL: Record<CaseRunStatusValue, string> = {
  UNTESTED: "لم يُنفّذ",
  IN_PROGRESS: "قيد التنفيذ",
  PASSED: "نجح",
  FAILED: "فشل",
  BLOCKED: "محجوب",
};

export const VERDICTS = ["READY", "READY_WITH_NOTES", "NOT_READY"] as const;
export type VerdictValue = (typeof VERDICTS)[number];
export const VERDICT_LABEL: Record<VerdictValue, string> = {
  READY: "جاهز للإطلاق",
  READY_WITH_NOTES: "جاهز للإطلاق مع ملاحظات",
  NOT_READY: "مش جاهز للإطلاق",
};

export function runKey(n: number): string {
  return `Run #${n}`;
}
