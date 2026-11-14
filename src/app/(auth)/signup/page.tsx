import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "حساب جديد" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/projects");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">حساب جديد</h1>
        <p className="text-sm text-muted">مجاناً. مشروعين و 100 حالة اختبار من غير كارت.</p>
      </div>
      <SignupForm />
    </div>
  );
}
