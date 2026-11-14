"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isEmail, rawStr, str } from "@/lib/forms";
import { verifyPassword } from "@/lib/password";
import { accessCookieName, accessCookieValue, hasReportAccess, loadReport, reportState } from "@/lib/report";

export type PublicFormState = { error?: string; done?: boolean };

async function openReport(token: string) {
  const report = await loadReport(token);
  if (!report || reportState(report) !== "ok") return null;
  return report;
}

export async function unlockReport(token: string, _prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  const report = await openReport(token);
  if (!report) return { error: "الرابط ده مش شغال." };
  if (!report.passwordHash) redirect(`/r/${token}`);

  if (!(await verifyPassword(rawStr(formData, "password"), report.passwordHash))) {
    return { error: "كلمة السر غلط." };
  }
  const store = await cookies();
  store.set(accessCookieName(report.id), accessCookieValue(report), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/r/${token}`,
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/r/${token}`);
}

async function clientInfo() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  return { ipAddress: ip, userAgent: (h.get("user-agent") ?? "").slice(0, 300) || null };
}

export async function signReport(token: string, _prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  const report = await openReport(token);
  if (!report || !(await hasReportAccess(report))) return { error: "الرابط ده مش شغال." };
  if (report.signOff) return { done: true };

  const name = str(formData, "name").slice(0, 120);
  const email = str(formData, "email").toLowerCase().slice(0, 200);
  if (!name) return { error: "اكتب اسمك." };
  if (!isEmail(email)) return { error: "الإيميل مكتوب غلط." };
  if (formData.get("agree") !== "on") return { error: "علّم على إنك راجعت التقرير." };

  try {
    await db.signOff.create({ data: { reportId: report.id, name, email, ...(await clientInfo()) } });
  } catch {
    // Two clicks at once: the unique reportId keeps a single sign-off.
  }
  revalidatePath(`/r/${token}`);
  return { done: true };
}

export async function sendFeedback(token: string, _prev: PublicFormState, formData: FormData): Promise<PublicFormState> {
  const report = await openReport(token);
  if (!report || !(await hasReportAccess(report))) return { error: "الرابط ده مش شغال." };

  const name = str(formData, "name").slice(0, 120);
  const email = str(formData, "email").toLowerCase().slice(0, 200);
  const message = str(formData, "message");
  if (!name) return { error: "اكتب اسمك." };
  if (!isEmail(email)) return { error: "الإيميل مكتوب غلط." };
  if (!message) return { error: "اكتب رسالتك." };
  if (message.length > 3000) return { error: "الرسالة أطول من 3000 حرف." };

  const recent = await db.reportFeedback.count({
    where: { reportId: report.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= 20) return { error: "اتبعت رسايل كتير في الساعة دي. جرّب بعد شوية." };

  await db.reportFeedback.create({ data: { reportId: report.id, name, email, message } });
  return { done: true };
}
