import { db } from "../db";
import {
  CASE_RUN_STATUS_LABEL,
  STEP_RESULT_LABEL,
  VERDICT_LABEL,
  formatDate,
  formatDateTime,
} from "../labels";
import { countStatuses } from "../runs";
import { getPdfFontCss } from "./fonts";
import { htmlToPdf } from "./render";
import { renderRunHtml, type PdfRunCase } from "./run-template";
import type { PdfResult } from "./export";

// Builds the results PDF of one run. `where` must already limit the run to what the caller may see:
// the user's workspace for the app, or the run behind a valid client link.
export async function exportRunPdf(where: { id: string; project: { workspaceId: string } } | { report: { token: string } }): Promise<PdfResult> {
  const run = await db.testRun.findFirst({
    where,
    include: {
      project: { include: { workspace: { select: { name: true } } } },
      cases: { orderBy: { position: "asc" }, include: { steps: { orderBy: { position: "asc" } } } },
      report: { include: { signOff: true } },
    },
  });
  if (!run) return null;

  const counts = countStatuses(run.cases.map((c) => c.status));
  const cases: PdfRunCase[] = run.cases.map((c) => ({
    key: c.key,
    title: c.title,
    storyKey: c.storyKey,
    storyTitle: c.storyTitle,
    status: c.status,
    statusLabel: CASE_RUN_STATUS_LABEL[c.status],
    problems: c.steps
      .filter((s) => s.result === "FAILED" || s.result === "BLOCKED")
      .map((s) => ({ position: s.position, action: s.action, resultLabel: STEP_RESULT_LABEL[s.result], actual: s.actual })),
  }));

  const report = run.report && !run.report.revokedAt ? run.report : null;
  const runTitle = `Run #${run.number} · ${run.name}`;
  const html = renderRunHtml({
    workspaceName: run.project.workspace.name,
    projectName: run.project.name,
    clientName: run.project.clientName,
    runTitle,
    environment: run.environment,
    scopeLabel: run.scopeLabel,
    periodLabel: `${formatDate(run.createdAt)}${run.closedAt ? ` إلى ${formatDate(run.closedAt)}` : " (لسه مفتوح)"}`,
    generatedAtLabel: formatDate(new Date()),
    verdictLabel: report ? VERDICT_LABEL[report.verdict] : null,
    verdictTone: report?.verdict === "NOT_READY" ? "warn" : "pass",
    summary: report?.summary ?? null,
    counts,
    cases,
    signOff: report?.signOff
      ? {
          name: report.signOff.name,
          email: report.signOff.email,
          signedAtLabel: formatDateTime(report.signOff.signedAt),
          ipAddress: report.signOff.ipAddress,
        }
      : null,
    reportRef: report ? report.token.slice(-8) : null,
    fontCss: await getPdfFontCss(),
  });

  const pdf = await htmlToPdf(html);
  return { pdf, fileName: `${run.project.name} - Run ${run.number}.pdf` };
}
