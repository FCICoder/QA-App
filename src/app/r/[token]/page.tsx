import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PasswordForm, SignOffPanel } from "@/components/ReportClientForms";
import { RunBar } from "@/components/RunBar";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CASE_RUN_STATUS_LABEL,
  VERDICT_LABEL,
  formatDate,
  formatDateTime,
  type CaseRunStatusValue,
  type VerdictValue,
} from "@/lib/labels";
import { hasReportAccess, loadReport, reportState } from "@/lib/report";
import { countStatuses } from "@/lib/runs";
import { sendFeedback, signReport, unlockReport } from "./actions";

export const metadata: Metadata = {
  title: "تقرير اختبار",
  robots: { index: false, follow: false },
};

const VERDICT_STYLE: Record<VerdictValue, { box: string; dot: string; mark: string }> = {
  READY: { box: "border-pass/30 bg-pass-soft text-pass-ink", dot: "bg-pass", mark: "✓" },
  READY_WITH_NOTES: { box: "border-pass/30 bg-pass-soft text-pass-ink", dot: "bg-pass", mark: "✓" },
  NOT_READY: { box: "border-warn/30 bg-warn-soft text-warn-ink", dot: "bg-warn", mark: "!" },
};

const STATUS_CHIP: Record<CaseRunStatusValue, string> = {
  UNTESTED: "bg-canvas text-muted",
  IN_PROGRESS: "bg-brand-soft text-brand-dark",
  PASSED: "bg-pass-soft text-pass-ink",
  FAILED: "bg-warn-soft text-warn-ink",
  BLOCKED: "bg-line text-ink-soft",
};

