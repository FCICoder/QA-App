import type { Metadata } from "next";
import Link from "next/link";
import { LibraryPicker, type PickerGroup } from "@/components/LibraryPicker";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CASE_TYPE_LABEL, PRIORITY_LABEL, type CaseTypeValue, type PriorityValue } from "@/lib/labels";
import { PACKS } from "@/lib/packs";
import { firstParam, type SearchParams } from "@/lib/params";
import { copyToProject, deleteLibraryItem } from "./actions";

export const metadata: Metadata = { title: "المكتبة" };

function meta(priority: PriorityValue, type: CaseTypeValue, steps: number) {
  return `أولوية ${PRIORITY_LABEL[priority]} · ${CASE_TYPE_LABEL[type]} · ${steps} ${steps === 1 ? "خطوة" : "خطوات"}`;
}

function steps(value: unknown): { action: string; expected: string | null }[] {
  if (!Array.isArray(value)) return [];
  return value.map((s) => ({
    action: typeof s?.action === "string" ? s.action : "",
    expected: typeof s?.expected === "string" && s.expected ? s.expected : null,
  }));
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;

  const [projects, items] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }),
    db.libraryItem.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const wanted = firstParam(sp.project);
  const defaultProjectId = projects.find((p) => p.id === wanted)?.id ?? projects[0]?.id ?? "";
  const tab = firstParam(sp.tab) === "mine" || (firstParam(sp.tab) !== "packs" && items.length > 0) ? "mine" : "packs";

  const mineGroups: PickerGroup[] = [];
  for (const item of items) {
    let group = mineGroups.find((g) => g.title === item.category);
    if (!group) {
      group = { id: `cat-${mineGroups.length}`, title: item.category, items: [] };
      mineGroups.push(group);
    }
    const st = steps(item.steps);
    group.items.push({
      value: `lib:${item.id}`,
      title: item.title,
      meta: `${meta(item.priority, item.type, st.length)}${item.usedCount ? ` · اتنسخت ${item.usedCount} مرة` : ""}`,
      preconditions: item.preconditions,
      steps: st,
      deleteId: item.id,
    });
  }

  const packGroups: PickerGroup[] = PACKS.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    items: p.cases.map((c, i) => ({
      value: `pack:${p.id}:${i}`,
      title: c.title,
      meta: meta(c.priority, c.type, c.steps.length),
      preconditions: c.preconditions,
      steps: c.steps,
    })),
  }));

  const tabLink = (value: "mine" | "packs", label: string, count: number) => (
    <Link
      href={`/library?tab=${value}${wanted ? `&project=${encodeURIComponent(wanted)}` : ""}`}
      aria-current={tab === value ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold ${
        tab === value ? "bg-ink text-white" : "border border-line-strong bg-white hover:bg-canvas"
      }`}
    >
      {label} <span className={tab === value ? "text-white/70" : "text-muted"}>{count}</span>
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold">المكتبة</h1>
        <p className="text-muted">حالات بتتكرر مع كل عميل: احفظها مرة، وانسخها لأي مشروع بضغطة.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="navigation" aria-label="أقسام المكتبة">
        {tabLink("mine", "مكتبتي", items.length)}
        {tabLink("packs", "حزم جاهزة", PACKS.reduce((n, p) => n + p.cases.length, 0))}
      </div>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-lg font-semibold">اعمل مشروع الأول</p>
          <p className="text-muted">الحالات بتتنسخ جوه مشروع، فمحتاج مشروع واحد على الأقل.</p>
          <Link href="/projects" className="btn-primary">مشروع جديد</Link>
        </div>
      ) : (
        <LibraryPicker
          key={tab}
          groups={tab === "mine" ? mineGroups : packGroups}
          projects={projects}
          defaultProjectId={defaultProjectId}
          copyAction={copyToProject}
          deleteAction={tab === "mine" ? deleteLibraryItem : undefined}
          emptyText="مكتبتك لسه فاضية. افتح أي Test Case واضغط «حفظ في المكتبة»، أو ابدأ من الحزم الجاهزة."
        />
      )}
    </div>
  );
}
