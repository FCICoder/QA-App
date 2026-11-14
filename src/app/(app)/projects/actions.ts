"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { optionalStr, str } from "@/lib/forms";

async function ownProject(projectId: string, workspaceId: string) {
  return db.project.findFirst({ where: { id: projectId, workspaceId }, select: { id: true } });
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) return;

  const project = await db.project.create({
    data: {
      workspaceId: user.workspaceId,
      name,
      clientName: optionalStr(formData, "clientName"),
      suites: { create: { name: "عام", position: 0 } },
    },
    select: { id: true },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function createSuite(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const name = str(formData, "name");
  if (!name || !(await ownProject(projectId, user.workspaceId))) return;

  const position = await db.suite.count({ where: { projectId } });
  await db.suite.create({ data: { projectId, name, position } });
  revalidatePath(`/projects/${projectId}`);
}

export async function createStory(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const key = str(formData, "key").toUpperCase();
  if (!key || !(await ownProject(projectId, user.workspaceId))) return;

  await db.userStory.upsert({
    where: { projectId_key: { projectId, key } },
    update: { title: optionalStr(formData, "title"), url: optionalStr(formData, "url") },
    create: { projectId, key, title: optionalStr(formData, "title"), url: optionalStr(formData, "url") },
  });
  revalidatePath(`/projects/${projectId}`);
}
