// HTML for the test-run results PDF: what the client report page shows, on paper,
// plus a sign-off certificate page once the client has approved.
// Pure function, like template.ts.

import { baseCss, text } from "./template";

export type PdfRunCase = {
  key: string;
  title: string;
  storyKey: string | null;
  storyTitle: string | null;
  status: "UNTESTED" | "IN_PROGRESS" | "PASSED" | "FAILED" | "BLOCKED";
  statusLabel: string;
  problems: { position: number; action: string; resultLabel: string; actual: string | null }[];
};

export type PdfRunDocument = {
  workspaceName: string;
  projectName: string;
  clientName: string | null;
  runTitle: string; // "Run #3 · Sprint 14"
  environment: string | null;
  scopeLabel: string;
  periodLabel: string;
  generatedAtLabel: string;
  verdictLabel: string | null; // null when no client link was made yet
  verdictTone: "pass" | "warn";
  summary: string | null;
  counts: { total: number; passed: number; failed: number; blocked: number; untested: number; inProgress: number };
  cases: PdfRunCase[];
  signOff: { name: string; email: string; signedAtLabel: string; ipAddress: string | null } | null;
  reportRef: string | null; // last part of the link, shown on the certificate
  fontCss: string;
};

const STATUS_CLASS: Record<PdfRunCase["status"], string> = {
  UNTESTED: "s-none",
  IN_PROGRESS: "s-none",
  PASSED: "s-pass",
  FAILED: "s-fail",
  BLOCKED: "s-block",
};

function bar(c: { total: number; passed: number; failed: number; blocked: number }): string {
  if (c.total === 0) return `<div class="bar"></div>`;
  const w = (n: number) => `${((n / c.total) * 100).toFixed(2)}%`;
  return `<div class="bar"><span class="b-pass" style="width:${w(c.passed)}"></span><span class="b-fail" style="width:${w(
    c.failed,
  )}"></span><span class="b-block" style="width:${w(c.blocked)}"></span></div>`;
}

