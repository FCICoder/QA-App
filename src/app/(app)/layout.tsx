import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-wrap items-stretch">
      <nav
        aria-label="القائمة الرئيسية"
        className="flex max-w-full flex-[1_1_232px] flex-col gap-6 border-line bg-white px-4 py-6 lg:border-e"
      >
        <Link href="/dashboard" className="px-2" aria-label="تسليم: الرئيسية">
          <Logo />
        </Link>

        <div className="rounded-[10px] border border-line bg-canvas px-3 py-2">
          <div className="text-xs text-muted">مساحة العمل</div>
          <div className="text-sm font-semibold">{user.workspaceName}</div>
        </div>

        <div className="flex flex-col gap-1">
          <NavLink href="/dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />
            </svg>
            الرئيسية
          </NavLink>
          <NavLink href="/projects">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            المشاريع
          </NavLink>
          <NavLink href="/library">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h4v16H5zM10 4h4v16h-4zM15.5 4.5l3.8-1 3.2 15.5-3.8 1z" />
            </svg>
            المكتبة
          </NavLink>
          <NavLink href="/settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
            </svg>
            الإعدادات
          </NavLink>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
          <div className="px-1">
            <div className="text-sm font-semibold">{user.name}</div>
            <div className="text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>
              {user.email}
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="btn-secondary w-full">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </nav>

      <main className="min-w-0 flex-[999_1_560px] px-5 py-7 sm:px-8">{children}</main>
    </div>
  );
}
