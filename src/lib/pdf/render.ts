import type { Browser } from "puppeteer-core";

// One Chrome process shared by all PDF requests; each request opens and closes a tab.
// Starting Chrome takes about a second, a new tab takes milliseconds.
const g = globalThis as unknown as { __tasleemBrowser?: Promise<Browser> };

// On Vercel (and other serverless hosts) there is no Chrome on the machine, so a
// compressed Chromium built for serverless (@sparticuz/chromium) is unpacked to /tmp.
// Everywhere else, the Chrome that `puppeteer` downloaded on install is used.
const SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

async function launch(): Promise<Browser> {
  if (SERVERLESS) {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteer.launch({
      args: [...chromium.args, "--font-render-hinting=none"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const { default: puppeteer } = await import("puppeteer");
  return (await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--font-render-hinting=none"],
  })) as unknown as Browser;
}

function getBrowser(): Promise<Browser> {
  const existing = g.__tasleemBrowser;
  if (existing) return existing;

  const launching = launch();
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
