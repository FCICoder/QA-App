"use client";

import { useActionState, useState } from "react";
import type { LibraryState } from "@/app/(app)/library/actions";

export type PickerItem = {
  value: string; // "lib:<id>" or "pack:<packId>:<index>"
  title: string;
  meta: string;
  preconditions: string | null;
  steps: { action: string; expected: string | null }[];
  deleteId?: string; // set for the user's own items
};

export type PickerGroup = { id: string; title: string; description?: string; items: PickerItem[] };

export function LibraryPicker({
  groups,
  projects,
  defaultProjectId,
  copyAction,
  deleteAction,
  emptyText,
}: {
  groups: PickerGroup[];
  projects: { id: string; name: string }[];
  defaultProjectId: string;
  copyAction: (prev: LibraryState, formData: FormData) => Promise<LibraryState>;
  deleteAction?: (formData: FormData) => Promise<void>;
  emptyText: string;
}) {
  const [state, formAction, pending] = useActionState(copyAction, {});
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function toggle(values: string[], on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      for (const v of values) {
        if (on) next.add(v);
        else next.delete(v);
      }
      return next;
    });
  }

  if (groups.length === 0) {
    return <div className="card p-10 text-center text-muted">{emptyText}</div>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {groups.map((g) => {
        const values = g.items.map((i) => i.value);
        const all = values.every((v) => picked.has(v));
        return (
          <section key={g.id} aria-labelledby={`g-${g.id}`} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div className="flex flex-col">
                <h2 id={`g-${g.id}`} className="text-lg font-bold">
                  {g.title} <span className="text-sm font-normal text-muted">({g.items.length})</span>
                </h2>
                {g.description ? <p className="text-sm text-muted">{g.description}</p> : null}
              </div>
              <button type="button" className="btn-secondary min-h-9" onClick={() => toggle(values, !all)}>
                {all ? "إلغاء التحديد" : "اختار الكل"}
              </button>
            </div>
            <ul className="divide-y divide-line/70">
              {g.items.map((item) => (
                <li key={item.value} className="flex items-start gap-3 px-5 py-3">
                  <input
                    id={item.value}
                    type="checkbox"
                    name="item"
                    value={item.value}
                    checked={picked.has(item.value)}
                    onChange={(e) => toggle([item.value], e.target.checked)}
                    className="mt-1.5 h-5 w-5 shrink-0 accent-brand"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <label htmlFor={item.value} className="cursor-pointer font-semibold leading-7">
                      {item.title}
                    </label>
                    <span className="text-xs text-muted">{item.meta}</span>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-brand">الخطوات ({item.steps.length})</summary>
                      {item.preconditions ? <p className="mt-2 text-muted">الشروط المسبقة: {item.preconditions}</p> : null}
                      <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5 leading-7">
                        {item.steps.map((s, i) => (
                          <li key={i}>
                            {s.action}
                            {s.expected ? <span className="text-muted"> ← {s.expected}</span> : null}
                          </li>
                        ))}
                      </ol>
                    </details>
                  </div>
                  {item.deleteId && deleteAction ? (
                    <button
                      type="submit"
                      formAction={deleteAction}
                      name="deleteId"
                      value={item.deleteId}
                      formNoValidate
                      className="btn-secondary min-h-9 shrink-0 px-3 text-xs"
                      onClick={(e) => {
                        if (!window.confirm("تمسح الحالة دي من مكتبتك؟ النسخ اللي في المشاريع مش هتتأثر.")) e.preventDefault();
                      }}
                    >
                      مسح
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="sticky bottom-3 z-10 flex flex-wrap items-end gap-3 rounded-[14px] border border-line-strong bg-white p-4 shadow-[0_8px_24px_rgba(22,32,31,0.10)]">
        <div className="flex min-w-[200px] flex-[1_1_220px] flex-col gap-1.5">
          <label htmlFor="projectId" className="label">انسخ للمشروع</label>
          <select id="projectId" name="projectId" defaultValue={defaultProjectId} required className="input">
            <option value="" disabled>اختار مشروع</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[180px] flex-[1_1_200px] flex-col gap-1.5">
          <label htmlFor="suiteName" className="label">في Suite (اختياري)</label>
          <input id="suiteName" name="suiteName" maxLength={120} placeholder="اسم Suite موجود أو جديد" className="input" />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="ready" className="h-5 w-5 accent-brand" />
          علّمها جاهزة للتنفيذ
        </label>
        <button type="submit" disabled={pending || picked.size === 0} className="btn-primary">
          {pending ? "جاري النسخ…" : `انسخ ${picked.size || ""} ${picked.size === 1 ? "حالة" : "حالات"}`.replace("  ", " ")}
        </button>
        {state.error ? (
          <p role="alert" className="w-full text-sm text-warn-ink">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
