"use client";

import { useActionState, useState } from "react";
import type { PublicFormState } from "@/app/r/[token]/actions";

type Action = (prev: PublicFormState, formData: FormData) => Promise<PublicFormState>;

function Alert({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn-ink">
      {text}
    </p>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Alert text={state.error} />
      <label htmlFor="pw" className="label">كلمة السر</label>
      <input id="pw" name="password" type="password" required autoFocus dir="ltr" className="input text-right" />
      <button type="submit" disabled={pending} className="btn-primary min-h-12">
        {pending ? "جاري الفتح…" : "افتح التقرير"}
      </button>
    </form>
  );
}

export function SignOffPanel({
  signAction,
  feedbackAction,
  workspaceName,
  runLabel,
}: {
  signAction: Action;
  feedbackAction: Action;
  workspaceName: string;
  runLabel: string;
}) {
  const [mode, setMode] = useState<"sign" | "feedback">("sign");
  return mode === "sign" ? (
    <SignOffForm action={signAction} workspaceName={workspaceName} runLabel={runLabel} onFeedback={() => setMode("feedback")} />
  ) : (
    <FeedbackForm action={feedbackAction} onBack={() => setMode("sign")} />
  );
}

function SignOffForm({
  action,
  workspaceName,
  runLabel,
  onFeedback,
}: {
  action: Action;
  workspaceName: string;
  runLabel: string;
  onFeedback: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  if (state.done) {
    return (
      <div role="status" className="flex items-center gap-3">
        <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pass text-xl text-white">✓</span>
        <span className="text-[15px] leading-7">اتسجلت موافقتك. تقدر تحمّل محضر الاستلام من زرار «تحميل PDF».</span>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-[15px] leading-7 text-ink-soft">
        بموافقتك بتأكد إنك راجعت نتايج {runLabel}. الموافقة بتتسجل باسمك وتاريخها، وبتظهر لـ {workspaceName} وفي محضر الاستلام.
      </p>
      <Alert text={state.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="so-name" className="label">الاسم</label>
          <input id="so-name" name="name" required autoComplete="name" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="so-email" className="label">البريد الإلكتروني</label>
          <input id="so-email" name="email" type="email" required autoComplete="email" dir="ltr" className="input text-right" />
        </div>
      </div>
      <label className="flex items-start gap-2.5 text-[15px] leading-7">
        <input type="checkbox" name="agree" required className="mt-1.5 h-5 w-5 accent-brand" />
        راجعت التقرير وموافق على نتايج الاختبار
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-primary min-h-12 px-6 text-base">
          {pending ? "جاري التسجيل…" : "أوافق على التقرير"}
        </button>
        <button type="button" className="btn-secondary min-h-12" onClick={onFeedback}>
          طلب تعديل أو استفسار
        </button>
      </div>
    </form>
  );
}

function FeedbackForm({ action, onBack }: { action: Action; onBack: () => void }) {
  const [state, formAction, pending] = useActionState(action, {});
  if (state.done) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="text-[15px] leading-7">اتبعتت رسالتك، وهتوصل لفريق الاختبار.</p>
        <button type="button" className="btn-secondary self-start" onClick={onBack}>رجوع للموافقة</button>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Alert text={state.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fb-name" className="label">الاسم</label>
          <input id="fb-name" name="name" required autoComplete="name" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fb-email" className="label">البريد الإلكتروني</label>
          <input id="fb-email" name="email" type="email" required autoComplete="email" dir="ltr" className="input text-right" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-msg" className="label">عايز تعدّل أو تسأل عن إيه؟</label>
        <textarea id="fb-msg" name="message" rows={4} required maxLength={3000} className="textarea" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "جاري الإرسال…" : "إرسال"}</button>
        <button type="button" className="btn-secondary" onClick={onBack}>رجوع</button>
      </div>
    </form>
  );
}
