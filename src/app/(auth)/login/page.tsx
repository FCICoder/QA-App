import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">تسجيل الدخول</h1>
      <LoginForm />
    </div>
  );
}
