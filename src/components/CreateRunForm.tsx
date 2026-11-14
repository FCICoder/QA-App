"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(app)/projects/[projectId]/runs/actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  suites: { id: string; name: string; count: number }[];
  noSuiteCount: number;
  totalCount: number;
  nextNumber: number;
};

export function CreateRunForm({ action, suites, noSuiteCount, totalCount, nextNumber }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn-ink">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="run-name" className="label">اسم الـ Run</label>
          <input id="run-name" name="name" maxLength={120} placeholder={`Run #${nextNumber} · اختبار قبل الإطلاق`} className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="run-env" className="label">البيئة (اختياري)</label>
          <input id="run-env" name="environment" maxLength={160} placeholder="مثلاً: Android 14 · إصدار 2.4 · Staging" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="run-suite" className="label">النطاق</label>
          <select id="run-suite" name="suiteId" defaultValue="" className="input">
            <option value="">كل حالات المشروع ({totalCount})</option>
            {suites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.count})
              </option>
            ))}
            {noSuiteCount > 0 ? <option value="none">بدون Suite ({noSuiteCount})</option> : null}
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2.5 self-end text-sm">
          <input type="checkbox" name="onlyReady" className="h-5 w-5 accent-brand" />
          الحالات اللي حالتها «جاهزة» بس
        </label>
      </div>
      <p className="text-xs text-muted">الحالات المتوقفة (Deprecated) مش بتدخل الـ Run. الـ Run بياخد نسخة من الحالات، فلو عدّلت حالة بعد كده الـ Run مش هيتغير.</p>
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "جاري إنشاء الـ Run…" : "ابدأ Run جديد"}
        </button>
      </div>
    </form>
  );
}
