import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

// Everything the public report page and its PDF need, found by the link's token.
export async function loadReport(token: string) {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  return db.clientReport.findUnique({
    where: { token },
    include: {
      signOff: true,
      run: {
        include: {
          project: { include: { workspace: true } },
          cases: { orderBy: { position: "asc" }, include: { steps: { orderBy: { position: "asc" } } } },
        },
      },
    },
  });
}

export type LoadedReport = NonNullable<Awaited<ReturnType<typeof loadReport>>>;

export function reportState(report: { revokedAt: Date | null; expiresAt: Date | null }): "ok" | "revoked" | "expired" {
  if (report.revokedAt) return "revoked";
  if (report.expiresAt && report.expiresAt < new Date()) return "expired";
  return "ok";
}

// Password-protected links: after the right password, a cookie scoped to the link proves access.
export function accessCookieName(reportId: string) {
  return `tasleem_r_${reportId}`;
}

export function accessCookieValue(report: { token: string; passwordHash: string | null }) {
  return createHash("sha256").update(`${report.token}:${report.passwordHash ?? ""}`).digest("hex");
}

export async function hasReportAccess(report: { id: string; token: string; passwordHash: string | null }) {
  if (!report.passwordHash) return true;
  const store = await cookies();
  return store.get(accessCookieName(report.id))?.value === accessCookieValue(report);
}
