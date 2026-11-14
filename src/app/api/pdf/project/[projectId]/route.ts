import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exportCasesPdf, pdfResponse } from "@/lib/pdf/export";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { projectId } = await context.params;
  const search = request.nextUrl.searchParams;

  try {
    const result = await exportCasesPdf(user, {
      projectId,
      suiteId: search.get("suite"),
      storyId: search.get("story"),
    });
    if (!result) return new Response("Not found", { status: 404 });

    return pdfResponse(result);
  } catch (error) {
    console.error("[pdf]", error);
    return new Response("تعذّر إنشاء ملف الـ PDF. التفاصيل في الـ terminal اللي شغال فيه السيرفر.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
