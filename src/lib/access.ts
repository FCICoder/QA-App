import { notFound } from "next/navigation";
import { db } from "./db";

// Every lookup by id also checks the workspace, so a user can't reach
// another workspace's data by changing an id in the URL.

export async function getProjectOr404(projectId: string, workspaceId: string) {
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!project) notFound();
  return project;
}

export async function getCaseOr404(caseId: string, projectId: string, workspaceId: string) {
  const testCase = await db.testCase.findFirst({
    where: { id: caseId, projectId, project: { workspaceId } },
    include: {
      steps: { orderBy: { position: "asc" } },
      story: true,
      suite: true,
      createdBy: { select: { name: true } },
      versions: {
        orderBy: { version: "desc" },
        take: 10,
        include: { createdBy: { select: { name: true } } },
      },
    },
  });
  if (!testCase) notFound();
  return testCase;
}
