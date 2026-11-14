"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { oneOf, optionalStr, rawStr, str } from "@/lib/forms";
import {
  STEP_RESULTS,
  VERDICTS,
  caseKey,
  type CaseRunStatusValue,
  type StepResultValue,
} from "@/lib/labels";
import { hashPassword } from "@/lib/password";
import { deriveCaseStatus } from "@/lib/runs";

export type FormState = { error?: string };
export type ResultResponse = { ok: true; caseStatus: CaseRunStatusValue } | { ok: false; error: string };

const CLOSED_ERROR = "الـ Run ده مقفول أو مش موجود. اعمل refresh للصفحة.";

// ---------- Create ----------

export async function createRun(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: user.workspaceId },
    select: { id: true },
  });
  if (!project) return { error: "المشروع ده مش موجود." };

  const suiteId = str(formData, "suiteId"); // "" = whole project, "none" = cases without a suite
  const onlyReady = formData.get("onlyReady") === "on";

  let scopeLabel = "كل حالات المشروع";
  if (suiteId === "none") scopeLabel = "حالات بدون Suite";
  else if (suiteId) {
    const suite = await db.suite.findFirst({ where: { id: suiteId, projectId }, select: { name: true } });
    if (!suite) return { error: "الـ Suite دي مش موجودة." };
    scopeLabel = `Suite: ${suite.name}`;
  }
  if (onlyReady) scopeLabel += " · الجاهزة بس";

  const cases = await db.testCase.findMany({
    where: {
      projectId,
      deletedAt: null,
      status: onlyReady ? "READY" : { not: "DEPRECATED" },
      ...(suiteId === "none" ? { suiteId: null } : suiteId ? { suiteId } : {}),
    },
    orderBy: { number: "asc" },
    include: {
      steps: { orderBy: { position: "asc" } },
      suite: { select: { name: true } },
      story: { select: { key: true, title: true } },
    },
  });
  if (cases.length === 0) {
    return { error: "مفيش حالات في النطاق ده. ضيف حالات، أو غيّر الـ Suite، أو شيل علامة «الجاهزة بس»." };
  }

  const runId = await db.$transaction(
    async (tx) => {
      const counter = await tx.project.update({
        where: { id: projectId },
        data: { runCounter: { increment: 1 } },
        select: { runCounter: true },
      });
      const run = await tx.testRun.create({
        data: {
          projectId,
          number: counter.runCounter,
          name: str(formData, "name") || `Run #${counter.runCounter}`,
          environment: optionalStr(formData, "environment"),
          scopeLabel,
          createdById: user.id,
        },
        select: { id: true },
      });
      // Copy the cases and their steps, so later edits don't change this run.
      const runCases = await tx.testRunCase.createManyAndReturn({
        data: cases.map((c, i) => ({
          runId: run.id,
          testCaseId: c.id,
          position: i + 1,
          key: caseKey(c.number),
          title: c.title,
          preconditions: c.preconditions,
          priority: c.priority,
          type: c.type,
          suiteName: c.suite?.name ?? null,
          storyKey: c.story?.key ?? null,
          storyTitle: c.story?.title ?? null,
        })),
        select: { id: true, position: true },
      });
      const idByPosition = new Map(runCases.map((rc) => [rc.position, rc.id]));
      const steps = cases.flatMap((c, i) =>
        c.steps.map((s) => ({
          runCaseId: idByPosition.get(i + 1) as string,
          position: s.position,
          action: s.action,
          expected: s.expected,
        })),
      );
      if (steps.length > 0) await tx.testRunStep.createMany({ data: steps });
      return run.id;
    },
    { timeout: 30_000 },
  );

  revalidatePath(`/projects/${projectId}/runs`);
  redirect(`/projects/${projectId}/runs/${runId}`);
}

// ---------- Execute (called from the run screen) ----------

async function recomputeCase(runCaseId: string): Promise<CaseRunStatusValue> {
  const steps = await db.testRunStep.findMany({ where: { runCaseId }, select: { result: true } });
  const status = deriveCaseStatus(steps.map((s) => s.result));
  await db.testRunCase.update({ where: { id: runCaseId }, data: { status } });
  return status;
}

export async function setStepResult(runId: string, stepId: string, result: StepResultValue): Promise<ResultResponse> {
  const user = await requireUser();
  const value = oneOf(STEP_RESULTS, result, "UNTESTED");
  const step = await db.testRunStep.findFirst({
    where: {
      id: stepId,
      runCase: { runId, run: { status: "IN_PROGRESS", project: { workspaceId: user.workspaceId } } },
    },
    select: { runCaseId: true },
  });
  if (!step) return { ok: false, error: CLOSED_ERROR };

  await db.testRunStep.update({ where: { id: stepId }, data: { result: value } });
  return { ok: true, caseStatus: await recomputeCase(step.runCaseId) };
}

export async function setStepActual(runId: string, stepId: string, actual: string): Promise<ResultResponse> {
  const user = await requireUser();
  const step = await db.testRunStep.findFirst({
    where: {
      id: stepId,
      runCase: { runId, run: { status: "IN_PROGRESS", project: { workspaceId: user.workspaceId } } },
    },
    select: { runCase: { select: { status: true } } },
  });
  if (!step) return { ok: false, error: CLOSED_ERROR };

  const text = actual.trim().slice(0, 4000);
  await db.testRunStep.update({ where: { id: stepId }, data: { actual: text === "" ? null : text } });
  return { ok: true, caseStatus: step.runCase.status };
}

