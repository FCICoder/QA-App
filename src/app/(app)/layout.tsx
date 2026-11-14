import type { ReactNode } from "react";
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
        <div className="px-2">
          <Logo />
        </div>

        <div className="rounded-[10px] border border-line bg-canvas px-3 py-2">
          <div className="text-xs text-muted">مساحة العمل</div>
          <div className="text-sm font-semibold">{user.workspaceName}</div>
        </div>

        <div className="flex flex-col gap-1">
          <NavLink href="/projects">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            المشاريع
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
