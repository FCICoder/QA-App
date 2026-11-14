"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import type { CaseFormState } from "@/lib/case-form";
import {
  CASE_TYPES,
  CASE_TYPE_LABEL,
  LANGUAGES,
  LANGUAGE_LABEL,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
  type CaseTypeValue,
  type LanguageValue,
  type PriorityValue,
  type StatusValue,
} from "@/lib/labels";

export type CaseFormInitial = {
  title: string;
  preconditions: string;
  priority: PriorityValue;
  type: CaseTypeValue;
  status: StatusValue;
  language: LanguageValue;
  suiteId: string | null;
  storyKey: string;
  steps: { action: string; expected: string }[];
};

type StepRow = { id: number; action: string; expected: string };

type Props = {
  action: (prev: CaseFormState, formData: FormData) => Promise<CaseFormState>;
  initial: CaseFormInitial;
  suites: { id: string; name: string }[];
  stories: { key: string; title: string | null }[];
  submitLabel: string;
  cancelHref: string;
};

const initialState: CaseFormState = {};

export function TestCaseForm({ action, initial, suites, stories, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const nextId = useRef(initial.steps.length + 1);
  const [steps, setSteps] = useState<StepRow[]>(() =>
    initial.steps.length > 0
      ? initial.steps.map((s, i) => ({ id: i + 1, action: s.action, expected: s.expected }))
      : [{ id: 1, action: "", expected: "" }],
  );

  function update(id: number, field: "action" | "expected", value: string) {
    setSteps((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function move(index: number, delta: -1 | 1) {
    setSteps((rows) => {
      const target = index + delta;
      if (target < 0 || target >= rows.length) return rows;
      const copy = rows.slice();
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }
  function remove(id: number) {
    setSteps((rows) => (rows.length === 1 ? [{ id: rows[0].id, action: "", expected: "" }] : rows.filter((r) => r.id !== id)));
  }
  function add() {
    nextId.current += 1;
    const id = nextId.current;
    setSteps((rows) => [...rows, { id, action: "", expected: "" }]);
  }

  // Submitting through onSubmit (not the form's action prop) keeps what the user
  // typed on screen if the server sends back a validation error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        {state.error ? (
          <p role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn-ink">
            {state.error}
          </p>
        ) : null}

        <div className="card flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="label">العنوان</label>
            <input id="title" name="title" required maxLength={300} defaultValue={initial.title} className="input min-h-12 text-[17px] font-semibold" placeholder="مثلاً: تسجيل الدخول برقم موبايل وكود تحقق" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="preconditions" className="label">الشروط المسبقة</label>
            <textarea id="preconditions" name="preconditions" rows={2} defaultValue={initial.preconditions} className="textarea" placeholder="اختياري" />
          </div>
        </div>

        <section aria-labelledby="steps-h" className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 id="steps-h" className="text-base font-bold">الخطوات</h2>
            <span className="text-sm text-muted">{steps.length} خطوات</span>
          </div>
          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <li key={step.id} className="flex flex-wrap items-start gap-3 border-b border-line/70 px-4 py-3">
                <span className="mt-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-sm font-bold">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                  <label htmlFor={`a-${step.id}`} className="text-xs font-semibold text-muted">الإجراء</label>
                  <textarea
                    id={`a-${step.id}`}
                    name="stepAction"
                    rows={2}
                    value={step.action}
                    onChange={(e) => update(step.id, "action", e.target.value)}
                    className="textarea"
                  />
                </div>
                <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                  <label htmlFor={`e-${step.id}`} className="text-xs font-semibold text-muted">النتيجة المتوقعة</label>
                  <textarea
                    id={`e-${step.id}`}
                    name="stepExpected"
                    rows={2}
                    value={step.expected}
                    onChange={(e) => update(step.id, "expected", e.target.value)}
                    className="textarea"
                  />
                </div>
                <div className="mt-6 flex shrink-0 gap-1">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`نقل الخطوة ${index + 1} لفوق`} className="btn-secondary w-11 px-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label={`نقل الخطوة ${index + 1} لتحت`} className="btn-secondary w-11 px-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <button type="button" onClick={() => remove(step.id)} aria-label={`حذف الخطوة ${index + 1}`} className="btn-secondary w-11 px-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="px-4 py-3">
            <button type="button" onClick={add} className="btn-secondary border-dashed border-brand/40 bg-brand-soft/50 text-brand-dark">
              + إضافة خطوة
            </button>
          </div>
        </section>
      </div>

      <aside className="flex max-w-full flex-[1_1_280px] flex-col gap-4">
        <div className="card flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="suiteId" className="label">الـ Suite</label>
            <select id="suiteId" name="suiteId" defaultValue={initial.suiteId ?? ""} className="input">
              <option value="">بدون Suite</option>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="priority" className="label">الأولوية</label>
              <select id="priority" name="priority" defaultValue={initial.priority} className="input">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="type" className="label">النوع</label>
              <select id="type" name="type" defaultValue={initial.type} className="input">
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>{CASE_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="status" className="label">الحالة</label>
              <select id="status" name="status" defaultValue={initial.status} className="input">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="language" className="label">اللغة</label>
              <select id="language" name="language" defaultValue={initial.language} className="input">
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{LANGUAGE_LABEL[l]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-line pt-4">
            <label htmlFor="storyKey" className="label">اليوزر ستوري (اختياري)</label>
            <input id="storyKey" name="storyKey" dir="ltr" list="story-keys" defaultValue={initial.storyKey} placeholder="US-12" className="input text-right" />
            <datalist id="story-keys">
              {stories.map((s) => (
                <option key={s.key} value={s.key}>{s.title ?? ""}</option>
              ))}
            </datalist>
            <span className="text-xs text-muted">لو الستوري جديدة هتتضاف للمشروع تلقائياً.</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="btn-primary flex-1">
            {pending ? "جاري الحفظ…" : submitLabel}
          </button>
          <Link href={cancelHref} className="btn-secondary">
            رجوع
          </Link>
        </div>
      </aside>
    </form>
  );
}
