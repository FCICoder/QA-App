"use client";

import { useActionState } from "react";
import { joinWaitlist } from "@/app/waitlist-actions";

export function WaitlistForm({ source, cta = "سجّلني" }: { source: string; cta?: string }) {
  const [state, action, pending] = useActionState(joinWaitlist, {});
  if (state.done) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-pass/30 bg-white px-4 py-3">
        <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pass text-white">✓</span>
        <span className="text-[15px] leading-7">اتسجلت. هنبعتلك أول ما الباقات المدفوعة تفتح، بسعر الإطلاق.</span>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-wrap gap-2">
        <label htmlFor={`wl-${source}`} className="sr-only">بريدك الإلكتروني</label>
        <input
          id={`wl-${source}`}
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          placeholder="you@example.com"
          className="input min-h-12 flex-[1_1_240px] text-right"
        />
        <button type="submit" disabled={pending} className="btn-primary min-h-12 px-6">
          {pending ? "جاري التسجيل…" : cta}
        </button>
      </div>
      {state.error ? <p role="alert" className="text-sm text-warn-ink">{state.error}</p> : null}
    </form>
  );
}
