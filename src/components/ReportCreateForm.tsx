"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(app)/projects/[projectId]/runs/actions";
import { VERDICTS, VERDICT_LABEL, type VerdictValue } from "@/lib/labels";

export function ReportCreateForm({
  action,
  suggestedVerdict,
  suggestedSummary,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  suggestedVerdict: VerdictValue;
  suggestedSummary: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn-ink">
          {state.error}
        </p>
      ) : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">التوصية للعميل</legend>
        <div className="flex flex-wrap gap-2">
          {VERDICTS.map((v) => (
            <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong bg-white px-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="radio" name="verdict" value={v} defaultChecked={v === suggestedVerdict} className="accent-brand" />
              {VERDICT_LABEL[v]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="summary" className="label">الملخص اللي العميل هيقراه أول حاجة</label>
        <textarea id="summary" name="summary" rows={3} maxLength={2000} required defaultValue={suggestedSummary} className="textarea" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-password" className="label">كلمة سر للرابط (اختياري)</label>
          <input id="report-password" name="password" type="password" autoComplete="new-password" dir="ltr" className="input text-right" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expires" className="label">الرابط يشتغل لمدة</label>
          <select id="expires" name="expiresDays" defaultValue="30" className="input">
            <option value="7">7 أيام</option>
            <option value="30">30 يوم</option>
            <option value="90">90 يوم</option>
            <option value="0">من غير انتهاء</option>
          </select>
        </div>
      </div>
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "جاري إنشاء الرابط…" : "إنشاء رابط التقرير"}
        </button>
      </div>
    </form>
  );
}
