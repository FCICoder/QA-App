import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import type { CaseTypeValue, PriorityValue } from "./labels";

// Adds a batch of cases to a project in one transaction: numbers them, puts them in a suite
// (found or created by name), links a user story, and records version 1 of each.
// Used by the library ("copy to project") and by AI generation ("save selected").

export type NewCase = {
  title: string;
  preconditions: string | null;
  priority: PriorityValue;
  type: CaseTypeValue;
  steps: { action: string; expected: string | null }[];
};

type Options = {
  projectId: string;
  userId: string;
  cases: NewCase[];
  suiteId?: string | null;
  suiteName?: string | null; // used when suiteId is empty: found by name or created
  storyKey?: string | null;
  storyTitle?: string | null;
  status: "DRAFT" | "READY";
};

const ARABIC = /[؀-ۿ]/;

export async function insertCases(opts: Options): Promise<number> {
  const cases = opts.cases.filter((c) => c.title.trim());
  if (cases.length === 0) return 0;

  await db.$transaction(
    async (tx) => {
      const counter = await tx.project.update({
        where: { id: opts.projectId },
        data: { caseCounter: { increment: cases.length } },
        select: { caseCounter: true },
      });
      const first = counter.caseCounter - cases.length + 1;

      let suiteId: string | null = null;
      if (opts.suiteId) {
        const suite = await tx.suite.findFirst({ where: { id: opts.suiteId, projectId: opts.projectId }, select: { id: true } });
        suiteId = suite?.id ?? null;
      } else if (opts.suiteName?.trim()) {
        const name = opts.suiteName.trim().slice(0, 120);
        const existing = await tx.suite.findFirst({ where: { projectId: opts.projectId, name }, select: { id: true } });
        if (existing) suiteId = existing.id;
        else {
          const last = await tx.suite.aggregate({ where: { projectId: opts.projectId }, _max: { position: true } });
          suiteId = (
            await tx.suite.create({
              data: { projectId: opts.projectId, name, position: (last._max.position ?? 0) + 1 },
              select: { id: true },
            })
          ).id;
        }
      }

      let storyId: string | null = null;
      const storyKey = opts.storyKey?.trim() || null;
      if (storyKey) {
        storyId = (
          await tx.userStory.upsert({
            where: { projectId_key: { projectId: opts.projectId, key: storyKey } },
            update: opts.storyTitle ? { title: opts.storyTitle } : {},
            create: { projectId: opts.projectId, key: storyKey, title: opts.storyTitle ?? null },
            select: { id: true },
          })
        ).id;
      }

      for (const [i, c] of cases.entries()) {
        const language = ARABIC.test(c.title) ? "AR" : "EN";
        const steps = c.steps.filter((s) => s.action.trim());
        const snapshot: Prisma.InputJsonValue = {
          title: c.title,
          preconditions: c.preconditions,
          priority: c.priority,
          type: c.type,
          status: opts.status,
          language,
          suiteId,
          storyKey,
          steps: steps.map((s) => ({ action: s.action, expected: s.expected })),
        };
        await tx.testCase.create({
          data: {
            projectId: opts.projectId,
            number: first + i,
            title: c.title,
            preconditions: c.preconditions,
            priority: c.priority,
            type: c.type,
            status: opts.status,
            language,
            suiteId,
            userStoryId: storyId,
            createdById: opts.userId,
            steps: { create: steps.map((s, n) => ({ position: n + 1, action: s.action, expected: s.expected })) },
            versions: { create: { version: 1, snapshot, createdById: opts.userId } },
          },
          select: { id: true },
        });
      }
    },
    { timeout: 30_000 },
  );
  return cases.length;
}
