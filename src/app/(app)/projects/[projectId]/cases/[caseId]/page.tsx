import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SubmitButton } from "@/components/SubmitButton";
import { TestCaseForm } from "@/components/TestCaseForm";
import { getCaseOr404, getProjectOr404 } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseKey, formatDateTime } from "@/lib/labels";
import { firstParam, type SearchParams } from "@/lib/params";
import { saveToLibrary } from "@/app/(app)/library/actions";
import { deleteCase, restoreCase, updateCase } from "../actions";

export const metadata: Metadata = { title: "تعديل Test Case" };

export default async function EditCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; caseId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { projectId, caseId } = await params;
  const sp = await searchParams;
  const project = await getProjectOr404(projectId, user.workspaceId);
  const testCase = await getCaseOr404(caseId, project.id, user.workspaceId);

  const [suites, stories] = await Promise.all([
    db.suite.findMany({
      where: { projectId: project.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
    db.userStory.findMany({
      where: { projectId: project.id },
      orderBy: { key: "asc" },
      select: { key: true, title: true },
    }),
  ]);

  const key = caseKey(testCase.number);
  const saved = firstParam(sp.saved) === "1";
  const savedToLibrary = firstParam(sp.library) === "1";
  const deleted = testCase.deletedAt !== null;
  const action = updateCase.bind(null, project.id, testCase.id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <nav aria-label="مسار التنقل" className="text-sm text-muted">
            <Link href="/projects" className="hover:text-ink">المشاريع</Link>
            {" / "}
            <Link href={`/projects/${project.id}`} className="hover:text-ink">{project.name}</Link>
          </nav>
          <h1 className="text-2xl font-bold">
            <span className="text-muted" dir="ltr">{key}</span> · {testCase.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!deleted ? (
            <form action={saveToLibrary}>
              <input type="hidden" name="caseId" value={testCase.id} />
              <SubmitButton className="btn-secondary" pendingText="جاري الحفظ…">حفظ في المكتبة</SubmitButton>
            </form>
          ) : null}
          <a href={`/api/pdf/case/${testCase.id}`} className="btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
            تحميل PDF
          </a>
        </div>
      </div>

      {saved ? (
        <p role="status" className="rounded-[10px] border border-pass/30 bg-pass-soft px-4 py-3 text-sm text-pass-ink">
          اتحفظت. دي النسخة رقم {testCase.version}.
        </p>
      ) : null}

      {savedToLibrary ? (
        <p role="status" className="rounded-[10px] border border-pass/30 bg-pass-soft px-4 py-3 text-sm text-pass-ink">
          اتحفظت نسخة منها في <Link href="/library?tab=mine" className="font-semibold underline">مكتبتك</Link>، وتقدر تنسخها لأي مشروع.
        </p>
      ) : null}

      {deleted ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn-ink">
          <span>الحالة دي في سلة المحذوفات.</span>
          <form action={restoreCase}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="caseId" value={testCase.id} />
            <button type="submit" className="btn-secondary">استرجاع</button>
          </form>
        </div>
      ) : (
        <TestCaseForm
          action={action}
          suites={suites}
          stories={stories}
          submitLabel="حفظ التعديلات"
          cancelHref={`/projects/${project.id}`}
          initial={{
            title: testCase.title,
            preconditions: testCase.preconditions ?? "",
            priority: testCase.priority,
            type: testCase.type,
            status: testCase.status,
            language: testCase.language,
            suiteId: testCase.suiteId,
            storyKey: testCase.story?.key ?? "",
            steps: testCase.steps.map((s) => ({ action: s.action, expected: s.expected ?? "" })),
          }}
        />
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="history-h" className="card flex-[999_1_560px] p-5">
          <h2 id="history-h" className="mb-3 text-base font-bold">سجل النسخ</h2>
          <ol className="flex flex-col gap-3">
            {testCase.versions.map((v) => (
              <li key={v.id} className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold">النسخة {v.version} · {v.createdBy.name}</span>
                <span className="text-muted">{formatDateTime(v.createdAt)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            أنشأها {testCase.createdBy.name} · {formatDateTime(testCase.createdAt)}
          </p>
        </section>

        {!deleted ? (
          <section aria-labelledby="danger-h" className="card flex-[1_1_280px] p-5">
            <h2 id="danger-h" className="mb-2 text-base font-bold">حذف الحالة</h2>
            <p className="mb-3 text-sm text-muted">بتروح سلة المحذوفات وتقدر ترجّعها في أي وقت.</p>
            <form action={deleteCase}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="caseId" value={testCase.id} />
              <ConfirmButton message={`متأكد إنك عايز تحذف ${key}؟`}>نقل لسلة المحذوفات</ConfirmButton>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
