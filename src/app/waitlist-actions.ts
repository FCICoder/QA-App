"use server";

import { db } from "@/lib/db";
import { isEmail, str } from "@/lib/forms";

export type WaitlistState = { done?: boolean; error?: string };

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const email = str(formData, "email").toLowerCase().slice(0, 200);
  if (!isEmail(email)) return { error: "الإيميل مكتوب غلط." };
  const source = str(formData, "source").slice(0, 40) || null;
  // Already on the list: same answer, so the form doesn't reveal who signed up.
  await db.waitlistEntry.upsert({ where: { email }, update: {}, create: { email, source } });
  return { done: true };
}
