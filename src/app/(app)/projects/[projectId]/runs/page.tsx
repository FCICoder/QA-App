import type { Metadata } from "next";
import Link from "next/link";
import { CreateRunForm } from "@/components/CreateRunForm";
import { RunBar, RunLegend } from "@/components/RunBar";
import { getProjectOr404 } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/labels";
import { countStatuses } from "@/lib/runs";
import { createRun } from "./actions";

export const metadata: Metadata = { title: "Test Runs" };

export default async function RunsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const user = await requireUser();
  const { projectId } = await params;
  const project = await getProjectOr404(projectId, user.workspaceId);

  const [runs, suites, totalCount, noSuiteCount] = await Promise.all([
    db.testRun.findMany({
      where: { projectId: project.id },
      orderBy: { number: "desc" },
      include: {
        cases: { select: { status: true } },
        report: { select: { revokedAt: true, signOff: { select: { name: true, signedAt: true } } } },
      },
    }),
    db.suite.findMany({
      where: { projectId: project.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { cases: { where: { deletedAt: null, status: { not: "DEPRECATED" } } } } } },
    }),
    db.testCase.count({ where: { projectId: project.id, deletedAt: null, status: { not: "DEPRECATED" } } }),
    db.testCase.count({ where: { projectId: project.id, deletedAt: null, status: { not: "DEPRECATED" }, suiteId: null } }),
  ]);

  const action = createRun.bind(null, project.id);
  const base = `/projects/${project.id}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <nav aria-label="مسار التنقل" className="text-sm text-muted">
          <Link href="/projects" className="hover:text-ink">المشاريع</Link>
          {" / "}
          <Link href={base} className="hover:text-ink">{project.name}</Link>
        </nav>
        <h1 className="text-[26px] font-bold">Test Runs</h1>
        <p className="text-muted">كل Run بينفّذ مجموعة حالات ويسجّل نتيجة كل خطوة. لما تقفله، تقدر تبعت للعميل رابط تقرير يوافق عليه.</p>
      </div>

      <section aria-labelledby="new-run" className="card p-5">
        <h2 id="new-run" className="mb-4 text-lg font-bold">Run جديد</h2>
        {totalCount === 0 ? (
          <p className="text-muted">
            مفيش حالات في المشروع لسه.{" "}
            <Link href={`${base}/cases/new`} className="font-semibold text-brand">اكتب أول حالة</Link>
          </p>
        ) : (
          <CreateRunForm
            action={action}
            suites={suites.map((s) => ({ id: s.id, name: s.name, count: s._count.cases }))}
            noSuiteCount={noSuiteCount}
            totalCount={totalCount}
            nextNumber={project.runCounter + 1}
          />
        )}
      </section>

      <section aria-labelledby="runs-h" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="runs-h" className="text-lg font-bold">الـ Runs ({runs.length})</h2>
          <RunLegend />
        </div>
        {runs.length === 0 ? (
          <div className="card p-8 text-center text-muted">لسه مفيش Runs في المشروع ده.</div>
        ) : (
          <div className="card divide-y divide-line/70">
            {runs.map((run) => {
              const counts = countStatuses(run.cases.map((c) => c.status));
              const signed = run.report?.signOff;
              return (
                <Link key={run.id} href={`${base}/runs/${run.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-canvas/60">
                  <div className="flex min-w-0 flex-[2_1_260px] flex-col gap-1">
                    <span className="font-semibold">
                      <span className="text-muted" dir="ltr">#{run.number}</span> · {run.name}
                    </span>
                    <span className="text-xs text-muted">
                      {run.scopeLabel}
                      {run.environment ? ` · ${run.environment}` : ""} · {formatDateTime(run.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-[1_1_200px] flex-col gap-1.5">
                    <RunBar counts={counts} />
                    <span className="text-xs text-muted">
                      {counts.done} من {counts.total} اتنفّذت · {counts.failed} فشل
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {run.status === "IN_PROGRESS" ? (
                      <span className="chip bg-brand-soft text-brand-dark">مفتوح</span>
                    ) : (
                      <span className="chip bg-canvas text-ink-soft">مقفول</span>
                    )}
                    {signed ? (
                      <span className="chip bg-pass-soft text-pass-ink">وافق العميل</span>
                    ) : run.report && !run.report.revokedAt ? (
                      <span className="chip bg-warn-soft text-warn-ink">بانتظار موافقة العميل</span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
