import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-center">
          <Link href="/" aria-label="تسليم: الصفحة الرئيسية">
            <Logo size="lg" />
          </Link>
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
