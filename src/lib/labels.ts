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
