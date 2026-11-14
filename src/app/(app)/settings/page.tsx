import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/SettingsForms";
import { aiLimit, aiUsageThisMonth } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { changePassword, updateProfile, updateWorkspace } from "./actions";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  const user = await requireUser();
  const used = await aiUsageThisMonth(user.workspaceId);
  const limit = aiLimit();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold">الإعدادات</h1>
        <p className="text-muted">حسابك ومساحة العمل.</p>
      </div>

      <SettingsForm
        action={updateWorkspace}
        title="مساحة العمل"
        description="الاسم ده بيظهر لعملائك في صفحة التقرير وفي ملفات الـ PDF."
        submitLabel="حفظ"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="workspaceName" className="label">اسم مساحة العمل</label>
          <input
            id="workspaceName"
            name="workspaceName"
            required
            maxLength={120}
            defaultValue={user.workspaceName}
            disabled={user.role === "MEMBER"}
            className="input"
          />
        </div>
      </SettingsForm>

      <SettingsForm action={updateProfile} title="الملف الشخصي" submitLabel="حفظ">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="label">الاسم</label>
          <input id="name" name="name" required maxLength={120} defaultValue={user.name} autoComplete="name" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="label">البريد الإلكتروني</span>
          <span dir="ltr" className="text-right text-ink-soft">{user.email}</span>
        </div>
      </SettingsForm>

      <SettingsForm action={changePassword} title="كلمة السر" submitLabel="تغيير كلمة السر" resetOnSuccess>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="currentPassword" className="label">كلمة السر الحالية</label>
          <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" dir="ltr" className="input text-right" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="label">الجديدة (8 حروف على الأقل)</label>
            <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" dir="ltr" className="input text-right" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="label">تأكيد الجديدة</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" dir="ltr" className="input text-right" />
          </div>
        </div>
      </SettingsForm>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">الباقة</h2>
        <p className="text-sm leading-7 text-ink-soft">
          إنت على الفترة التجريبية: كل المميزات مفتوحة. التوليد بالذكاء الاصطناعي الشهر ده:{" "}
          <strong>{used} من {limit}</strong>.
        </p>
        <Link href="/pricing" className="btn-secondary self-start">شوف الباقات والأسعار</Link>
      </section>
    </div>
  );
}
