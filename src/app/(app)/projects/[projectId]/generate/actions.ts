"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AiError, aiLimit, aiUsageThisMonth, generateTestCases, recordAiUse, toCases } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allStr, oneOf, str } from "@/lib/forms";
import { insertCases, type NewCase } from "@/lib/insert-cases";

export type GenerateState = {
  error?: string;
  cases?: NewCase[];
  storyKey?: string | null;
  storyTitle?: string | null;
  used?: number;
};

const KINDS = ["positive", "negative", "boundary", "ui", "security"];

export async function generateCases(projectId: string, _prev: GenerateState, formData: FormData): Promise<GenerateState> {
  const user = await requireUser();
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: user.workspaceId }, select: { id: true } });
  if (!project) return { error: "المشروع ده مش موجود." };

  const requirement = str(formData, "requirement");
  if (requirement.length < 20) return { error: "اكتب المتطلب أو اليوزر ستوري بتفصيل أكتر (20 حرف على الأقل)." };
  if (requirement.length > 8000) return { error: "المتطلب أطول من 8000 حرف. قسّمه على أكتر من مرة." };

  const used = await aiUsageThisMonth(user.workspaceId);
  if (used >= aiLimit()) return { error: `خلّصت التوليدات بتاعة الشهر ده (${aiLimit()}). الرصيد بيتجدد أول الشهر.` };

  const storyKey = str(formData, "storyKey").slice(0, 40) || null;
  const storyTitle = str(formData, "storyTitle").slice(0, 200) || null;
  const count = Number(oneOf(["5", "8", "12", "15"], str(formData, "count"), "8"));
  const kinds = allStr(formData, "kinds").filter((k) => KINDS.includes(k));

  try {
    const cases = await generateTestCases({
      requirement,
      storyKey,
      language: oneOf(["AR", "EN"] as const, str(formData, "language"), "AR"),
      count,
      kinds: kinds.length ? kinds : ["positive", "negative"],
    });
    await recordAiUse(user.workspaceId);
    return { cases, storyKey, storyTitle, used: used + 1 };
  } catch (error) {
    if (error instanceof AiError) return { error: error.message };
    console.error("[ai]", error);
    return { error: "حصل خطأ غير متوقع. جرّب تاني." };
  }
}

export type SaveState = { error?: string };

export async function saveGeneratedCases(projectId: string, _prev: SaveState, formData: FormData): Promise<SaveState> {
  const user = await requireUser();
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: user.workspaceId }, select: { id: true } });
  if (!project) return { error: "المشروع ده مش موجود." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(str(formData, "payload") || "{}");
  } catch {
    return { error: "البيانات وصلت ناقصة. جرّب تاني." };
  }
  const cases = toCases(parsed, 40);
  if (cases.length === 0) return { error: "علّم على حالة واحدة على الأقل." };

  const suite = str(formData, "suite"); // "" | "new" | suite id
  await insertCases({
    projectId: project.id,
    userId: user.id,
    cases,
    suiteId: suite && suite !== "new" ? suite : null,
    suiteName: suite === "new" ? str(formData, "newSuite") || null : null,
    storyKey: str(formData, "storyKey").slice(0, 40) || null,
    storyTitle: str(formData, "storyTitle").slice(0, 200) || null,
    status: formData.get("ready") === "on" ? "READY" : "DRAFT",
  });

  revalidatePath(`/projects/${project.id}`);
  redirect(`/projects/${project.id}?copied=${cases.length}`);
}
