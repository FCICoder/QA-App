"use client";

import { useRef, useState } from "react";
import {
  closeRun,
  setCaseResult,
  setStepActual,
  setStepResult,
} from "@/app/(app)/projects/[projectId]/runs/actions";
import {
  CASE_RUN_STATUS_LABEL,
  type CaseRunStatusValue,
  type StepResultValue,
} from "@/lib/labels";
import { countStatuses, deriveCaseStatus } from "@/lib/runs";
import { RunBar } from "./RunBar";

export type StepView = {
  id: string;
  position: number;
  action: string;
  expected: string | null;
  result: StepResultValue;
  actual: string;
};

export type CaseView = {
  id: string;
  key: string;
  title: string;
  preconditions: string | null;
  priorityLabel: string;
  priorityHigh: boolean;
  typeLabel: string;
  suiteName: string | null;
  storyKey: string | null;
  storyTitle: string | null;
  status: CaseRunStatusValue;
  steps: StepView[];
};

type Props = {
  projectId: string;
  runId: string;
  runName: string;
  environment: string | null;
  cases: CaseView[];
};

const STATUS_STYLE: Record<CaseRunStatusValue, string> = {
  UNTESTED: "border border-dashed border-line-strong bg-white text-muted",
  IN_PROGRESS: "bg-brand-soft text-brand-dark",
  PASSED: "bg-pass-soft text-pass-ink",
  FAILED: "bg-warn-soft text-warn-ink",
  BLOCKED: "bg-line text-ink-soft",
};
const STATUS_MARK: Record<CaseRunStatusValue, string> = {
  UNTESTED: "",
  IN_PROGRESS: "…",
  PASSED: "✓",
  FAILED: "!",
  BLOCKED: "–",
};

const RESULT_BUTTONS: { value: Exclude<StepResultValue, "UNTESTED">; label: string; on: string }[] = [
  { value: "PASSED", label: "نجح", on: "border-pass bg-pass text-white" },
  { value: "FAILED", label: "فشل", on: "border-warn bg-warn text-white" },
  { value: "BLOCKED", label: "محجوب", on: "border-ink-soft bg-ink-soft text-white" },
];

function bugReport(c: CaseView, failedIndex: number, runName: string, environment: string | null): string {
  const step = c.steps[failedIndex];
  const lines = [
    `العنوان: [Bug] ${c.title} — الخطوة ${failedIndex + 1} فشلت`,
    `الحالة: ${c.key} · ${runName}${environment ? ` · البيئة: ${environment}` : ""}`,
    c.storyKey ? `اليوزر ستوري: ${c.storyKey}${c.storyTitle ? ` · ${c.storyTitle}` : ""}` : "",
    "",
    c.preconditions ? `الشروط المسبقة:\n${c.preconditions}\n` : "",
    "خطوات إعادة المشكلة:",
    ...c.steps.slice(0, failedIndex + 1).map((s, i) => `${i + 1}. ${s.action}`),
    "",
    `النتيجة المتوقعة:\n${step.expected ?? "—"}`,
    "",
    `النتيجة الفعلية:\n${step.actual || "—"}`,
  ];
  return lines.filter((l, i, all) => !(l === "" && all[i - 1] === "")).join("\n").trim();
}

