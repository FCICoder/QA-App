import { db } from "@/lib/db";
import { pdfResponse } from "@/lib/pdf/export";
import { exportRunPdf } from "@/lib/pdf/run-export";
import { hasReportAccess, reportState } from "@/lib/report";

export const runtime = "nodejs";
export const maxDuration = 60;

// The client's copy of the report, with the sign-off certificate once they approve.
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return new Response("Not found", { status: 404 });

  const report = await db.clientReport.findUnique({
    where: { token },
    select: { id: true, token: true, passwordHash: true, revokedAt: true, expiresAt: true },
  });
  if (!report || reportState(report) !== "ok") return new Response("Not found", { status: 404 });
  if (!(await hasReportAccess(report))) return Response.redirect(new URL(`/r/${token}`, request.url), 303);

  try {
    const result = await exportRunPdf({ report: { token } });
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
