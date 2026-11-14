import { getCurrentUser } from "@/lib/auth";
import { pdfResponse } from "@/lib/pdf/export";
import { exportRunPdf } from "@/lib/pdf/run-export";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { runId } = await context.params;
  try {
    const result = await exportRunPdf({ id: runId, project: { workspaceId: user.workspaceId } });
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
