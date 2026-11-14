import type { Metadata } from "next";
import Link from "next/link";
import { GenerateForm } from "@/components/GenerateForm";
import { getProjectOr404 } from "@/lib/access";
import { aiEnabled, aiLimit, aiUsageThisMonth } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCases, saveGeneratedCases } from "./actions";

export const metadata: Metadata = { title: "توليد حالات بالذكاء الاصطناعي" };
export const maxDuration = 60;

export default async function GeneratePage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectOr404(projectId, user.workspaceId);
  const base = `/projects/${project.id}`;

  const [suites, stories, used] = await Promise.all([
    db.suite.findMany({
      where: { projectId: project.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
    db.userStory.findMany({ where: { projectId: project.id }, orderBy: { key: "asc" }, select: { key: true, title: true } }),
    aiUsageThisMonth(user.workspaceId),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <nav aria-label="مسار التنقل" className="text-sm text-muted">
          <Link href="/projects" className="hover:text-ink">المشاريع</Link>
          {" / "}
          <Link href={base} className="hover:text-ink">{project.name}</Link>
        </nav>
        <h1 className="text-[26px] font-bold">توليد حالات بالذكاء الاصطناعي</h1>
        <p className="text-muted">الصق المتطلب، راجع الحالات اللي طلعت، واحفظ اللي يناسبك في المشروع.</p>
      </div>

      {!aiEnabled() ? (
        <div className="card flex flex-col gap-2 p-6">
          <h2 className="text-lg font-bold">التوليد مش متفعّل على السيرفر ده</h2>
          <p className="text-sm leading-7 text-ink-soft">
            صاحب التطبيق محتاج يضيف مفتاح <span dir="ltr">ANTHROPIC_API_KEY</span> في إعدادات السيرفر. لحد ما يحصل، تقدر تكتب الحالات بنفسك أو تنسخها من{" "}
            <Link href={`/library?tab=packs&project=${project.id}`} className="font-semibold text-brand">الحزم الجاهزة</Link>.
          </p>
        </div>
      ) : (
        <GenerateForm
          generateAction={generateCases.bind(null, project.id)}
          saveAction={saveGeneratedCases.bind(null, project.id)}
          suites={suites}
          stories={stories}
          remaining={Math.max(0, aiLimit() - used)}
          limit={aiLimit()}
        />
      )}
    </div>
  );
}
