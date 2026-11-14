"use client";

import { useActionState, type ReactNode } from "react";
import type { SettingsState } from "@/app/(app)/settings/actions";

type Action = (prev: SettingsState, formData: FormData) => Promise<SettingsState>;

export function SettingsForm({
  action,
  title,
  description,
  submitLabel,
  children,
  resetOnSuccess = false,
}: {
  action: Action;
  title: string;
  description?: string;
  submitLabel: string;
  children: ReactNode;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      <form action={formAction} key={resetOnSuccess && state.ok ? state.ok : "form"} className="flex flex-col gap-4">
        {children}
        {state.error ? (
          <p role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn-ink">{state.error}</p>
        ) : state.ok ? (
          <p role="status" className="rounded-[10px] border border-pass/30 bg-pass-soft px-3 py-2 text-sm text-pass-ink">{state.ok}</p>
        ) : null}
        <button type="submit" disabled={pending} className="btn-primary self-start">
          {pending ? "جاري الحفظ…" : submitLabel}
        </button>
      </form>
    </section>
  );
}