function Shell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-[#eef1ef] px-4 pb-28 pt-8 sm:px-6 sm:pb-12">{children}</main>;
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await loadReport(token);
  if (!report) notFound();

  const { run } = report;
  const workspace = run.project.workspace;
  const state = reportState(report);

  if (state !== "ok") {
    return (
      <Shell>
        <div className="card mx-auto flex max-w-md flex-col gap-3 p-8 text-center">
          <h1 className="text-xl font-bold">الرابط ده مش شغال</h1>
          <p className="text-muted">
            {state === "expired" ? "انتهت صلاحية الرابط." : "الرابط اتوقف."} لو محتاج التقرير، اطلبه من {workspace.name}.
          </p>
        </div>
      </Shell>
    );
  }

  // The QA team can always open their own report; everyone else needs the password if there is one.
  const viewer = await getCurrentUser();
  const isMember = viewer?.workspaceId === workspace.id;

  if (!isMember && !(await hasReportAccess(report))) {
    return (
      <Shell>
        <div className="card mx-auto flex max-w-sm flex-col gap-4 p-7">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted">{workspace.name}</span>
            <h1 className="text-xl font-bold">التقرير ده محمي بكلمة سر</h1>
          </div>
          <PasswordForm action={unlockReport.bind(null, token)} />
        </div>
      </Shell>
    );
  }

  // Count the client's visits, not the QA team's own.
  if (!isMember) {
    await db.clientReport.update({
      where: { id: report.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    });
  }

  const counts = countStatuses(run.cases.map((c) => c.status));
  const verdict = VERDICT_STYLE[report.verdict];
  const problems = run.cases.filter((c) => c.status === "FAILED" || c.status === "BLOCKED");

  const groups = new Map<string, { title: string | null; statuses: CaseRunStatusValue[] }>();
  for (const c of run.cases) {
    const key = c.storyKey ?? "";
    const g = groups.get(key) ?? { title: c.storyTitle, statuses: [] };
    g.statuses.push(c.status);
    groups.set(key, g);
  }
  const storyRows = [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  const runLabel = `${run.name}`;

  return (
    <Shell>
      <div className="mx-auto flex max-w-[960px] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-lg font-bold text-white">
              {workspace.name.trim().charAt(0)}
            </span>
            <span className="text-base font-bold">{workspace.name}</span>
          </div>
          <a href={`/r/${token}/pdf`} className="btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
            تحميل PDF
          </a>
        </div>

        <article className="overflow-hidden rounded-[18px] border border-line bg-white">
          <header className="flex flex-col gap-2 border-b border-line px-6 py-7 sm:px-9">
            <span className="text-sm font-semibold text-brand">تقرير اختبار · {run.name}</span>
            <h1 className="text-[26px] font-bold leading-snug sm:text-[32px]">
              {run.project.name}
              {run.project.clientName ? ` · ${run.project.clientName}` : ""}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
              <span>فترة الاختبار: {formatDate(run.createdAt)}{run.closedAt ? ` إلى ${formatDate(run.closedAt)}` : ""}</span>
              {run.environment ? <span>البيئة: {run.environment}</span> : null}
              <span>{run.scopeLabel}</span>
            </div>
          </header>

          <div className="flex flex-col gap-7 px-6 py-7 sm:px-9">
            <div className={`flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${verdict.box}`}>
              <span aria-hidden="true" className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${verdict.dot}`}>
                {verdict.mark}
              </span>
              <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                <span className="text-lg font-bold">التوصية: {VERDICT_LABEL[report.verdict]}</span>
                <span className="whitespace-pre-line text-[15px] leading-7">{report.summary}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["حالات الاختبار", counts.total, ""],
                ["نجح", counts.passed, "text-pass"],
                ["فشل", counts.failed, "text-warn"],
                ["محجوب", counts.blocked, ""],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-xl border border-line p-4">
                  <div className="text-sm text-muted">{label}</div>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            <section aria-labelledby="stories-h" className="flex flex-col gap-3">
              <h2 id="stories-h" className="text-xl font-bold">النتايج حسب المتطلب</h2>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-canvas text-[13px] text-muted">
                      <th scope="col" className="px-4 py-3 text-start font-semibold">المتطلب</th>
                      <th scope="col" className="px-3 py-3 text-start font-semibold">الحالات</th>
                      <th scope="col" className="w-[220px] px-4 py-3 text-start font-semibold">النتيجة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storyRows.map(([key, g]) => {
                      const sc = countStatuses(g.statuses);
                      return (
                        <tr key={key || "none"} className="border-t border-line/70">
                          <td className="px-4 py-3">
                            {key ? (
                              <>
                                <span dir="ltr" className="text-muted">{key}</span>
                                {g.title ? <span className="font-semibold"> · {g.title}</span> : null}
                              </>
                            ) : (
                              <span className="text-muted">حالات مش مربوطة بمتطلب</span>
                            )}
                          </td>
                          <td className="px-3 py-3">{sc.total}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <RunBar counts={sc} className="h-2 flex-1" />
                              <span className="text-xs text-muted">{sc.passed}/{sc.total}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {problems.length > 0 ? (
              <section aria-labelledby="problems-h" className="flex flex-col gap-3">
                <h2 id="problems-h" className="text-xl font-bold">الحالات اللي فشلت أو اتحجبت</h2>
                {problems.map((c) => (
                  <div key={c.id} className="flex flex-col gap-1.5 rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span dir="ltr" className="text-muted">{c.key}</span>
                      {c.storyKey ? <span dir="ltr" className="text-muted">· {c.storyKey}</span> : null}
                      <span className={`chip ${STATUS_CHIP[c.status]}`}>{CASE_RUN_STATUS_LABEL[c.status]}</span>
                    </div>
                    <div className="text-[15px] font-semibold">{c.title}</div>
                    {c.steps
                      .filter((s) => s.result === "FAILED" || s.result === "BLOCKED")
                      .map((s) => (
                        <div key={s.id} className="text-sm leading-7 text-ink-soft">
                          <span className="font-semibold">الخطوة {s.position}:</span> {s.action}
                          {s.actual ? <div className="whitespace-pre-line">الفعلي: {s.actual}</div> : null}
                        </div>
                      ))}
                  </div>
                ))}
              </section>
            ) : null}

            <details className="rounded-xl border border-line">
              <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold">كل الحالات ({counts.total})</summary>
              <ul className="divide-y divide-line/70 border-t border-line">
                {run.cases.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                    <span dir="ltr" className="w-16 text-muted">{c.key}</span>
                    <span className="min-w-0 flex-1">{c.title}</span>
                    <span className={`chip ${STATUS_CHIP[c.status]}`}>{CASE_RUN_STATUS_LABEL[c.status]}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </article>

        <section id="sign" aria-labelledby="sign-h" className="scroll-mt-6 rounded-[18px] border-2 border-brand bg-white px-6 py-7 sm:px-9">
          <h2 id="sign-h" className="mb-3 text-xl font-bold">موافقة الاستلام</h2>
          {report.signOff ? (
            <div role="status" className="flex items-center gap-3">
              <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pass text-xl text-white">✓</span>
              <span className="text-[15px] leading-7">
                وافق {report.signOff.name} على التقرير {formatDateTime(report.signOff.signedAt)}. محضر الاستلام موجود في ملف الـ PDF.
              </span>
            </div>
          ) : isMember ? (
            <p className="rounded-[10px] bg-canvas px-4 py-3 text-[15px] leading-7 text-ink-soft">
              دي معاينة لفريق {workspace.name}: العميل هو اللي بيوافق من هنا باسمه، ومحدش من مساحة العمل يقدر يوافق بداله.
            </p>
          ) : (
            <SignOffPanel
              signAction={signReport.bind(null, token)}
              feedbackAction={sendFeedback.bind(null, token)}
              workspaceName={workspace.name}
              runLabel={runLabel}
            />
          )}
        </section>

        <p className="text-center text-sm text-muted">
          رابط خاص للقراءة فقط
          {report.expiresAt ? ` · بينتهي ${formatDate(report.expiresAt)}` : ""} ·{" "}
          <Link href="/" className="font-semibold text-brand">صُنع بـ تسليم</Link>
        </p>
      </div>

      {!report.signOff && !isMember ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white p-3 sm:hidden">
          <a href="#sign" className="btn-primary min-h-12 w-full text-base">أوافق على التقرير</a>
        </div>
      ) : null}
    </Shell>
  );
}