export function RunExecutor({ projectId, runId, runName, environment, cases: initial }: Props) {
  const [cases, setCases] = useState<CaseView[]>(initial);
  const [selected, setSelected] = useState(() => {
    const firstOpen = initial.findIndex((c) => c.status === "UNTESTED" || c.status === "IN_PROGRESS");
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [error, setError] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  // The last "actual result" text saved for each step, to skip saving when nothing changed.
  const savedActual = useRef(new Map(initial.flatMap((c) => c.steps.map((s) => [s.id, s.actual] as const))));

  const counts = countStatuses(cases.map((c) => c.status));
  const current = cases[selected];
  const remaining = counts.total - counts.done;

  function patchCase(caseId: string, fn: (c: CaseView) => CaseView) {
    setCases((list) => list.map((c) => (c.id === caseId ? fn(c) : c)));
  }

  async function markStep(caseId: string, stepId: string, clicked: Exclude<StepResultValue, "UNTESTED">) {
    setError(null);
    const target = cases.find((c) => c.id === caseId)?.steps.find((s) => s.id === stepId);
    if (!target) return;
    const before = target.result;
    const next: StepResultValue = before === clicked ? "UNTESTED" : clicked;

    patchCase(caseId, (c) => {
      const steps = c.steps.map((s) => (s.id === stepId ? { ...s, result: next } : s));
      return { ...c, steps, status: deriveCaseStatus(steps.map((s) => s.result)) };
    });

    const res = await setStepResult(runId, stepId, next);
    if (!res.ok) {
      setError(res.error);
      patchCase(caseId, (c) => {
        const steps = c.steps.map((s) => (s.id === stepId ? { ...s, result: before } : s));
        return { ...c, steps, status: deriveCaseStatus(steps.map((s) => s.result)) };
      });
    }
  }

  async function markCase(caseId: string, clicked: Exclude<StepResultValue, "UNTESTED">) {
    setError(null);
    const before = cases.find((c) => c.id === caseId)?.status ?? "UNTESTED";
    const next = before === clicked ? "UNTESTED" : clicked;
    patchCase(caseId, (c) => ({ ...c, status: next }));
    const res = await setCaseResult(runId, caseId, next);
    if (!res.ok) {
      setError(res.error);
      patchCase(caseId, (c) => ({ ...c, status: before }));
    }
  }

  async function saveActual(stepId: string, text: string) {
    if (savedActual.current.get(stepId) === text) return;
    const res = await setStepActual(runId, stepId, text);
    if (res.ok) savedActual.current.set(stepId, text);
    else setError(res.error);
  }

  function goNext() {
    const after = cases.findIndex((c, i) => i > selected && (c.status === "UNTESTED" || c.status === "IN_PROGRESS"));
    const anyOpen = cases.findIndex((c) => c.status === "UNTESTED" || c.status === "IN_PROGRESS");
    const next = after !== -1 ? after : anyOpen !== -1 ? anyOpen : Math.min(selected + 1, cases.length - 1);
    setSelected(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="min-w-[200px] flex-1">
            <RunBar counts={counts} className="h-2.5" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span><strong className="text-pass">{counts.passed}</strong> نجح</span>
            <span><strong className="text-warn">{counts.failed}</strong> فشل</span>
            <span><strong>{counts.blocked}</strong> محجوب</span>
            <span><strong>{remaining}</strong> متبقي من {counts.total}</span>
          </div>
          <form
            action={closeRun}
            onSubmit={(e) => {
              const msg =
                remaining > 0
                  ? `فيه ${remaining} حالة لسه ماخلصتش. تقفل الـ Run برضه؟ بعد القفل مش هتقدر تعدّل النتايج.`
                  : "تقفل الـ Run؟ بعد القفل مش هتقدر تعدّل النتايج، وتقدر تعمل رابط تقرير للعميل.";
              if (!window.confirm(msg)) e.preventDefault();
            }}
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="runId" value={runId} />
            <button type="submit" className="btn-primary">قفل الـ Run</button>
          </form>
        </div>
        {error ? (
          <p role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn-ink">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <nav aria-label="حالات الـ Run" className="card max-h-[70vh] max-w-full flex-[1_1_300px] overflow-y-auto p-2">
          <ol className="flex flex-col gap-0.5">
            {cases.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-current={i === selected ? "true" : undefined}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-start ${
                    i === selected ? "bg-brand-soft" : "hover:bg-canvas"
                  }`}
                >
                  <span aria-hidden="true" className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${STATUS_STYLE[c.status]}`}>
                    {STATUS_MARK[c.status]}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs text-muted">
                      <span dir="ltr">{c.key}</span> · {CASE_RUN_STATUS_LABEL[c.status]}
                    </span>
                    <span className="truncate text-sm font-semibold">{c.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {current ? (
          <section aria-labelledby="case-title" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <div className="card flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="chip bg-brand-soft text-brand-dark" dir="ltr">{current.key}</span>
                <span className={`chip ${current.priorityHigh ? "bg-warn-soft text-warn-ink" : "bg-canvas text-ink-soft"}`}>أولوية {current.priorityLabel}</span>
                <span className="chip bg-canvas text-ink-soft">{current.typeLabel}</span>
                {current.suiteName ? <span className="chip bg-canvas text-ink-soft">{current.suiteName}</span> : null}
                {current.storyKey ? (
                  <span className="chip bg-canvas text-ink-soft">
                    <span dir="ltr">{current.storyKey}</span>
                    {current.storyTitle ? ` · ${current.storyTitle}` : ""}
                  </span>
                ) : null}
                <span className={`chip ms-auto ${STATUS_STYLE[current.status]}`}>{CASE_RUN_STATUS_LABEL[current.status]}</span>
              </div>
              <h2 id="case-title" className="text-xl font-bold leading-snug">{current.title}</h2>
              {current.preconditions ? (
                <div className="rounded-[10px] bg-canvas px-4 py-3">
                  <div className="text-xs font-semibold text-muted">الشروط المسبقة</div>
                  <div className="whitespace-pre-line text-sm leading-7">{current.preconditions}</div>
                </div>
              ) : null}
            </div>

            {current.steps.length === 0 ? (
              <div className="card flex flex-wrap items-center gap-3 p-5">
                <span className="flex-1 text-sm text-muted">الحالة دي مالهاش خطوات. سجّل نتيجتها كلها مرة واحدة:</span>
                <div role="group" aria-label="نتيجة الحالة" className="flex gap-1.5">
                  {RESULT_BUTTONS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      aria-pressed={current.status === b.value}
                      onClick={() => markCase(current.id, b.value)}
                      className={`min-h-11 rounded-[10px] border px-3 text-sm font-semibold ${
                        current.status === b.value ? b.on : "border-line-strong bg-white text-ink-soft hover:bg-canvas"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {current.steps.map((step, index) => (
                  <li
                    key={step.id}
                    className={`card flex flex-wrap items-start gap-4 p-4 ${
                      step.result === "FAILED" ? "border-warn/50" : step.result === "PASSED" ? "border-pass/30" : ""
                    }`}
                  >
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
                      <div className="whitespace-pre-line font-semibold leading-7">{step.action}</div>
                      <div className="whitespace-pre-line text-sm leading-7 text-ink-soft">
                        <span className="font-semibold text-muted">المتوقع: </span>
                        {step.expected ?? "—"}
                      </div>
                      {step.result === "FAILED" || step.result === "BLOCKED" ? (
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`actual-${step.id}`} className="text-xs font-semibold text-warn-ink">
                            النتيجة الفعلية {step.result === "BLOCKED" ? "/ سبب الحجب" : ""}
                          </label>
                          <textarea
                            id={`actual-${step.id}`}
                            rows={2}
                            value={step.actual}
                            onChange={(e) => {
                              const text = e.target.value;
                              patchCase(current.id, (c) => ({
                                ...c,
                                steps: c.steps.map((s) => (s.id === step.id ? { ...s, actual: text } : s)),
                              }));
                            }}
                            onBlur={(e) => saveActual(step.id, e.target.value)}
                            className="textarea border-warn/40 bg-[#fffbf6]"
                            placeholder="إيه اللي حصل فعلاً؟"
                          />
                          {step.result === "FAILED" ? (
                            <div>
                              <button
                                type="button"
                                className="btn-secondary min-h-10"
                                onClick={async () => {
                                  const latest = cases.find((c) => c.id === current.id) ?? current;
                                  const text = bugReport(latest, index, runName, environment);
                                  try {
                                    await navigator.clipboard.writeText(text);
                                  } catch {
                                    window.prompt("انسخ الـ Bug Report من هنا:", text);
                                  }
                                  setCopiedStep(step.id);
                                  window.setTimeout(() => setCopiedStep(null), 2000);
                                }}
                              >
                                <span aria-live="polite">{copiedStep === step.id ? "اتنسخ ✓" : "نسخ Bug Report"}</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div role="group" aria-label={`نتيجة الخطوة ${index + 1}`} className="flex shrink-0 gap-1.5">
                      {RESULT_BUTTONS.map((b) => (
                        <button
                          key={b.value}
                          type="button"
                          aria-pressed={step.result === b.value}
                          onClick={() => markStep(current.id, step.id, b.value)}
                          className={`min-h-11 rounded-[10px] border px-3 text-sm font-semibold ${
                            step.result === b.value ? b.on : "border-line-strong bg-white text-ink-soft hover:bg-canvas"
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" className="btn-secondary" disabled={selected === 0} onClick={() => setSelected((i) => Math.max(0, i - 1))}>
                الحالة السابقة
              </button>
              <button type="button" className="btn-primary bg-ink hover:bg-ink-soft" onClick={goNext}>
                الحالة اللي بعدها
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
