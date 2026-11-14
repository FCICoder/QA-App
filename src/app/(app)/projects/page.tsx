import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/labels";
import { createProject } from "./actions";

export const metadata: Metadata = { title: "المشاريع" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await db.project.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { cases: { where: { deletedAt: null } }, suites: true, stories: true } },
    },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold">المشاريع</h1>
        <p className="text-muted">كل مشروع غالباً عميل أو إصدار. جوّاه الـ Suites والـ Test Cases واليوزر ستوريز.</p>
      </div>

      <section aria-labelledby="new-project" className="card p-5">
        <h2 id="new-project" className="mb-4 text-lg font-bold">مشروع جديد</h2>
        <form action={createProject} className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[220px] flex-[2_1_260px] flex-col gap-1.5">
            <label htmlFor="name" className="label">اسم المشروع</label>
            <input id="name" name="name" required placeholder="مثلاً: تطبيق الطلبات · الإصدار 2.4" className="input" />
          </div>
          <div className="flex min-w-[200px] flex-[1_1_220px] flex-col gap-1.5">
            <label htmlFor="clientName" className="label">العميل (اختياري)</label>
            <input id="clientName" name="clientName" placeholder="مثلاً: متجر نوارة" className="input" />
          </div>
          <SubmitButton pendingText="جاري الإنشاء…">إنشاء المشروع</SubmitButton>
        </form>
      </section>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-lg font-semibold">لسه مفيش مشاريع</p>
          <p className="text-muted">ابدأ بمشروع لأول عميل، وبعدين ضيف الـ Test Cases.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card flex flex-col gap-3 p-5 transition-colors hover:border-brand/40"
            >
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold leading-snug">{p.name}</span>
                <span className="text-sm text-muted">{p.clientName ?? "بدون عميل"}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                <span>{p._count.cases} حالة</span>
                <span>{p._count.suites} Suite</span>
                <span>{p._count.stories} ستوري</span>
              </div>
              <span className="text-xs text-muted">آخر تحديث {formatDate(p.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
