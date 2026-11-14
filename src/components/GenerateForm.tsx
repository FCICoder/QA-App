"use client";

import { useActionState, useEffect, useState } from "react";
import type { GenerateState, SaveState } from "@/app/(app)/projects/[projectId]/generate/actions";
import { CASE_TYPE_LABEL, PRIORITY_LABEL } from "@/lib/labels";

type GenerateAction = (prev: GenerateState, formData: FormData) => Promise<GenerateState>;
type SaveAction = (prev: SaveState, formData: FormData) => Promise<SaveState>;

const KIND_OPTIONS: [string, string][] = [
  ["positive", "المسار الطبيعي"],
  ["negative", "حالات سلبية وأخطاء"],
  ["boundary", "الحدود (أقل/أكبر قيمة)"],
  ["ui", "الواجهة العربية RTL"],
  ["security", "أمان أساسي"],
];

function Alert({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn-ink">
      {text}
    </p>
  );
}

export function GenerateForm({
  generateAction,
  saveAction,
  suites,
  stories,
  remaining,
  limit,
}: {
  generateAction: GenerateAction;
  saveAction: SaveAction;
  suites: { id: string; name: string }[];
  stories: { key: string; title: string | null }[];
  remaining: number;
  limit: number;
}) {
  const [gen, generate, generating] = useActionState(generateAction, {});
  const [saved, save, saving] = useActionState(saveAction, {});
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [suite, setSuite] = useState("new");
  const cases = gen.cases ?? [];

  // Every new batch starts fully selected.
  useEffect(() => {
    setPicked(new Set((gen.cases ?? []).map((_, i) => i)));
  }, [gen.cases]);

  const left = gen.used !== undefined ? limit - gen.used : remaining;

  return (
    <div className="flex flex-col gap-6">
      <form action={generate} className="card flex flex-col gap-4 p-5">
        <Alert text={gen.error} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="requirement" className="label">المتطلب أو اليوزر ستوري</label>
          <textarea
            id="requirement"
            name="requirement"
            rows={7}
            required
            minLength={20}
            maxLength={8000}
            placeholder={"مثلاً: بصفتي عميل، عايز أسترجع كلمة السر عن طريق الإيميل، عشان أرجع لحسابي لو نسيتها.\nشروط القبول: اللينك صالح ساعة واحدة، ويتستخدم مرة واحدة…"}
            className="textarea"
          />
          <span className="text-xs text-muted">كل ما الوصف وشروط القبول أوضح، الحالات بتطلع أدق.</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="storyKey" className="label">رقم الستوري (اختياري)</label>
            <input id="storyKey" name="storyKey" list="stories" maxLength={40} dir="ltr" placeholder="US-12" className="input text-right" />
            <datalist id="stories">
              {stories.map((s) => (
                <option key={s.key} value={s.key}>{s.title ?? ""}</option>
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="storyTitle" className="label">عنوان الستوري (اختياري)</label>
            <input id="storyTitle" name="storyTitle" maxLength={200} className="input" />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-1">تغطّي إيه؟</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {KIND_OPTIONS.map(([value, label]) => (
              <label key={value} className="flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" name="kinds" value={value} defaultChecked={value === "positive" || value === "negative" || value === "boundary"} className="h-5 w-5 accent-brand" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="count" className="label">عدد الحالات تقريبًا</label>
            <select id="count" name="count" defaultValue="8" className="input w-32">
              {["5", "8", "12", "15"].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="label mb-1.5">اللغة</legend>
            <div className="flex gap-4">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="language" value="AR" defaultChecked className="h-5 w-5 accent-brand" /> عربي
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="language" value="EN" className="h-5 w-5 accent-brand" /> English
              </label>
            </div>
          </fieldset>
          <button type="submit" disabled={generating || left <= 0} className="btn-primary ms-auto min-h-12 px-6">
            {generating ? "بيولّد الحالات… (لحد 30 ثانية)" : cases.length ? "ولّد تاني" : "ولّد الحالات"}
          </button>
        </div>
        <span className="text-xs text-muted">فاضلك {Math.max(0, left)} توليدة الشهر ده. كل ضغطة بتتحسب واحدة.</span>
      </form>

      {cases.length > 0 ? (
        <form action={save} className="flex flex-col gap-4">
          <input
            type="hidden"
            name="payload"
            value={JSON.stringify({ cases: cases.filter((_, i) => picked.has(i)) })}
          />
          <input type="hidden" name="storyKey" value={gen.storyKey ?? ""} />
          <input type="hidden" name="storyTitle" value={gen.storyTitle ?? ""} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">راجع الحالات ({picked.size} من {cases.length} متعلّمين)</h2>
            <button
              type="button"
              className="btn-secondary min-h-9"
              onClick={() => setPicked(picked.size === cases.length ? new Set() : new Set(cases.map((_, i) => i)))}
            >
              {picked.size === cases.length ? "إلغاء الكل" : "اختار الكل"}
            </button>
          </div>
          <p className="text-sm text-muted">الذكاء الاصطناعي بيغلط أحيانًا: شيل العلامة من أي حالة مش مناسبة، وعدّل الباقي بعد الحفظ.</p>

          <ul className="flex flex-col gap-3">
            {cases.map((c, i) => (
              <li key={i} className={`card flex items-start gap-3 p-4 ${picked.has(i) ? "" : "opacity-60"}`}>
                <input
                  id={`gc-${i}`}
                  type="checkbox"
                  checked={picked.has(i)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(i);
                    else next.delete(i);
                    setPicked(next);
                  }}
                  className="mt-1.5 h-5 w-5 shrink-0 accent-brand"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`gc-${i}`} className="cursor-pointer font-semibold leading-7" style={{ unicodeBidi: "plaintext" }}>
                    {c.title}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`chip ${c.priority === "HIGH" ? "bg-warn-soft text-warn-ink" : "bg-canvas text-ink-soft"}`}>أولوية {PRIORITY_LABEL[c.priority]}</span>
                    <span className="chip bg-canvas text-ink-soft">{CASE_TYPE_LABEL[c.type]}</span>
                    <span className="chip bg-canvas text-ink-soft">{c.steps.length} خطوات</span>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-brand">الخطوات</summary>
                    {c.preconditions ? <p className="mt-2 text-muted" style={{ unicodeBidi: "plaintext" }}>الشروط المسبقة: {c.preconditions}</p> : null}
                    <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5 leading-7">
                      {c.steps.map((s, n) => (
                        <li key={n} style={{ unicodeBidi: "plaintext" }}>
                          {s.action}
                          {s.expected ? <span className="text-muted"> ← {s.expected}</span> : null}
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-end gap-3 rounded-[14px] border border-line-strong bg-white p-4 shadow-[0_8px_24px_rgba(22,32,31,0.10)]">
            <div className="flex min-w-[200px] flex-col gap-1.5">
              <label htmlFor="suite" className="label">Suite</label>
              <select id="suite" name="suite" value={suite} onChange={(e) => setSuite(e.target.value)} className="input">
                <option value="new">Suite جديدة…</option>
                <option value="">بدون Suite</option>
                {suites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {suite === "new" ? (
              <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                <label htmlFor="newSuite" className="label">اسم الـ Suite</label>
                <input id="newSuite" name="newSuite" maxLength={120} defaultValue={gen.storyTitle ?? gen.storyKey ?? "حالات مولّدة"} className="input" />
              </div>
            ) : null}
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="ready" className="h-5 w-5 accent-brand" />
              علّمها جاهزة للتنفيذ
            </label>
            <button type="submit" disabled={saving || picked.size === 0} className="btn-primary">
              {saving ? "جاري الحفظ…" : `احفظ ${picked.size} في المشروع`}
            </button>
            {saved.error ? <p role="alert" className="w-full text-sm text-warn-ink">{saved.error}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
