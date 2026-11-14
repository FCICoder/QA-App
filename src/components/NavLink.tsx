"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] ${
        active ? "bg-brand-soft font-semibold text-brand-dark" : "text-ink hover:bg-canvas"
      }`}
    >
      {children}
    </Link>
  );
}
