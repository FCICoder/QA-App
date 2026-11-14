import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { getProjectOr404 } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CASE_TYPE_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  caseKey,
  type PriorityValue,
  type StatusValue,
} from "@/lib/labels";
import { firstParam, withQuery, type SearchParams } from "@/lib/params";
import { createStory, createSuite } from "../actions";
import { restoreCase } from "./cases/actions";

export const metadata: Metadata = { title: "المشروع" };

const PRIORITY_STYLE: Record<PriorityValue, string> = {
  HIGH: "bg-warn-soft text-warn-ink",
  MEDIUM: "bg-canvas text-ink-soft",
  LOW: "bg-canvas text-muted",
};

const STATUS_STYLE: Record<StatusValue, string> = {
  DRAFT: "bg-canvas text-ink-soft",
  READY: "bg-pass-soft text-pass-ink",
  DEPRECATED: "bg-line text-muted",
};

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const sp = await searchParams;
  const project = await getProjectOr404(projectId, user.workspaceId);

  const suiteFilter = firstParam(sp.suite) ?? null; // a suite id, or "none"
  const storyFilter = firstParam(sp.story) ?? null;
  const q = (firstParam(sp.q) ?? "").trim();
  const trash = firstParam(sp.trash) === "1";

  const [suites, stories, cases, totalActive, noSuiteCount, trashCount] = await Promise.all([
    db.suite.findMany({
      where: { projectId: project.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { cases: { where: { deletedAt: null } } } } },
    }),
    db.userStory.findMany({
      where: { projectId: project.id },
      orderBy: { key: "asc" },
      include: { _count: { select: { cases: { where: { deletedAt: null } } } } },
    }),
    db.testCase.findMany({
      where: {
        projectId: project.id,
        deletedAt: trash ? { not: null } : null,
        ...(suiteFilter === "none" ? { suiteId: null } : suiteFilter ? { suiteId: suiteFilter } : {}),
        ...(storyFilter ? { userStoryId: storyFilter } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      },
      orderBy: { number: "asc" },
      include: {
        suite: { select: { name: true } },
        story: { select: { key: true } },
        _count: { select: { steps: true } },
      },
    }),
    db.testCase.count({ where: { projectId: project.id, deletedAt: null } }),
    db.testCase.count({ where: { projectId: project.id, deletedAt: null, suiteId: null } }),
    db.testCase.count({ where: { projectId: project.id, deletedAt: { not: null } } }),
  ]);

  const base = `/projects/${project.id}`;
  const keep = { suite: suiteFilter, story: storyFilter, q: q || null };
  const pdfHref = withQuery(`/api/pdf/project/${project.id}`, { suite: suiteFilter, story: storyFilter });
  const newCaseHref = withQuery(`${base}/cases/new`, {
    suite: suiteFilter && suiteFilter !== "none" ? suiteFilter : null,
  });
  const uncovered = stories.filter((s) => s._count.cases === 0).length;

  const filterLink = (active: boolean) =>
    `flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-sm ${
      active ? "bg-brand-soft font-semibold text-brand-dark" : "hover:bg-canvas"
    }`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <nav aria-label="مسار التنقل" className="text-sm text-muted">
            <Link href="/projects" className="hover:text-ink">المشاريع</Link>
          </nav>
          <h1 className="text-[26px] font-bold leading-tight">{project.name}</h1>
          <p className="text-muted">{project.clientName ?? "بدون عميل"} · {totalActive} حالة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={pdfHref} className="btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
            تصدير PDF
          </a>
          <Link href={newCaseHref} className="btn-primary">+ Test Case جديد</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <aside className="flex max-w-full flex-[1_1_260px] flex-col gap-4">
          <section aria-labelledby="suites-h" className="card p-3">
            <h2 id="suites-h" className="px-2 pb-2 pt-1 text-sm font-bold text-muted">الـ Suites</h2>
            <div className="flex flex-col gap-0.5">
              <Link href={withQuery(base, { story: storyFilter, q: q || null })} className={filterLink(!suiteFilter && !trash)}>
                <span>كل الحالات</span>
                <span className="text-xs text-muted">{totalActive}</span>
              </Link>
              {suites.map((s) => (
                <Link key={s.id} href={withQuery(base, { ...keep, suite: s.id })} className={filterLink(suiteFilter === s.id && !trash)}>
                  <span>{s.name}</span>
                  <span className="text-xs text-muted">{s._count.cases}</span>
                </Link>
              ))}
              {noSuiteCount > 0 ? (
                <Link href={withQuery(base, { ...keep, suite: "none" })} className={filterLink(suiteFilter === "none" && !trash)}>
                  <span>بدون Suite</span>
                  <span className="text-xs text-muted">{noSuiteCount}</span>
                </Link>
              ) : null}
            </div>
            <form action={createSuite} className="mt-3 flex gap-2 border-t border-line px-1 pt-3">
              <input type="hidden" name="projectId" value={project.id} />
              <label htmlFor="suite-name" className="sr-only">اسم Suite جديدة</label>
              <input id="suite-name" name="name" required placeholder="Suite جديدة" className="input min-w-0 flex-1" />
              <SubmitButton className="btn-secondary">إضافة</SubmitButton>
            </form>
          </section>

          <section aria-labelledby="stories-h" className="card p-3">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <h2 id="stories-h" className="text-sm font-bold text-muted">اليوزر ستوريز</h2>
              {uncovered > 0 ? (
                <span className="chip bg-warn-soft text-warn-ink">{uncovered} بدون حالات</span>
              ) : null}
            </div>
            {stories.length === 0 ? (
              <p className="px-2 text-sm text-muted">اختياري. اربط الحالات بالستوريز عشان تعرف التغطية.</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {stories.map((s) => (
                  <Link
                    key={s.id}
                    href={withQuery(base, { ...keep, story: storyFilter === s.id ? null : s.id })}
                    className={filterLink(storyFilter === s.id)}
                    title={s.title ?? undefined}
                  >
                    <span className="truncate">
                      <span dir="ltr" className="font-semibold">{s.key}</span>
                      {s.title ? <span className="text-muted"> · {s.title}</span> : null}
                    </span>
                    <span className={`text-xs ${s._count.cases === 0 ? "font-semibold text-warn-ink" : "text-muted"}`}>
                      {s._count.cases}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <form action={createStory} className="mt-3 flex flex-col gap-2 border-t border-line px-1 pt-3">
              <input type="hidden" name="projectId" value={project.id} />
              <div className="flex gap-2">
                <label htmlFor="story-key" className="sr-only">رقم الستوري</label>
                <input id="story-key" name="key" required dir="ltr" placeholder="US-12" className="input w-24 shrink-0 text-right" />
                <label htmlFor="story-title" className="sr-only">عنوان الستوري</label>
                <input id="story-title" name="title" placeholder="العنوان (اختياري)" className="input min-w-0 flex-1" />
              </div>
              <SubmitButton className="btn-secondary">إضافة ستوري</SubmitButton>
            </form>
          </section>

          <Link
            href={trash ? base : withQuery(base, { trash: "1" })}
            className={`flex min-h-11 items-center justify-between rounded-[10px] px-3 text-sm ${
              trash ? "bg-ink font-semibold text-white" : "text-muted hover:bg-white"
            }`}
          >
            <span>{trash ? "رجوع للحالات" : "سلة المحذوفات"}</span>
            <span className="text-xs">{trashCount}</span>
          </Link>
        </aside>

        <section aria-label="الحالات" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
          <form method="get" action={base} className="flex flex-wrap gap-2">
            {suiteFilter ? <input type="hidden" name="suite" value={suiteFilter} /> : null}
            {storyFilter ? <input type="hidden" name="story" value={storyFilter} /> : null}
            {trash ? <input type="hidden" name="trash" value="1" /> : null}
            <label htmlFor="q" className="sr-only">بحث في العناوين</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="ابحث في عناوين الحالات" className="input min-w-0 flex-1 bg-white" />
            <button type="submit" className="btn-secondary">بحث</button>
          </form>

          {trash ? (
            <p className="text-sm text-muted">دي الحالات اللي اتحذفت. تقدر ترجّع أي واحدة منهم.</p>
          ) : null}

          {cases.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-lg font-semibold">
                {trash ? "سلة المحذوفات فاضية" : q ? "مفيش نتايج للبحث ده" : "مفيش حالات هنا لسه"}
              </p>
              {!trash && !q ? (
                <Link href={newCaseHref} className="btn-primary">اكتب أول حالة</Link>
              ) : null}
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="text-[13px] text-muted">
                    <th scope="col" className="px-4 py-3 text-start font-semibold">الرقم</th>
                    <th scope="col" className="px-3 py-3 text-start font-semibold">العنوان</th>
                    <th scope="col" className="px-3 py-3 text-start font-semibold">Suite</th>
                    <th scope="col" className="px-3 py-3 text-start font-semibold">ستوري</th>
                    <th scope="col" className="px-3 py-3 text-start font-semibold">الأولوية</th>
                    <th scope="col" className="px-3 py-3 text-start font-semibold">النوع</th>
                    <th scope="col" className="px-3 py-3 text-start font-semibold">الحالة</th>
                    <th scope="col" className="px-4 py-3 text-start font-semibold">{trash ? "" : "خطوات"}</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} className="border-t border-line/70 hover:bg-canvas/60">
                      <td className="px-4 py-3 text-muted" dir="ltr" style={{ textAlign: "right" }}>{caseKey(c.number)}</td>
                      <td className="px-3 py-3">
                        <Link href={`${base}/cases/${c.id}`} className="font-semibold hover:text-brand">
                          {c.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{c.suite?.name ?? "—"}</td>
                      <td className="px-3 py-3 text-ink-soft" dir="ltr" style={{ textAlign: "right" }}>{c.story?.key ?? "—"}</td>
                      <td className="px-3 py-3"><span className={`chip ${PRIORITY_STYLE[c.priority]}`}>{PRIORITY_LABEL[c.priority]}</span></td>
                      <td className="px-3 py-3 text-ink-soft">{CASE_TYPE_LABEL[c.type]}</td>
                      <td className="px-3 py-3"><span className={`chip ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span></td>
                      <td className="px-4 py-3">
                        {trash ? (
                          <form action={restoreCase}>
                            <input type="hidden" name="projectId" value={project.id} />
                            <input type="hidden" name="caseId" value={c.id} />
                            <SubmitButton className="btn-secondary min-h-9">استرجاع</SubmitButton>
                          </form>
                        ) : (
                          <span className="text-ink-soft">{c._count.steps}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
