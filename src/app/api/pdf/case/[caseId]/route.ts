import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { exportCasesPdf, pdfResponse } from "@/lib/pdf/export";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { caseId } = await context.params;
  const testCase = await db.testCase.findFirst({
    where: { id: caseId, project: { workspaceId: user.workspaceId } },
    select: { projectId: true },
  });
  if (!testCase) return new Response("Not found", { status: 404 });

  try {
    const result = await exportCasesPdf(user, { projectId: testCase.projectId, caseId });
    if (!result) return new Response("Not found", { status: 404 });

    return pdfResponse(result);
  } catch (error) {
    console.error("[pdf]", error);
    return new Response("تعذّر إنشاء ملف الـ PDF. جرّب تاني بعد شوية.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
