import Link from "next/link";
import { Logo } from "./Logo";

export function MarketingHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5">
        <Link href="/" aria-label="تسليم: الصفحة الرئيسية">
          <Logo />
        </Link>
        <nav aria-label="أقسام الموقع" className="ms-auto flex flex-wrap gap-1 text-[15px] text-ink-soft">
          <Link href="/#how" className="flex min-h-11 items-center px-3 hover:text-ink">إزاي بيشتغل</Link>
          <Link href="/#features" className="flex min-h-11 items-center px-3 hover:text-ink">المميزات</Link>
          <Link href="/pricing" className="flex min-h-11 items-center px-3 hover:text-ink">الأسعار</Link>
          <Link href="/#faq" className="flex min-h-11 items-center px-3 hover:text-ink">أسئلة شائعة</Link>
        </nav>
        {signedIn ? (
          <Link href="/dashboard" className="btn-primary bg-ink hover:bg-ink-soft">لوحة التحكم</Link>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="btn-secondary">دخول</Link>
            <Link href="/signup" className="btn-primary bg-ink hover:bg-ink-soft">ابدأ مجانًا</Link>
          </div>
        )}
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted">
        <span>تسليم · أداة كتابة وتنفيذ وتسليم شغل الـ QA</span>
        <div className="flex flex-wrap gap-4">
          <Link href="/pricing" className="hover:text-ink">الأسعار</Link>
          <Link href="/login" className="hover:text-ink">دخول</Link>
        </div>
      </div>
    </footer>
  );
}
