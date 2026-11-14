// Builds the HTML that Chrome prints to PDF.
// Pure function: no database, no Next.js, so it can be tested on its own
// (see scripts/pdf-sample.ts).

export type PdfCase = {
  key: string;
  title: string;
  suite: string | null;
  storyKey: string | null;
  storyTitle: string | null;
  priority: string;
  priorityHigh: boolean;
  type: string;
  status: string;
  preconditions: string | null;
  steps: { action: string; expected: string | null }[];
};

export type PdfDocument = {
  workspaceName: string;
  projectName: string;
  clientName: string | null;
  scopeLabel: string;
  generatedAtLabel: string;
  cases: PdfCase[];
  // @font-face rules with the font embedded (see fonts.ts). Empty string = system fonts.
  fontCss: string;
};

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

// Escape, then keep the user's line breaks.
function text(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

// Story key (US-12) stays left-to-right; the title next to it follows the page.
function story(c: PdfCase, withTitle: boolean): string {
  if (!c.storyKey) return "";
  const title = withTitle && c.storyTitle ? ` · ${text(c.storyTitle)}` : "";
  return `<span class="ltr">${text(c.storyKey)}</span>${title}`;
}

function caseBlock(c: PdfCase): string {
  const meta = [
    c.suite ? `<span class="chip">${text(c.suite)}</span>` : "",
    c.storyKey ? `<span class="chip">${story(c, true)}</span>` : "",
    `<span class="chip${c.priorityHigh ? " chip-high" : ""}">أولوية ${text(c.priority)}</span>`,
    `<span class="chip">${text(c.type)}</span>`,
    `<span class="chip">${text(c.status)}</span>`,
  ].join("");

  const pre = c.preconditions
    ? `<div class="pre"><div class="pre-label">الشروط المسبقة</div><div class="auto">${text(c.preconditions)}</div></div>`
    : "";

  const steps =
    c.steps.length === 0
      ? `<p class="empty">مفيش خطوات مكتوبة للحالة دي.</p>`
      : `<table class="steps">
          <thead><tr><th class="n">#</th><th>الإجراء</th><th>النتيجة المتوقعة</th></tr></thead>
          <tbody>
            ${c.steps
              .map(
                (s, i) =>
                  `<tr><td class="n">${i + 1}</td><td class="auto">${text(s.action)}</td><td class="auto">${
                    s.expected ? text(s.expected) : "—"
                  }</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>`;

  return `<section class="case">
    <div class="case-head">
      <span class="key ltr">${text(c.key)}</span>
      <h3 class="auto">${text(c.title)}</h3>
    </div>
    <div class="meta">${meta}</div>
    ${pre}
    ${steps}
  </section>`;
}

export function renderCasesHtml(doc: PdfDocument): string {
  const totalSteps = doc.cases.reduce((sum, c) => sum + c.steps.length, 0);
  const highCount = doc.cases.filter((c) => c.priorityHigh).length;

  const index = doc.cases
    .map(
      (c) =>
        `<tr><td class="ltr key-cell">${text(c.key)}</td><td class="auto">${text(c.title)}</td><td>${
          c.suite ? text(c.suite) : "—"
        }</td><td>${c.storyKey ? story(c, false) : "—"}</td><td>${text(c.priority)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${text(doc.projectName)}</title>
<style>
${doc.fontCss}
@page { size: A4; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Tasleem PDF', 'IBM Plex Sans Arabic', 'Noto Naskh Arabic', 'Segoe UI', Tahoma, Arial, 'DejaVu Sans', sans-serif;
  color: #16201F;
  font-size: 10.5pt;
  line-height: 1.65;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.ltr { direction: ltr; unicode-bidi: isolate; }
/* Each paragraph takes its direction from its first letter,
   so an English step stays left-to-right inside an Arabic report. */
.auto { unicode-bidi: plaintext; text-align: start; }

.cover { border-bottom: 2px solid #0F5C63; padding-bottom: 14px; margin-bottom: 18px; }
.workspace { font-size: 10pt; color: #5B6664; font-weight: 600; }
h1 { font-size: 22pt; margin: 6px 0 4px; line-height: 1.3; }
.sub { color: #3E4846; font-size: 11pt; }
.facts { display: flex; flex-wrap: wrap; gap: 6px 22px; margin-top: 10px; font-size: 9.5pt; color: #5B6664; }
.facts b { color: #16201F; }

.summary { display: flex; gap: 10px; margin: 0 0 18px; }
.stat { flex: 1; border: 1px solid #E2E6E4; border-radius: 8px; padding: 8px 12px; }
.stat .v { font-size: 18pt; font-weight: 700; line-height: 1.2; }
.stat .l { font-size: 9pt; color: #5B6664; }

h2 { font-size: 13pt; margin: 0 0 8px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: start; font-weight: 600; color: #5B6664; font-size: 9pt; background: #F5F6F4; }
th, td { border: 1px solid #E2E6E4; padding: 6px 8px; vertical-align: top; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
.index { margin-bottom: 8px; font-size: 9.5pt; }
.key-cell { white-space: nowrap; color: #3E4846; }

.cases { break-before: page; }
.case { margin: 0 0 18px; break-inside: auto; }
.case-head { display: flex; align-items: baseline; gap: 10px; break-after: avoid; }
.key { font-weight: 700; color: #0F5C63; white-space: nowrap; font-size: 10pt; }
h3 { font-size: 12.5pt; margin: 0; line-height: 1.45; }
.meta { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0 8px; break-after: avoid; }
.chip { display: inline-block; font-size: 8.5pt; background: #F5F6F4; border: 1px solid #E2E6E4; border-radius: 5px; padding: 0 6px; color: #3E4846; }
.chip-high { background: #FCEBD9; border-color: #F1CFA9; color: #7A3A0C; }
.pre { background: #F5F6F4; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; break-inside: avoid; }
.pre-label { font-size: 8.5pt; font-weight: 600; color: #5B6664; }
.steps td.n, .steps th.n { width: 28px; text-align: center; color: #5B6664; }
.empty { color: #5B6664; font-size: 9.5pt; margin: 0; }
</style>
</head>
<body>
  <header class="cover">
    <div class="workspace">${text(doc.workspaceName)}</div>
    <h1>حالات الاختبار</h1>
    <div class="sub">${text(doc.projectName)}${doc.clientName ? ` · ${text(doc.clientName)}` : ""}</div>
    <div class="facts">
      <span>النطاق: <b>${text(doc.scopeLabel)}</b></span>
      <span>تاريخ الإصدار: <b>${text(doc.generatedAtLabel)}</b></span>
    </div>
  </header>

  <div class="summary">
    <div class="stat"><div class="v">${doc.cases.length}</div><div class="l">حالة اختبار</div></div>
    <div class="stat"><div class="v">${totalSteps}</div><div class="l">خطوة</div></div>
    <div class="stat"><div class="v">${highCount}</div><div class="l">أولوية عالية</div></div>
  </div>

  <h2>الفهرس</h2>
  <table class="index">
    <thead><tr><th>الرقم</th><th>العنوان</th><th>Suite</th><th>ستوري</th><th>الأولوية</th></tr></thead>
    <tbody>${index}</tbody>
  </table>

  <div class="cases">
    ${doc.cases.map(caseBlock).join("\n")}
  </div>
</body>
</html>`;
}
