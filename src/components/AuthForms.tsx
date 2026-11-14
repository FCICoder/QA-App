"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "@/app/(auth)/actions";

const initial: AuthState = {};

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn-ink">
      {message}
    </p>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <ErrorBox message={state.error} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="label">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" dir="ltr" required autoComplete="email" defaultValue={state.email} className="input text-right" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="label">كلمة السر</label>
        <input id="password" name="password" type="password" dir="ltr" required autoComplete="current-password" className="input text-right" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary min-h-12 text-base">
        {pending ? "جاري الدخول…" : "دخول"}
      </button>
      <p className="text-center text-sm text-muted">
        ماعندكش حساب؟{" "}
        <Link href="/signup" className="font-semibold text-brand hover:text-brand-dark">
          اعمل حساب جديد
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <ErrorBox message={state.error} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="label">اسمك</label>
        <input id="name" name="name" required autoComplete="name" className="input" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="workspaceName" className="label">اسم مساحة العمل</label>
        <input id="workspaceName" name="workspaceName" placeholder="مثلاً: مختبر حمزة للجودة" className="input" />
        <span className="text-xs text-muted">ده الاسم اللي هيظهر على التقارير. تقدر تغيّره بعدين.</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="label">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" dir="ltr" required autoComplete="email" defaultValue={state.email} className="input text-right" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="label">كلمة السر</label>
        <input id="password" name="password" type="password" dir="ltr" required minLength={8} autoComplete="new-password" className="input text-right" />
        <span className="text-xs text-muted">8 حروف على الأقل.</span>
      </div>
      <button type="submit" disabled={pending} className="btn-primary min-h-12 text-base">
        {pending ? "جاري إنشاء الحساب…" : "إنشاء الحساب"}
      </button>
      <p className="text-center text-sm text-muted">
        عندك حساب؟{" "}
        <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
          سجّل دخول
        </Link>
      </p>
    </form>
  );
}
