"use server";

import { revalidatePath } from "next/cache";
import { createSession, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rawStr, str } from "@/lib/forms";
import { hashPassword, verifyPassword } from "@/lib/password";

export type SettingsState = { error?: string; ok?: string };

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const name = str(formData, "name").slice(0, 120);
  if (!name) return { error: "اكتب اسمك." };
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: "اتحفظ اسمك." };
}

export async function updateWorkspace(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (user.role === "MEMBER") return { error: "صاحب مساحة العمل بس اللي يقدر يغيّر اسمها." };
  const name = str(formData, "workspaceName").slice(0, 120);
  if (!name) return { error: "اكتب اسم مساحة العمل." };
  await db.workspace.update({ where: { id: user.workspaceId }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: "اتحفظ الاسم. هيظهر في التقارير وملفات الـ PDF الجاية." };
}

export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const current = rawStr(formData, "currentPassword");
  const next = rawStr(formData, "newPassword");
  if (next.length < 8) return { error: "كلمة السر الجديدة لازم تكون 8 حروف على الأقل." };
  if (next !== rawStr(formData, "confirmPassword")) return { error: "تأكيد كلمة السر مش زي الجديدة." };

  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) return { error: "كلمة السر الحالية غلط." };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // Sign out every other device, keep this one signed in.
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);
  return { ok: "اتغيرت كلمة السر، واتعمل تسجيل خروج من أي جهاز تاني." };
}
