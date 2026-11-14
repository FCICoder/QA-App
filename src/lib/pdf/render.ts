import puppeteer, { type Browser } from "puppeteer";

// One Chrome process shared by all PDF requests; each request opens and closes a tab.
// Starting Chrome takes about a second, a new tab takes milliseconds.
// TODO (from the plan): move this to a queued worker before real traffic.
const g = globalThis as unknown as { __tasleemBrowser?: Promise<Browser> };

function getBrowser(): Promise<Browser> {
  const existing = g.__tasleemBrowser;
  if (existing) return existing;

  const launching = puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  });
  g.__tasleemBrowser = launching;
  launching
    .then((browser) => {
      browser.on("disconnected", () => {
        g.__tasleemBrowser = undefined;
      });
    })
    .catch(() => {
      // Launch failed: forget it so the next request tries again.
      g.__tasleemBrowser = undefined;
    });
  return launching;
}

const FOOTER = `<div style="width:100%;font-size:8px;color:#5B6664;font-family:Arial,sans-serif;text-align:center;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>`;

export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // The HTML is built from escaped user text, but block every network request anyway:
    // the page has everything it needs inline (fonts are data: URLs).
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("data:") || url === "about:blank") void request.continue();
      else void request.abort();
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: FOOTER,
    });
  } finally {
    await page.close();
  }
}