export function renderRunHtml(doc: PdfRunDocument): string {
  const { counts } = doc;

  // Results grouped by user story; cases without one go last.
  const groups = new Map<string, { title: string | null; total: number; passed: number; failed: number; blocked: number }>();
  for (const c of doc.cases) {
    const k = c.storyKey ?? "";
    const g = groups.get(k) ?? { title: c.storyTitle, total: 0, passed: 0, failed: 0, blocked: 0 };
    g.total++;
    if (c.status === "PASSED") g.passed++;
    if (c.status === "FAILED") g.failed++;
    if (c.status === "BLOCKED") g.blocked++;
    groups.set(k, g);
  }
  const storyRows = [...groups.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(
      ([k, g]) =>
        `<tr><td>${k ? `<span class="ltr">${text(k)}</span>${g.title ? ` · ${text(g.title)}` : ""}` : "حالات مش مربوطة بمتطلب"}</td>
        <td class="num">${g.total}</td><td class="num">${g.passed}</td><td class="num">${g.failed}</td><td class="num">${g.blocked}</td>
        <td class="bar-cell">${bar(g)}</td></tr>`,
    )
    .join("");

  const problems = doc.cases.filter((c) => c.status === "FAILED" || c.status === "BLOCKED");
  const problemBlocks = problems
    .map(
      (c) => `<div class="problem">
        <div class="p-head"><span class="ltr key">${text(c.key)}</span> <span class="st ${STATUS_CLASS[c.status]}">${text(
          c.statusLabel,
        )}</span></div>
        <div class="p-title auto">${text(c.title)}</div>
        ${c.problems
          .map(
            (p) => `<div class="p-step"><b>الخطوة ${p.position} (${text(p.resultLabel)}):</b> <span class="auto">${text(p.action)}</span>
              ${p.actual ? `<div class="actual auto"><b>الفعلي:</b> ${text(p.actual)}</div>` : ""}</div>`,
          )
          .join("")}
      </div>`,
    )
    .join("");

  const allRows = doc.cases
    .map(
      (c) =>
        `<tr><td class="ltr key-cell">${text(c.key)}</td><td class="auto">${text(c.title)}</td><td>${
          c.storyKey ? `<span class="ltr">${text(c.storyKey)}</span>` : "—"
        }</td><td><span class="st ${STATUS_CLASS[c.status]}">${text(c.statusLabel)}</span></td></tr>`,
    )
    .join("");

  const verdict = doc.verdictLabel
    ? `<div class="verdict ${doc.verdictTone}">
        <div class="v-label">التوصية: ${text(doc.verdictLabel)}</div>
        ${doc.summary ? `<div class="auto">${text(doc.summary)}</div>` : ""}
      </div>`
    : "";

  const certificate = doc.signOff
    ? `<section class="cert">
        <div class="workspace">${text(doc.workspaceName)}</div>
        <h1>محضر استلام نتائج الاختبار</h1>
        <p class="cert-lead">يقر الموقّع أدناه بأنه راجع تقرير نتائج الاختبار الموضح بياناته، ووافق عليه.</p>
        <table class="cert-table">
          <tr><th>المشروع</th><td>${text(doc.projectName)}${doc.clientName ? ` · ${text(doc.clientName)}` : ""}</td></tr>
          <tr><th>الـ Test Run</th><td>${text(doc.runTitle)}</td></tr>
          <tr><th>فترة الاختبار</th><td>${text(doc.periodLabel)}</td></tr>
          <tr><th>النتيجة</th><td>${counts.total} حالة: ${counts.passed} نجحت، ${counts.failed} فشلت، ${counts.blocked} محجوبة</td></tr>
          ${doc.verdictLabel ? `<tr><th>التوصية</th><td>${text(doc.verdictLabel)}</td></tr>` : ""}
          <tr><th>اسم الموافق</th><td>${text(doc.signOff.name)}</td></tr>
          <tr><th>البريد الإلكتروني</th><td><span class="ltr">${text(doc.signOff.email)}</span></td></tr>
          <tr><th>تاريخ ووقت الموافقة</th><td>${text(doc.signOff.signedAtLabel)}</td></tr>
          ${doc.signOff.ipAddress ? `<tr><th>عنوان IP</th><td><span class="ltr">${text(doc.signOff.ipAddress)}</span></td></tr>` : ""}
          ${doc.reportRef ? `<tr><th>مرجع التقرير</th><td><span class="ltr">${text(doc.reportRef)}</span></td></tr>` : ""}
        </table>
        <p class="cert-note">اتسجلت الموافقة إلكترونيًا من رابط التقرير الخاص، وده سجل بيها صادر من تسليم.</p>
      </section>`
    : "";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${text(doc.projectName)} - ${text(doc.runTitle)}</title>
<style>
${baseCss(doc.fontCss)}
.verdict { border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; border: 1px solid; break-inside: avoid; }
.verdict.pass { background: #E4F1EA; border-color: #B9DCC8; color: #0E5A3A; }
.verdict.warn { background: #FCEBD9; border-color: #F1CFA9; color: #7A3A0C; }
.v-label { font-size: 13pt; font-weight: 700; margin-bottom: 2px; }
.stat .v.pass { color: #0F6B5C; }
.stat .v.fail { color: #9A4F0F; }
section.block { margin-bottom: 18px; }
.num { text-align: center; width: 52px; }
.bar-cell { width: 150px; vertical-align: middle; }
.bar { display: flex; height: 7px; border-radius: 4px; overflow: hidden; background: #E2E6E4; }
.bar span { display: block; height: 100%; }
.b-pass { background: #0F6B5C; }
.b-fail { background: #D9822B; }
.b-block { background: #7C8A87; }
.key, .key-cell { white-space: nowrap; color: #0F5C63; font-weight: 700; }
.key-cell { color: #3E4846; font-weight: 400; width: 70px; }
.st { display: inline-block; font-size: 8.5pt; border-radius: 5px; padding: 0 6px; font-weight: 600; white-space: nowrap; }
.s-pass { background: #E4F1EA; color: #0E5A3A; }
.s-fail { background: #FCEBD9; color: #7A3A0C; }
.s-block { background: #E2E6E4; color: #3E4846; }
.s-none { background: #F5F6F4; color: #5B6664; }
.problem { border: 1px solid #E2E6E4; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; break-inside: avoid; }
.p-title { font-weight: 700; margin: 2px 0 4px; }
.p-step { font-size: 9.5pt; color: #3E4846; margin-top: 3px; }
.actual { color: #7A3A0C; }
.all { font-size: 9.5pt; }
.cert { break-before: page; }
.cert-lead { font-size: 11pt; margin: 10px 0 14px; }
.cert-table th { width: 32%; background: #F5F6F4; color: #3E4846; font-size: 10pt; }
.cert-table td { font-size: 10.5pt; }
.cert-note { font-size: 9pt; color: #5B6664; margin-top: 14px; }
</style>
</head>
<body>
  <header class="cover">
    <div class="workspace">${text(doc.workspaceName)}</div>
    <h1>تقرير نتائج الاختبار</h1>
    <div class="sub">${text(doc.projectName)}${doc.clientName ? ` · ${text(doc.clientName)}` : ""} · <span class="auto">${text(doc.runTitle)}</span></div>
    <div class="facts">
      <span>فترة الاختبار: <b>${text(doc.periodLabel)}</b></span>
      ${doc.environment ? `<span>البيئة: <b>${text(doc.environment)}</b></span>` : ""}
      <span>النطاق: <b>${text(doc.scopeLabel)}</b></span>
      <span>تاريخ الإصدار: <b>${text(doc.generatedAtLabel)}</b></span>
    </div>
  </header>

  ${verdict}

  <div class="summary">
    <div class="stat"><div class="v">${counts.total}</div><div class="l">حالة اختبار</div></div>
    <div class="stat"><div class="v pass">${counts.passed}</div><div class="l">نجح</div></div>
    <div class="stat"><div class="v fail">${counts.failed}</div><div class="l">فشل</div></div>
    <div class="stat"><div class="v">${counts.blocked}</div><div class="l">محجوب</div></div>
    ${
      counts.untested + counts.inProgress > 0
        ? `<div class="stat"><div class="v">${counts.untested + counts.inProgress}</div><div class="l">لم يُنفّذ</div></div>`
        : ""
    }
  </div>

  <section class="block">
    <h2>النتايج حسب المتطلب</h2>
    <table>
      <thead><tr><th>المتطلب</th><th class="num">الحالات</th><th class="num">نجح</th><th class="num">فشل</th><th class="num">محجوب</th><th></th></tr></thead>
      <tbody>${storyRows}</tbody>
    </table>
  </section>

  ${problems.length ? `<section class="block"><h2>الحالات اللي فشلت أو اتحجبت (${problems.length})</h2>${problemBlocks}</section>` : ""}

  <section class="block">
    <h2>كل الحالات</h2>
    <table class="all">
      <thead><tr><th>الرقم</th><th>العنوان</th><th>ستوري</th><th>النتيجة</th></tr></thead>
      <tbody>${allRows}</tbody>
    </table>
  </section>

  ${certificate}
</body>
</html>`;
}
