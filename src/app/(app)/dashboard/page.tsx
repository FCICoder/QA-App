import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { RunBar } from "@/components/RunBar";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { VERDICT_LABEL, formatDate, formatDateTime } from "@/lib/labels";
import { countStatuses, percent } from "@/lib/runs";
import { siteUrl } from "@/lib/url";

export const metadata: Metadata = { title: "الرئيسية" };

export default async function DashboardPage() {
  const user = await requireUser();
  const inWorkspace = { project: { workspaceId: user.workspaceId } };
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [projectCount, caseCount, openRuns, pending, signOffs, signedLast30, feedback] = await Promise.all([
    db.project.count({ where: { workspaceId: user.workspaceId } }),
    db.testCase.count({ where: { deletedAt: null, ...inWorkspace } }),
    db.testRun.findMany({
      where: { status: "IN_PROGRESS", ...inWorkspace },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { project: { select: { id: true, name: true } }, cases: { select: { status: true } } },
    }),
    db.clientReport.findMany({
      where: {
        run: inWorkspace,
        signOff: { is: null },
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { run: { select: { id: true, number: true, name: true, project: { select: { id: true, name: true, clientName: true } } } } },
    }),
    db.signOff.findMany({
      where: { report: { run: inWorkspace } },
      orderBy: { signedAt: "desc" },
      take: 5,
      include: { report: { select: { run: { select: { id: true, name: true, project: { select: { id: true, name: true } } } } } } },
    }),
    db.signOff.count({ where: { report: { run: inWorkspace }, signedAt: { gt: monthAgo } } }),
    db.reportFeedback.findMany({
      where: { report: { run: inWorkspace } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { report: { select: { run: { select: { id: true, name: true, project: { select: { id: true, name: true } } } } } } },
    }),
  ]);

  const origin = pending.length ? await siteUrl() : "";
  const firstName = user.name.trim().split(/\s+/)[0];

  const stats: [string, number, string?][] = [
    ["المشاريع", projectCount],
    ["حالات الاختبار", caseCount],
    ["Runs شغالة", openRuns.length],
    ["بانتظار موافقة العميل", pending.length, pending.length ? "text-warn" : ""],
    ["موافقات آخر 30 يوم", signedLast30, signedLast30 ? "text-pass" : ""],
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold">أهلاً {firstName}</h1>
          <p className="text-muted">ده ملخص شغلك في {user.workspaceName}.</p>
        </div>
        <Link href="/projects" className="btn-primary">+ مشروع جديد</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value, color]) => (
          <div key={label} className="card p-4">
            <div className="text-sm text-muted">{label}</div>
            <div className={`text-3xl font-bold ${color ?? ""}`}>{value}</div>
          </div>
        ))}
      </div>

      {projectCount === 0 ? (
        <section aria-labelledby="start-h" className="card flex flex-col gap-4 p-6">
          <h2 id="start-h" className="text-xl font-bold">ابدأ من هنا</h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["اعمل مشروع", "مشروع لكل عميل أو إصدار.", "/projects"],
              ["ضيف حالات الاختبار", "اكتبها، أو انسخها من المكتبة، أو ولّدها من اليوزر ستوري.", "/library?tab=packs"],
              ["نفّذ Test Run", "نجح أو فشل لكل خطوة، وBug Report جاهز للي فشل.", null],
              ["ابعت الرابط للعميل", "يراجع ويوافق، وتاخد محضر استلام PDF.", null],
            ].map(([title, text, href], i) => (
              <li key={title} className="flex flex-col gap-2 rounded-xl bg-canvas p-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                {href ? (
                  <Link href={href} className="font-bold text-brand hover:text-brand-dark">{title}</Link>
                ) : (
                  <span className="font-bold">{title}</span>
                )}
                <span className="text-sm leading-6 text-ink-soft">{text}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="pending-h" className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h2 id="pending-h" className="text-lg font-bold">بانتظار موافقة العميل</h2>
        </div>
        {pending.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">مفيش تقارير مستنية موافقة. لما تقفل Run وتعمل رابط للعميل، هيظهر هنا لحد ما يوافق.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex min-w-[220px] flex-1 flex-col">
                  <Link href={`/projects/${r.run.project.id}/runs/${r.run.id}`} className="font-semibold hover:text-brand">
                    {r.run.project.name} · {r.run.name}
                  </Link>
                  <span className="text-xs text-muted">
                    {r.run.project.clientName ? `${r.run.project.clientName} · ` : ""}
                    {VERDICT_LABEL[r.verdict]} · اتبعت {formatDate(r.createdAt)} ·{" "}
                    {r.viewCount === 0 ? "لسه ماتفتحش" : `اتفتح ${r.viewCount} مرة، آخرها ${formatDateTime(r.lastViewedAt ?? r.createdAt)}`}
                  </span>
                </div>
                <CopyButton text={`${origin}/r/${r.token}`} className="btn-secondary min-h-9" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="runs-h" className="card overflow-hidden">
          <h2 id="runs-h" className="border-b border-line px-5 py-3 text-lg font-bold">Runs شغالة</h2>
          {openRuns.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">مفيش Runs مفتوحة دلوقتي.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {openRuns.map((run) => {
                const c = countStatuses(run.cases.map((x) => x.status));
                return (
                  <li key={run.id} className="flex flex-col gap-2 px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/projects/${run.project.id}/runs/${run.id}`} className="font-semibold hover:text-brand">
                        {run.project.name} · {run.name}
                      </Link>
                      <span className="text-xs text-muted">
                        {c.done}/{c.total} · {percent(c.done, c.total)}
                      </span>
                    </div>
                    <RunBar counts={c} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="signed-h" className="card overflow-hidden">
          <h2 id="signed-h" className="border-b border-line px-5 py-3 text-lg font-bold">آخر موافقات العملاء</h2>
          {signOffs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">لسه مفيش موافقات.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {signOffs.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pass text-white">✓</span>
                  <div className="flex min-w-0 flex-col">
                    <Link href={`/projects/${s.report.run.project.id}/runs/${s.report.run.id}`} className="font-semibold hover:text-brand">
                      {s.report.run.project.name} · {s.report.run.name}
                    </Link>
                    <span className="text-xs text-muted">وافق {s.name} · {formatDateTime(s.signedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {feedback.length > 0 ? (
        <section aria-labelledby="fb-h" className="card overflow-hidden">
          <h2 id="fb-h" className="border-b border-line px-5 py-3 text-lg font-bold">آخر رسايل العملاء</h2>
          <ul className="divide-y divide-line/70">
            {feedback.map((f) => (
              <li key={f.id} className="flex flex-col gap-1 px-5 py-3">
                <span className="text-xs text-muted">
                  {f.name} على{" "}
                  <Link href={`/projects/${f.report.run.project.id}/runs/${f.report.run.id}`} className="font-semibold text-brand">
                    {f.report.run.project.name} · {f.report.run.name}
                  </Link>{" "}
                  · {formatDateTime(f.createdAt)}
                </span>
                <span className="line-clamp-3 whitespace-pre-line text-sm leading-7">{f.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
