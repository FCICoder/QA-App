import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyButton } from "@/components/CopyButton";
import { ReportCreateForm } from "@/components/ReportCreateForm";
import { RunBar, RunLegend } from "@/components/RunBar";
import { RunExecutor, type CaseView } from "@/components/RunExecutor";
import { getProjectOr404 } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CASE_RUN_STATUS_LABEL,
  CASE_TYPE_LABEL,
  PRIORITY_LABEL,
  VERDICT_LABEL,
  formatDateTime,
  type CaseRunStatusValue,
  type VerdictValue,
} from "@/lib/labels";
import { countStatuses, percent } from "@/lib/runs";
import { siteUrl, whatsappShareUrl } from "@/lib/url";
import { createReport, deleteReport, deleteRun, reopenRun, revokeReport } from "../actions";

export const metadata: Metadata = { title: "Test Run" };

const STATUS_CHIP: Record<CaseRunStatusValue, string> = {
  UNTESTED: "bg-canvas text-muted",
  IN_PROGRESS: "bg-brand-soft text-brand-dark",
  PASSED: "bg-pass-soft text-pass-ink",
  FAILED: "bg-warn-soft text-warn-ink",
  BLOCKED: "bg-line text-ink-soft",
};

export default async function RunPage({ params }: { params: Promise<{ projectId: string; runId: string }> }) {
  const user = await requireUser();
  const { projectId, runId } = await params;
  const project = await getProjectOr404(projectId, user.workspaceId);

  const run = await db.testRun.findFirst({
    where: { id: runId, projectId: project.id },
    include: {
      cases: { orderBy: { position: "asc" }, include: { steps: { orderBy: { position: "asc" } } } },
      createdBy: { select: { name: true } },
      closedBy: { select: { name: true } },
      report: {
        include: { signOff: true, feedback: { orderBy: { createdAt: "desc" } } },
      },
    },
  });
  if (!run) notFound();

  const base = `/projects/${project.id}`;
  const counts = countStatuses(run.cases.map((c) => c.status));
  const hidden = (
    <>
      <input type="hidden" name="projectId" value={project.id} />
      <input type="hidden" name="runId" value={run.id} />
    </>
  );

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <nav aria-label="مسار التنقل" className="text-sm text-muted">
          <Link href="/projects" className="hover:text-ink">المشاريع</Link>
          {" / "}
          <Link href={base} className="hover:text-ink">{project.name}</Link>
          {" / "}
          <Link href={`${base}/runs`} className="hover:text-ink">Test Runs</Link>
        </nav>
        <h1 className="text-[24px] font-bold leading-snug">
          <span className="text-muted" dir="ltr">#{run.number}</span> · {run.name}
        </h1>
        <p className="text-sm text-muted">
          {run.scopeLabel}
          {run.environment ? ` · ${run.environment}` : ""} · بدأه {run.createdBy.name} {formatDateTime(run.createdAt)}
          {run.closedAt ? ` · اتقفل ${formatDateTime(run.closedAt)}` : ""}
        </p>
      </div>
      <a href={`/api/pdf/run/${run.id}`} className="btn-secondary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
        تقرير PDF
      </a>
    </div>
  );

  // ---------- Open run: the execution screen ----------
  if (run.status === "IN_PROGRESS") {
    const cases: CaseView[] = run.cases.map((c) => ({
      id: c.id,
      key: c.key,
      title: c.title,
      preconditions: c.preconditions,
      priorityLabel: PRIORITY_LABEL[c.priority],
      priorityHigh: c.priority === "HIGH",
      typeLabel: CASE_TYPE_LABEL[c.type],
      suiteName: c.suiteName,
      storyKey: c.storyKey,
      storyTitle: c.storyTitle,
      status: c.status,
      steps: c.steps.map((s) => ({
        id: s.id,
        position: s.position,
        action: s.action,
        expected: s.expected,
        result: s.result,
        actual: s.actual ?? "",
      })),
    }));
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        {header}
        <RunExecutor projectId={project.id} runId={run.id} runName={`${run.name}`} environment={run.environment} cases={cases} />
        <form action={deleteRun} className="self-start">
          {hidden}
          <ConfirmButton message="تمسح الـ Run ده ونتايجه كلها؟ الحالات نفسها مش هتتمسح.">مسح الـ Run</ConfirmButton>
        </form>
      </div>
    );
  }

  // ---------- Closed run: results and the client link ----------
  const report = run.report;
  const link = report ? `${await siteUrl()}/r/${report.token}` : "";
  const expired = report?.expiresAt ? report.expiresAt < new Date() : false;
  const suggestedVerdict: VerdictValue =
    counts.failed === 0 && counts.blocked === 0 && counts.done === counts.total ? "READY" : "READY_WITH_NOTES";
  const suggestedSummary =
    `اتنفّذت ${counts.done} من ${counts.total} حالة: ${counts.passed} نجحت، ${counts.failed} فشلت` +
    (counts.blocked ? `، و${counts.blocked} محجوبة` : "") +
    ".";
  const problems = run.cases.filter((c) => c.status === "FAILED" || c.status === "BLOCKED");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {header}

      <section aria-labelledby="summary-h" className="card flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="summary-h" className="text-lg font-bold">النتيجة</h2>
          <RunLegend />
        </div>
        <RunBar counts={counts} className="h-3" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["الحالات", counts.total, ""],
            ["نجح", counts.passed, "text-pass"],
            ["فشل", counts.failed, "text-warn"],
            ["محجوب", counts.blocked, ""],
            ["نسبة النجاح", percent(counts.passed, counts.total), ""],
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-xl border border-line p-3">
              <div className="text-xs text-muted">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="client-h" className="card flex flex-col gap-4 border-2 border-brand/50 p-5">
        <div className="flex flex-col gap-1">
          <h2 id="client-h" className="text-lg font-bold">رابط التقرير للعميل</h2>
          <p className="text-sm text-muted">صفحة قراءة فقط، العميل بيفتحها من غير حساب، ويقدر يوافق عليها أو يطلب تعديل.</p>
        </div>

        {!report ? (
          <ReportCreateForm
            action={createReport.bind(null, project.id, run.id)}
            suggestedVerdict={suggestedVerdict}
            suggestedSummary={suggestedSummary}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {report.revokedAt ? (
              <p className="rounded-[10px] bg-line px-4 py-3 text-sm">الرابط ده اتوقف {formatDateTime(report.revokedAt)}، ومحدش يقدر يفتحه.</p>
            ) : expired ? (
              <p className="rounded-[10px] bg-warn-soft px-4 py-3 text-sm text-warn-ink">الرابط انتهت صلاحيته.</p>
            ) : null}

            {report.signOff ? (
              <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-pass/30 bg-pass-soft px-4 py-3 text-pass-ink">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pass text-white" aria-hidden="true">✓</span>
                <span className="text-sm leading-6">
                  <strong>وافق {report.signOff.name}</strong> (<span dir="ltr">{report.signOff.email}</span>) على التقرير {formatDateTime(report.signOff.signedAt)}
                </span>
              </div>
            ) : (
              <p className="text-sm">
                <span className="chip bg-warn-soft text-warn-ink">بانتظار موافقة العميل</span>{" "}
                <span className="text-muted">
                  · {report.viewCount === 0 ? "لسه ماتفتحش" : `اتفتح ${report.viewCount} مرة، آخرها ${formatDateTime(report.lastViewedAt ?? report.createdAt)}`}
                </span>
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">الرابط</span>
              <code dir="ltr" className="block overflow-x-auto rounded-[10px] border border-line bg-canvas px-3 py-2 text-left text-sm">{link}</code>
              <span className="text-xs text-muted">
                التوصية: {VERDICT_LABEL[report.verdict]}
                {report.passwordHash ? " · محمي بكلمة سر" : ""}
                {report.expiresAt ? ` · بينتهي ${formatDateTime(report.expiresAt)}` : " · من غير انتهاء"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <CopyButton text={link} />
              <a
                className="btn-secondary"
                href={whatsappShareUrl(`تقرير اختبار ${project.name} (${run.name}) جاهز للمراجعة والموافقة:\n${link}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                ابعت على واتساب
              </a>
              <a className="btn-secondary" href={`/r/${report.token}`} target="_blank" rel="noopener noreferrer">
                افتح زي ما العميل هيشوفه
              </a>
              {!report.signOff ? (
                <form action={deleteReport}>
                  {hidden}
                  <ConfirmButton message="تلغي الرابط ده؟ العميل مش هيقدر يفتحه، وتقدر تعمل رابط جديد بتوصية أو ملخص مختلف.">
                    إلغاء الرابط
                  </ConfirmButton>
                </form>
              ) : !report.revokedAt ? (
                <form action={revokeReport}>
                  {hidden}
                  <ConfirmButton message="توقف الرابط؟ موافقة العميل هتفضل متسجلة.">إيقاف الرابط</ConfirmButton>
                </form>
              ) : null}
            </div>

            {report.feedback.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <h3 className="text-sm font-bold">رسايل العميل ({report.feedback.length})</h3>
                {report.feedback.map((f) => (
                  <div key={f.id} className="rounded-[10px] bg-canvas px-4 py-3 text-sm">
                    <div className="mb-1 text-xs text-muted">
                      {f.name} · <span dir="ltr">{f.email}</span> · {formatDateTime(f.createdAt)}
                    </div>
                    <div className="whitespace-pre-line leading-7">{f.message}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {problems.length > 0 ? (
        <section aria-labelledby="problems-h" className="card flex flex-col gap-3 p-5">
          <h2 id="problems-h" className="text-lg font-bold">الحالات اللي فشلت أو اتحجبت ({problems.length})</h2>
          {problems.map((c) => (
            <div key={c.id} className="rounded-xl border border-line p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted" dir="ltr">{c.key}</span>
                <span className={`chip ${STATUS_CHIP[c.status]}`}>{CASE_RUN_STATUS_LABEL[c.status]}</span>
              </div>
              <div className="font-semibold">{c.title}</div>
              {c.steps
                .filter((s) => s.result === "FAILED" || s.result === "BLOCKED")
                .map((s) => (
                  <div key={s.id} className="mt-2 text-sm leading-7 text-ink-soft">
                    <span className="font-semibold">الخطوة {s.position}:</span> {s.action}
                    {s.actual ? (
                      <div className="whitespace-pre-line text-warn-ink">
                        <span className="font-semibold">الفعلي: </span>
                        {s.actual}
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="all-h" className="card overflow-x-auto">
        <h2 id="all-h" className="border-b border-line px-5 py-3 text-lg font-bold">كل الحالات</h2>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="text-[13px] text-muted">
              <th scope="col" className="px-5 py-2.5 text-start font-semibold">الرقم</th>
              <th scope="col" className="px-3 py-2.5 text-start font-semibold">العنوان</th>
              <th scope="col" className="px-3 py-2.5 text-start font-semibold">ستوري</th>
              <th scope="col" className="px-5 py-2.5 text-start font-semibold">النتيجة</th>
            </tr>
          </thead>
          <tbody>
            {run.cases.map((c) => (
              <tr key={c.id} className="border-t border-line/70">
                <td className="px-5 py-2.5 text-muted" dir="ltr" style={{ textAlign: "right" }}>{c.key}</td>
                <td className="px-3 py-2.5 font-semibold">{c.title}</td>
                <td className="px-3 py-2.5 text-ink-soft" dir="ltr" style={{ textAlign: "right" }}>{c.storyKey ?? "—"}</td>
                <td className="px-5 py-2.5"><span className={`chip ${STATUS_CHIP[c.status]}`}>{CASE_RUN_STATUS_LABEL[c.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!report ? (
        <div className="flex flex-wrap gap-2">
          <form action={reopenRun}>
            {hidden}
            <button type="submit" className="btn-secondary">إعادة فتح الـ Run</button>
          </form>
          <form action={deleteRun}>
            {hidden}
            <ConfirmButton message="تمسح الـ Run ده ونتايجه كلها؟ الحالات نفسها مش هتتمسح.">مسح الـ Run</ConfirmButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
