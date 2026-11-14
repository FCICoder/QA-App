// npm run pdf:sample
// Builds sample.pdf from fixed sample data, with no database.
// Use it to check Arabic PDF output on your machine or server.
import { writeFile } from "node:fs/promises";
import { getPdfFontCss } from "../src/lib/pdf/fonts";
import { htmlToPdf } from "../src/lib/pdf/render";
import { renderCasesHtml } from "../src/lib/pdf/template";
import { sampleCases } from "./sample-data";

const html = renderCasesHtml({
  workspaceName: "مختبر حمزة للجودة",
  projectName: "تطبيق الطلبات · الإصدار 2.4",
  clientName: "متجر نوارة",
  scopeLabel: "كل حالات المشروع",
  generatedAtLabel: new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "long" }).format(new Date()),
  cases: sampleCases,
  fontCss: await getPdfFontCss(),
});

const pdf = await htmlToPdf(html);
await writeFile("sample.pdf", pdf);
await writeFile("sample.html", html);
console.log(`sample.pdf: ${pdf.length} bytes`);
process.exit(0);
