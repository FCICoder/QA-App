import type { CurrentUser } from "../auth";
import { db } from "../db";
import { CASE_TYPE_LABEL, PRIORITY_LABEL, STATUS_LABEL, caseKey, formatDate } from "../labels";
import { getPdfFontCss } from "./fonts";
import { htmlToPdf } from "./render";
import { renderCasesHtml, type PdfCase } from "./template";

type Filter = {
  projectId: string;
  suiteId?: string | null; // a suite id, or "none" for cases without a suite
  storyId?: string | null;
  caseId?: string | null;
};

export type PdfResult = { pdf: Uint8Array; fileName: string } | null;

// Returns null when the project (or case) isn't in the user's workspace.
export async function exportCasesPdf(user: CurrentUser, filter: Filter): Promise<PdfResult> {
  const project = await db.project.findFirst({
    where: { id: filter.projectId, workspaceId: user.workspaceId },
  });
  if (!project) return null;

  const cases = await db.testCase.findMany({
    where: {
      projectId: project.id,
      ...(filter.caseId ? { id: filter.caseId } : { deletedAt: null }),
      ...(filter.suiteId === "none"
        ? { suiteId: null }
        : filter.suiteId
          ? { suiteId: filter.suiteId }
          : {}),
      ...(filter.storyId ? { userStoryId: filter.storyId } : {}),
    },
    orderBy: { number: "asc" },
    include: {
      steps: { orderBy: { position: "asc" } },
      suite: { select: { name: true } },
      story: { select: { key: true, title: true } },
    },
  });
  if (filter.caseId && cases.length === 0) return null;

  let scopeLabel = "كل حالات المشروع";
  if (filter.caseId && cases[0]) scopeLabel = `حالة واحدة: ${caseKey(cases[0].number)}`;
  else if (filter.suiteId === "none") scopeLabel = "حالات بدون Suite";
  else if (filter.suiteId) {
    const suite = await db.suite.findFirst({ where: { id: filter.suiteId, projectId: project.id } });
    scopeLabel = suite ? `Suite: ${suite.name}` : scopeLabel;
  }
  if (filter.storyId) {
    const story = await db.userStory.findFirst({ where: { id: filter.storyId, projectId: project.id } });
    if (story) scopeLabel += ` · ستوري ${story.key}`;
  }

  const pdfCases: PdfCase[] = cases.map((c) => ({
    key: caseKey(c.number),
    title: c.title,
    suite: c.suite?.name ?? null,
    storyKey: c.story?.key ?? null,
    storyTitle: c.story?.title ?? null,
    priority: PRIORITY_LABEL[c.priority],
    priorityHigh: c.priority === "HIGH",
    type: CASE_TYPE_LABEL[c.type],
    status: STATUS_LABEL[c.status],
    preconditions: c.preconditions,
    steps: c.steps.map((s) => ({ action: s.action, expected: s.expected })),
  }));

  const html = renderCasesHtml({
    workspaceName: user.workspaceName,
    projectName: project.name,
    clientName: project.clientName,
    scopeLabel,
    generatedAtLabel: formatDate(new Date()),
    cases: pdfCases,
    fontCss: await getPdfFontCss(),
  });

  const pdf = await htmlToPdf(html);
  const base = filter.caseId && cases[0] ? `${project.name} - ${caseKey(cases[0].number)}` : project.name;
  return { pdf, fileName: `${base}.pdf` };
}

export function pdfResponse(result: { pdf: Uint8Array; fileName: string }): Response {
  // ASCII fallback name for old clients, the real (Arabic) name via filename*.
  const disposition = `attachment; filename="tasleem.pdf"; filename*=UTF-8''${encodeURIComponent(result.fileName)}`;
  return new Response(new Uint8Array(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}
