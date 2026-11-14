"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allStr, str } from "@/lib/forms";
import { insertCases, type NewCase } from "@/lib/insert-cases";
import { findPackCase } from "@/lib/packs";

export type LibraryState = { error?: string };

function stepsFromJson(value: unknown): NewCase["steps"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => ({
      action: typeof s?.action === "string" ? s.action : "",
      expected: typeof s?.expected === "string" && s.expected ? s.expected : null,
    }))
    .filter((s) => s.action);
}

// Copies the ticked library items and pack cases into a project.
export async function copyToProject(_prev: LibraryState, formData: FormData): Promise<LibraryState> {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const picked = [...new Set(allStr(formData, "item").filter(Boolean))].slice(0, 200);
  if (!projectId) return { error: "اختار المشروع اللي هتنسخ فيه." };
  if (picked.length === 0) return { error: "علّم على حالة واحدة على الأقل." };

  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: user.workspaceId }, select: { id: true } });
  if (!project) return { error: "المشروع ده مش موجود." };

  const libIds = picked.filter((v) => v.startsWith("lib:")).map((v) => v.slice(4));
  const libItems = libIds.length
    ? await db.libraryItem.findMany({ where: { id: { in: libIds }, workspaceId: user.workspaceId } })
    : [];
  const byId = new Map(libItems.map((i) => [i.id, i]));

  const cases: NewCase[] = [];
  const packTitles = new Set<string>();
  for (const value of picked) {
    if (value.startsWith("lib:")) {
      const item = byId.get(value.slice(4));
      if (item) {
        cases.push({
          title: item.title,
          preconditions: item.preconditions,
          priority: item.priority,
          type: item.type,
          steps: stepsFromJson(item.steps),
        });
      }
    } else if (value.startsWith("pack:")) {
      const [, packId, index] = value.split(":");
      const found = findPackCase(packId ?? "", Number(index));
      if (found) {
        cases.push(found.testCase);
        packTitles.add(found.pack.title);
      }
    }
  }
  if (cases.length === 0) return { error: "الحالات اللي اخترتها مش موجودة." };

  // Suite: what the user typed, or the pack's name when everything came from one pack.
  const typedSuite = str(formData, "suiteName");
  const suiteName = typedSuite || (packTitles.size === 1 && libItems.length === 0 ? [...packTitles][0] : null);

  await insertCases({
    projectId: project.id,
    userId: user.id,
    cases,
    suiteName,
    status: formData.get("ready") === "on" ? "READY" : "DRAFT",
  });
  if (libItems.length) {
    await db.libraryItem.updateMany({ where: { id: { in: libItems.map((i) => i.id) } }, data: { usedCount: { increment: 1 } } });
  }

  revalidatePath(`/projects/${project.id}`);
  revalidatePath("/library");
  redirect(`/projects/${project.id}?copied=${cases.length}`);
}

export async function deleteLibraryItem(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "deleteId");
  await db.libraryItem.deleteMany({ where: { id, workspaceId: user.workspaceId } });
  revalidatePath("/library");
}

// "Save to library" on the case page: a copy of the case that any project can reuse.
export async function saveToLibrary(formData: FormData) {
  const user = await requireUser();
  const caseId = str(formData, "caseId");
  const testCase = await db.testCase.findFirst({
    where: { id: caseId, project: { workspaceId: user.workspaceId } },
    include: { steps: { orderBy: { position: "asc" } }, suite: { select: { name: true } } },
  });
  if (!testCase) redirect("/library");

  const category = str(formData, "category") || testCase.suite?.name || "عام";
  await db.libraryItem.create({
    data: {
      workspaceId: user.workspaceId,
      createdById: user.id,
      category: category.slice(0, 80),
      title: testCase.title,
      preconditions: testCase.preconditions,
      priority: testCase.priority,
      type: testCase.type,
      steps: testCase.steps.map((s) => ({ action: s.action, expected: s.expected })),
    },
  });
  revalidatePath("/library");
  redirect(`/projects/${testCase.projectId}/cases/${testCase.id}?library=1`);
}
