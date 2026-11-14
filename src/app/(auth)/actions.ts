"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmail, rawStr, str } from "@/lib/forms";
import { hashPassword, verifyPassword } from "@/lib/password";

export type AuthState = { error?: string; email?: string };

const MIN_PASSWORD = 8;

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = rawStr(formData, "password");
  const workspaceName = str(formData, "workspaceName") || name;

  if (!name) return { error: "اكتب اسمك.", email };
  if (!isEmail(email)) return { error: "الإيميل مكتوب غلط.", email };
  if (password.length < MIN_PASSWORD) {
    return { error: `كلمة السر لازم تكون ${MIN_PASSWORD} حروف على الأقل.`, email };
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "الإيميل ده متسجّل قبل كده. جرّب تسجيل الدخول.", email };

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      memberships: {
        create: { role: "OWNER", workspace: { create: { name: workspaceName } } },
      },
    },
    select: { id: true },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = str(formData, "email").toLowerCase();
  const password = rawStr(formData, "password");

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  // Same message whether the email exists or not.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "الإيميل أو كلمة السر غلط.", email };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
