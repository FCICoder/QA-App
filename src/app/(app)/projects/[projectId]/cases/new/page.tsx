import type { Metadata } from "next";
import Link from "next/link";
import { TestCaseForm } from "@/components/TestCaseForm";
import { getProjectOr404 } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { firstParam, type SearchParams } from "@/lib/params";
import { createCase } from "../actions";

export const metadata: Metadata = { title: "Test Case جديد" };

export default async function NewCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const sp = await searchParams;
  const project = await getProjectOr404(projectId, user.workspaceId);

  const [suites, stories] = await Promise.all([
    db.suite.findMany({
      where: { projectId: project.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
    db.userStory.findMany({
      where: { projectId: project.id },
      orderBy: { key: "asc" },
      select: { key: true, title: true },
    }),
  ]);

  const requestedSuite = firstParam(sp.suite);
  const suiteId = suites.find((s) => s.id === requestedSuite)?.id ?? suites[0]?.id ?? null;
  const action = createCase.bind(null, project.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <nav aria-label="مسار التنقل" className="text-sm text-muted">
          <Link href="/projects" className="hover:text-ink">المشاريع</Link>
          {" / "}
          <Link href={`/projects/${project.id}`} className="hover:text-ink">{project.name}</Link>
        </nav>
        <h1 className="text-2xl font-bold">Test Case جديد</h1>
      </div>
      <TestCaseForm
        action={action}
        suites={suites}
        stories={stories}
        submitLabel="حفظ الحالة"
        cancelHref={`/projects/${project.id}`}
        initial={{
          title: "",
          preconditions: "",
          priority: "MEDIUM",
          type: "FUNCTIONAL",
          status: "DRAFT",
          language: "AR",
          suiteId,
          storyKey: "",
          steps: [],
        }}
      />
    </div>
  );
}
