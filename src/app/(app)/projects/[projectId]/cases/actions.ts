"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { parseCaseForm, type CaseFormState, type CaseValues } from "@/lib/case-form";
import { db } from "@/lib/db";
import { str } from "@/lib/forms";

type Links = { suiteId: string | null; storyId: string | null };

// The suite must belong to the same project; the story is created on first use.
async function resolveLinks(
  tx: Prisma.TransactionClient,
  projectId: string,
  values: CaseValues,
): Promise<Links> {
  let suiteId: string | null = null;
  if (values.suiteId) {
    const suite = await tx.suite.findFirst({
      where: { id: values.suiteId, projectId },
      select: { id: true },
    });
    suiteId = suite?.id ?? null;
  }

  let storyId: string | null = null;
  if (values.storyKey) {
    const story = await tx.userStory.upsert({
      where: { projectId_key: { projectId, key: values.storyKey } },
      update: values.storyTitle ? { title: values.storyTitle } : {},
      create: { projectId, key: values.storyKey, title: values.storyTitle },
      select: { id: true },
    });
    storyId = story.id;
  }

  return { suiteId, storyId };
}

function snapshot(values: CaseValues, links: Links): Prisma.InputJsonValue {
  return {
    title: values.title,
    preconditions: values.preconditions,
    priority: values.priority,
    type: values.type,
    status: values.status,
    language: values.language,
    suiteId: links.suiteId,
    storyKey: values.storyKey,
    steps: values.steps.map((s) => ({ action: s.action, expected: s.expected })),
  };
}

function stepRows(values: CaseValues) {
  return values.steps.map((s, i) => ({ position: i + 1, action: s.action, expected: s.expected }));
}

export async function createCase(
  projectId: string,
  _prev: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const user = await requireUser();
  const parsed = parseCaseForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const values = parsed.values;

  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!project) return { error: "المشروع ده مش موجود." };

  const created = await db.$transaction(async (tx) => {
    // Row-level increment: two cases saved at the same moment still get different numbers.
    const counter = await tx.project.update({
      where: { id: projectId },
      data: { caseCounter: { increment: 1 } },
      select: { caseCounter: true },
    });
    const links = await resolveLinks(tx, projectId, values);
    const testCase = await tx.testCase.create({
      data: {
        projectId,
        number: counter.caseCounter,
        title: values.title,
        preconditions: values.preconditions,
        priority: values.priority,
        type: values.type,
        status: values.status,
        language: values.language,
        suiteId: links.suiteId,
        userStoryId: links.storyId,
        createdById: user.id,
        steps: { create: stepRows(values) },
      },
      select: { id: true },
    });
    await tx.testCaseVersion.create({
      data: {
        testCaseId: testCase.id,
        version: 1,
        snapshot: snapshot(values, links),
        createdById: user.id,
      },
    });
    return testCase;
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/cases/${created.id}?saved=1`);
}

export async function updateCase(
  projectId: string,
  caseId: string,
  _prev: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const user = await requireUser();
  const parsed = parseCaseForm(formData);
  if (!parsed.ok) return { error: parsed.error };
  const values = parsed.values;

  const existing = await db.testCase.findFirst({
    where: { id: caseId, projectId, deletedAt: null, project: { workspaceId: user.workspaceId } },
    select: { id: true },
  });
  if (!existing) return { error: "الحالة دي مش موجودة أو اتمسحت." };

  await db.$transaction(async (tx) => {
    const links = await resolveLinks(tx, projectId, values);
    await tx.testStep.deleteMany({ where: { testCaseId: caseId } });
    const updated = await tx.testCase.update({
      where: { id: caseId },
      data: {
        title: values.title,
        preconditions: values.preconditions,
        priority: values.priority,
        type: values.type,
        status: values.status,
        language: values.language,
        suiteId: links.suiteId,
        userStoryId: links.storyId,
        version: { increment: 1 },
        steps: { create: stepRows(values) },
      },
      select: { version: true },
    });
    await tx.testCaseVersion.create({
      data: {
        testCaseId: caseId,
        version: updated.version,
        snapshot: snapshot(values, links),
        createdById: user.id,
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/cases/${caseId}`);
  redirect(`/projects/${projectId}/cases/${caseId}?saved=1`);
}

export async function deleteCase(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const caseId = str(formData, "caseId");

  await db.testCase.updateMany({
    where: { id: caseId, projectId, project: { workspaceId: user.workspaceId } },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function restoreCase(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const caseId = str(formData, "caseId");

  await db.testCase.updateMany({
    where: { id: caseId, projectId, project: { workspaceId: user.workspaceId } },
    data: { deletedAt: null },
  });

  revalidatePath(`/projects/${projectId}`);
}
