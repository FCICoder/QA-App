import type { CaseRunStatusValue, StepResultValue } from "./labels";

// A case's status in a run comes from its steps:
// any failed step fails the case, then blocked, then all passed = passed.
export function deriveCaseStatus(results: StepResultValue[]): CaseRunStatusValue {
  if (results.length === 0) return "UNTESTED";
  if (results.includes("FAILED")) return "FAILED";
  if (results.includes("BLOCKED")) return "BLOCKED";
  if (results.every((r) => r === "PASSED")) return "PASSED";
  if (results.some((r) => r !== "UNTESTED")) return "IN_PROGRESS";
  return "UNTESTED";
}

export type RunCounts = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  inProgress: number;
  untested: number;
  done: number; // passed + failed + blocked
};

export function countStatuses(statuses: CaseRunStatusValue[]): RunCounts {
  const c: RunCounts = { total: statuses.length, passed: 0, failed: 0, blocked: 0, inProgress: 0, untested: 0, done: 0 };
  for (const s of statuses) {
    if (s === "PASSED") c.passed += 1;
    else if (s === "FAILED") c.failed += 1;
    else if (s === "BLOCKED") c.blocked += 1;
    else if (s === "IN_PROGRESS") c.inProgress += 1;
    else c.untested += 1;
  }
  c.done = c.passed + c.failed + c.blocked;
  return c;
}

export function percent(part: number, total: number): string {
  return total === 0 ? "0%" : `${((part / total) * 100).toFixed(1)}%`;
}