// For cases written without steps: the result is set on the case itself.
export async function setCaseResult(runId: string, runCaseId: string, result: StepResultValue): Promise<ResultResponse> {
  const user = await requireUser();
  const value = oneOf(STEP_RESULTS, result, "UNTESTED");
  const runCase = await db.testRunCase.findFirst({
    where: { id: runCaseId, runId, run: { status: "IN_PROGRESS", project: { workspaceId: user.workspaceId } } },
    select: { _count: { select: { steps: true } } },
  });
  if (!runCase) return { ok: false, error: CLOSED_ERROR };
  if (runCase._count.steps > 0) return { ok: false, error: "الحالة دي ليها خطوات، سجّل النتيجة على كل خطوة." };

  await db.testRunCase.update({ where: { id: runCaseId }, data: { status: value } });
  return { ok: true, caseStatus: value };
}

// ---------- Close / reopen / delete ----------

async function ownedRun(runId: string, projectId: string, workspaceId: string) {
  return db.testRun.findFirst({
    where: { id: runId, projectId, project: { workspaceId } },
    select: { id: true, status: true, report: { select: { id: true } } },
  });
}

export async function closeRun(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const runId = str(formData, "runId");
  const run = await ownedRun(runId, projectId, user.workspaceId);
  if (run?.status === "IN_PROGRESS") {
    await db.testRun.update({
      where: { id: runId },
      data: { status: "CLOSED", closedAt: new Date(), closedById: user.id },
    });
  }
  revalidatePath(`/projects/${projectId}/runs`);
  redirect(`/projects/${projectId}/runs/${runId}`);
}

export async function reopenRun(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const runId = str(formData, "runId");
  const run = await ownedRun(runId, projectId, user.workspaceId);
  // Once a client link exists, the run is what the client sees: keep it closed.
  if (run && run.status === "CLOSED" && !run.report) {
    await db.testRun.update({
      where: { id: runId },
      data: { status: "IN_PROGRESS", closedAt: null, closedById: null },
    });
  }
  revalidatePath(`/projects/${projectId}/runs`);
  redirect(`/projects/${projectId}/runs/${runId}`);
}

export async function deleteRun(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const runId = str(formData, "runId");
  const run = await ownedRun(runId, projectId, user.workspaceId);
  if (run && !run.report) {
    await db.testRun.delete({ where: { id: runId } });
  }
  revalidatePath(`/projects/${projectId}/runs`);
  redirect(`/projects/${projectId}/runs`);
}

// ---------- Client report link ----------

const EXPIRY_DAYS = [0, 7, 30, 90];

export async function createReport(projectId: string, runId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const run = await ownedRun(runId, projectId, user.workspaceId);
  if (!run) return { error: "الـ Run ده مش موجود." };
  if (run.status !== "CLOSED") return { error: "اقفل الـ Run الأول، عشان التقرير مايتغيرش بعد ما العميل يشوفه." };
  if (run.report) return { error: "فيه رابط للـ Run ده بالفعل." };

  const summary = str(formData, "summary");
  if (!summary) return { error: "اكتب ملخص للعميل: النتيجة في سطرين." };
  if (summary.length > 2000) return { error: "الملخص أطول من 2000 حرف." };

  const password = rawStr(formData, "password");
  if (password && password.length < 4) return { error: "كلمة سر الرابط لازم تكون 4 حروف على الأقل، أو سيبها فاضية." };

  const days = Number(str(formData, "expiresDays"));
  const expiresDays = EXPIRY_DAYS.includes(days) ? days : 30;

  await db.clientReport.create({
    data: {
      runId,
      token: randomBytes(18).toString("base64url"),
      verdict: oneOf(VERDICTS, str(formData, "verdict"), "READY_WITH_NOTES"),
      summary,
      passwordHash: password ? await hashPassword(password) : null,
      expiresAt: expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null,
      createdById: user.id,
    },
  });

  revalidatePath(`/projects/${projectId}/runs/${runId}`);
  revalidatePath("/dashboard");
  return {};
}

// Before the client signs: remove the link so a new one (new verdict/summary) can be made.
export async function deleteReport(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const runId = str(formData, "runId");
  const report = await db.clientReport.findFirst({
    where: { runId, run: { projectId, project: { workspaceId: user.workspaceId } } },
    select: { id: true, signOff: { select: { id: true } } },
  });
  if (report && !report.signOff) {
    await db.clientReport.delete({ where: { id: report.id } });
  }
  revalidatePath(`/projects/${projectId}/runs/${runId}`);
  revalidatePath("/dashboard");
}

// After the client signs: stop the link working, but keep the sign-off record.
export async function revokeReport(formData: FormData) {
  const user = await requireUser();
  const projectId = str(formData, "projectId");
  const runId = str(formData, "runId");
  await db.clientReport.updateMany({
    where: { runId, revokedAt: null, run: { projectId, project: { workspaceId: user.workspaceId } } },
    data: { revokedAt: new Date() },
  });
  revalidatePath(`/projects/${projectId}/runs/${runId}`);
  revalidatePath("/dashboard");
}
