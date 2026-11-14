import { allStr, oneOf, optionalStr, str } from "./forms";
import {
  CASE_TYPES,
  LANGUAGES,
  PRIORITIES,
  STATUSES,
  type CaseTypeValue,
  type LanguageValue,
  type PriorityValue,
  type StatusValue,
} from "./labels";

export type CaseFormState = { error?: string };

export type StepInput = { action: string; expected: string | null };

export type CaseValues = {
  title: string;
  preconditions: string | null;
  priority: PriorityValue;
  type: CaseTypeValue;
  status: StatusValue;
  language: LanguageValue;
  suiteId: string | null;
  storyKey: string | null;
  storyTitle: string | null;
  steps: StepInput[];
};

const MAX_STEPS = 100;
const MAX_TITLE = 300;

export function parseCaseForm(
  formData: FormData,
): { ok: true; values: CaseValues } | { ok: false; error: string } {
  const title = str(formData, "title");
  if (!title) return { ok: false, error: "اكتب عنوان للحالة." };
  if (title.length > MAX_TITLE) return { ok: false, error: `العنوان أطول من ${MAX_TITLE} حرف.` };

  // Steps arrive as two parallel lists, in the order they appear on screen.
  const actions = allStr(formData, "stepAction");
  const expecteds = allStr(formData, "stepExpected");
  const steps: StepInput[] = actions
    .map((action, i) => ({ action, expected: expecteds[i] ? expecteds[i] : null }))
    .filter((s) => s.action !== "" || s.expected !== null);

  if (steps.some((s) => s.action === "")) {
    return { ok: false, error: "فيه خطوة ليها نتيجة متوقعة من غير إجراء. اكتب الإجراء أو امسح الخطوة." };
  }
  if (steps.length > MAX_STEPS) return { ok: false, error: `أقصى عدد خطوات ${MAX_STEPS}.` };

  const storyKey = str(formData, "storyKey").toUpperCase();

  return {
    ok: true,
    values: {
      title,
      preconditions: optionalStr(formData, "preconditions"),
      priority: oneOf(PRIORITIES, str(formData, "priority"), "MEDIUM"),
      type: oneOf(CASE_TYPES, str(formData, "type"), "FUNCTIONAL"),
      status: oneOf(STATUSES, str(formData, "status"), "DRAFT"),
      language: oneOf(LANGUAGES, str(formData, "language"), "AR"),
      suiteId: optionalStr(formData, "suiteId"),
      storyKey: storyKey === "" ? null : storyKey,
      storyTitle: optionalStr(formData, "storyTitle"),
      steps,
    },
  };
}
