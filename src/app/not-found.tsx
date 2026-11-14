import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">الصفحة دي مش موجودة</h1>
      <p className="text-muted">ممكن تكون اتمسحت، أو مش ضمن مساحة العمل بتاعتك.</p>
      <Link href="/dashboard" className="btn-primary">
        رجوع للرئيسية
      </Link>
    </main>
  );
}
