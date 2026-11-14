import puppeteer from "puppeteer";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const results = [];
const ok = (name, cond, extra = "") => results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " :: " + extra : ""}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

function setup(p) {
  p.setDefaultTimeout(30000);
  p.on("dialog", (d) => d.accept());
  p.on("pageerror", (e) => results.push(`PAGEERROR ${p.url()} :: ${String(e).slice(0, 200)}`));
  return p;
}
const body = (p) => p.evaluate(() => document.body.innerText);
const waitText = (p, s) => p.waitForFunction((t) => document.body.innerText.includes(t), {}, s);
const waitPath = (p, re) => p.waitForFunction((r) => new RegExp(r).test(location.pathname + location.search), {}, re.source);
async function clickText(p, selector, txt, root) {
  const handles = await (root ?? p).$$(selector);
  for (const h of handles) {
    const t = await h.evaluate((e) => e.textContent.trim());
    const visible = await h.evaluate((e) => !!(e.offsetWidth || e.offsetHeight));
    if (t.includes(txt) && visible) { await h.click(); return; }
  }
  throw new Error(`no ${selector} containing ${txt}`);
}
async function fetchInfo(p, url) {
  return p.evaluate(async (u) => {
    const r = await fetch(u, { redirect: "follow" });
    const buf = new Uint8Array(await r.arrayBuffer());
    return { status: r.status, type: r.headers.get("content-type"), size: buf.length, head: String.fromCharCode(...buf.slice(0, 5)), disp: r.headers.get("content-disposition") };
  }, url);
}
async function step(name, fn) {
  try { await fn(); } catch (e) { ok(name, false, String(e).slice(0, 300)); }
}

const page = setup(await browser.newPage());
let projectId, runId, link, token;

await step("landing + waitlist", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  ok("landing renders", (await body(page)).includes("موقّع من العميل"));
  await page.type("#wl-landing", "lead@example.com");
  await clickText(page, "#join button[type=submit]", "احجز مكانك");
  await waitText(page, "اتسجلت");
  ok("waitlist join", true);
});

await step("pricing toggle", async () => {
  await page.goto(BASE + "/pricing", { waitUntil: "networkidle0" });
  ok("pricing yearly shows $10", (await body(page)).includes("$10"));
  await clickText(page, "button", "شهري");
  await waitText(page, "$12");
  ok("pricing monthly shows $12", true);
});

await step("signup", async () => {
  await page.goto(BASE + "/signup", { waitUntil: "networkidle0" });
  await page.type("#name", "سارة أحمد");
  await page.type("#workspaceName", "استوديو حلا");
  await page.type("#email", "sara@example.com");
  await page.type("#password", "Passw0rd!x");
  await clickText(page, "button[type=submit]", "");
  await waitPath(page, /^\/dashboard/);
  ok("signup lands on dashboard with onboarding", (await body(page)).includes("ابدأ من هنا"));
});

await step("create project", async () => {
  await page.goto(BASE + "/projects", { waitUntil: "networkidle0" });
  await page.type("#name", "بوابة الحجوزات");
  await page.type("#clientName", "شركة حلا");
  await clickText(page, "button[type=submit]", "إنشاء المشروع");
  await waitPath(page, /^\/projects\/[a-z0-9]+$/);
  projectId = page.url().split("/projects/")[1];
  ok("project created", Boolean(projectId));
});

await step("library packs copy", async () => {
  await page.goto(`${BASE}/library?tab=packs&project=${projectId}`, { waitUntil: "networkidle0" });
  const section = await page.$('section[aria-labelledby="g-login"]');
  await clickText(page, "button", "اختار الكل", section);
  await clickText(page, "button[type=submit]", "انسخ");
  await waitPath(page, /copied=5/);
  ok("pack copied (5 cases)", (await body(page)).includes("اتضافت 5"));
});

await step("AI generate", async () => {
  await page.goto(`${BASE}/projects/${projectId}/generate`, { waitUntil: "networkidle0" });
  await page.type("#requirement", "بصفتي عميل عايز أسترجع كلمة السر بالإيميل. اللينك صالح ساعة ويتستخدم مرة واحدة.");
  await page.type("#storyKey", "US-7");
  await page.type("#storyTitle", "استرجاع كلمة السر");
  await clickText(page, "button[type=submit]", "ولّد الحالات");
  await waitText(page, "احفظ 3");
  const n = await page.$$eval("li.card", (els) => els.length);
  ok("AI shows 3 proposals", n === 3, `got ${n}`);
  await clickText(page, "button[type=submit]", "احفظ 3");
  await waitPath(page, /copied=3/);
  ok("AI cases saved", (await body(page)).includes("اتضافت 3"));
  ok("project has 8 cases + story suite", (await body(page)).includes("8 حالة") && (await body(page)).includes("US-7"));
});

await step("save to library", async () => {
  const href = await page.$$eval('a[href*="/cases/"]', (as) => as.map((a) => a.getAttribute("href")).find((h) => !h.endsWith("/new")));
  await page.goto(BASE + href, { waitUntil: "networkidle0" });
  await clickText(page, "button[type=submit]", "حفظ في المكتبة");
  await waitText(page, "اتحفظت نسخة");
  await page.goto(`${BASE}/library?tab=mine`, { waitUntil: "networkidle0" });
  const t = await body(page);
  ok("library has saved case", t.includes("الدخول بإيميل وكلمة سر صحيحين"));
});

await step("create run", async () => {
  await page.goto(`${BASE}/projects/${projectId}/runs`, { waitUntil: "networkidle0" });
  await page.type("#run-name", "Sprint 14");
  await page.type("#run-env", "Staging");
  await page.click("form:has(#run-name) button[type=submit]");
  await waitPath(page, /\/runs\/[a-z0-9]+$/);
  runId = page.url().split("/runs/")[1];
  ok("run created", Boolean(runId));
});

let runCases = 0;
await step("execute run", async () => {
  runCases = (await page.$$('nav[aria-label="حالات الـ Run"] li button')).length;
  ok("run has 8 cases", runCases === 8, String(runCases));
  for (let i = 0; i < runCases; i++) {
    const nav = await page.$$('nav[aria-label="حالات الـ Run"] li button');
    await nav[i].click();
    await sleep(300);
    await page.waitForSelector('[role=group][aria-label^="نتيجة"]');
    const groups = await page.$$('[role=group][aria-label^="نتيجة الخطوة"]');
    for (let g = 0; g < groups.length; g++) {
      await clickText(page, "button", i === 1 && g === 0 ? "فشل" : "نجح", groups[g]);
      await sleep(350);
    }
    if (i === 1) {
      await page.waitForSelector('textarea[placeholder="إيه اللي حصل فعلاً؟"]');
      await page.type('textarea[placeholder="إيه اللي حصل فعلاً؟"]', "الصفحة رجعت خطأ 500");
      await page.click("h1");
      await sleep(1200);
    }
  }
  await sleep(1500);
  await page.reload({ waitUntil: "networkidle0" });
  const passed = await page.$eval("strong.text-pass", (e) => e.textContent);
  const failed = await page.$eval("strong.text-warn", (e) => e.textContent);
  ok("results saved (all passed but 1 failed)", passed === String(runCases - 1) && failed === "1", `passed=${passed} failed=${failed}`);
});

await step("close run + report link", async () => {
  await clickText(page, "button[type=submit]", "قفل الـ Run");
  await waitText(page, "رابط التقرير للعميل");
  const t = await body(page);
  ok("closed run shows failure + actual", t.includes("الصفحة رجعت خطأ 500") && t.includes("نسبة النجاح"));
  await page.type("#report-password", "pass1234");
  await page.click("form:has(#summary) button[type=submit]");
  await waitText(page, "بانتظار موافقة العميل");
  link = await page.$eval("code", (e) => e.textContent.trim());
  token = link.split("/r/")[1];
  ok("report link created", /^http:\/\/localhost:3000\/r\/[A-Za-z0-9_-]{20,}$/.test(link), link);
  const pdf = await fetchInfo(page, `/api/pdf/run/${runId}`);
  ok("owner run PDF", pdf.status === 200 && pdf.head === "%PDF-" && pdf.size > 20000, JSON.stringify(pdf));
  fs.writeFileSync("/tmp/run-id.txt", runId);
  const cookie = (await page.cookies()).find((c) => c.name === "tasleem_session");
  fs.writeFileSync("/tmp/owner-cookie.txt", cookie.value);
});

await step("owner preview of protected link", async () => {
  const p2 = setup(await browser.newPage());
  await p2.goto(link, { waitUntil: "networkidle0" });
  const t = await body(p2);
  ok("owner sees report without password + preview note", t.includes("التوصية") && t.includes("دي معاينة"));
  await p2.close();
});

await step("client flow", async () => {
  const ctx = await browser.createBrowserContext();
  const c = setup(await ctx.newPage());
  await c.setViewport({ width: 390, height: 844 });
  await c.goto(link, { waitUntil: "networkidle0" });
  ok("password gate", (await body(c)).includes("محمي بكلمة سر"));
  const robots = await c.$eval('meta[name="robots"]', (m) => m.content).catch(() => "");
  ok("noindex", robots.includes("noindex"), robots);
  await c.type("#pw", "wrong");
  await clickText(c, "button[type=submit]", "افتح التقرير");
  await waitText(c, "كلمة السر غلط");
  await c.$eval("#pw", (e) => (e.value = ""));
  await c.type("#pw", "pass1234");
  await clickText(c, "button[type=submit]", "افتح التقرير");
  await waitText(c, "التوصية");
  const t = await body(c);
  ok("client sees verdict + failure", t.includes("جاهز للإطلاق مع ملاحظات") && t.includes("الصفحة رجعت خطأ 500") && t.includes("US-7"));
  await clickText(c, "button", "طلب تعديل أو استفسار");
  await c.type("#fb-name", "خالد مصطفى");
  await c.type("#fb-email", "khaled@client.com");
  await c.type("#fb-msg", "ممكن نعيد اختبار الدفع بعد التصليح؟");
  await clickText(c, "button[type=submit]", "إرسال");
  await waitText(c, "اتبعتت رسالتك");
  await clickText(c, "button", "رجوع للموافقة");
  await c.type("#so-name", "خالد مصطفى");
  await c.type("#so-email", "Khaled@Client.com");
  await c.click('input[name="agree"]');
  await clickText(c, "button[type=submit]", "أوافق على التقرير");
  await waitText(c, "وافق خالد مصطفى");
  ok("client signed off", true);
  const pdf = await fetchInfo(c, `/r/${token}/pdf`);
  ok("client PDF with certificate", pdf.status === 200 && pdf.head === "%PDF-", JSON.stringify(pdf));
  const buf = await c.evaluate(async (u) => Array.from(new Uint8Array(await (await fetch(u)).arrayBuffer())), `/r/${token}/pdf`);
  fs.writeFileSync("/tmp/client.pdf", Buffer.from(buf));
  await ctx.close();

  const ctx2 = await browser.createBrowserContext();
  const s = setup(await ctx2.newPage());
  await s.goto(BASE + "/", { waitUntil: "networkidle0" });
  const noCookie = await fetchInfo(s, `/r/${token}/pdf`);
  ok("PDF needs password cookie", noCookie.type?.includes("text/html"), JSON.stringify(noCookie));
  await ctx2.close();
});

await step("owner sees sign-off", async () => {
  await page.goto(`${BASE}/projects/${projectId}/runs/${runId}`, { waitUntil: "networkidle0" });
  const t = await body(page);
  ok("run page shows sign-off + feedback", t.includes("وافق خالد مصطفى") && t.includes("khaled@client.com") && t.includes("ممكن نعيد اختبار الدفع"));
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" });
  const d = await body(page);
  ok("dashboard shows sign-off + message", d.includes("وافق خالد مصطفى") && d.includes("آخر رسايل العملاء"));
});

await step("settings", async () => {
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle0" });
  await page.$eval("#workspaceName", (e) => (e.value = ""));
  await page.type("#workspaceName", "استوديو حلا للاختبار");
  await clickText(page, "form:has(#workspaceName) button[type=submit]", "حفظ");
  await waitText(page, "اتحفظ الاسم");
  await page.type("#currentPassword", "wrong-one");
  await page.type("#newPassword", "NewPassw0rd!");
  await page.type("#confirmPassword", "NewPassw0rd!");
  await clickText(page, "button[type=submit]", "تغيير كلمة السر");
  await waitText(page, "كلمة السر الحالية غلط");
  ok("settings save + wrong password rejected", (await body(page)).includes("استوديو حلا للاختبار"));
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  ok("signed-in root goes to dashboard", new URL(page.url()).pathname === "/dashboard");
});

await step("workspace isolation", async () => {
  const ctx = await browser.createBrowserContext();
  const b = setup(await ctx.newPage());
  await b.goto(BASE + "/signup", { waitUntil: "networkidle0" });
  await b.type("#name", "Other User");
  await b.type("#email", "other@example.com");
  await b.type("#password", "Passw0rd!y");
  await clickText(b, "button[type=submit]", "");
  await waitPath(b, /^\/dashboard/);
  const r = await b.goto(`${BASE}/projects/${projectId}/runs/${runId}`, { waitUntil: "networkidle0" });
  ok("other workspace gets 404 on run", r.status() === 404, String(r.status()));
  const pdf = await fetchInfo(b, `/api/pdf/run/${runId}`);
  ok("other workspace gets 404 on run PDF", pdf.status === 404, String(pdf.status));
  await b.goto(`${BASE}/library?tab=mine`, { waitUntil: "networkidle0" });
  ok("other workspace can't see A's library", !(await body(b)).includes("الدخول بإيميل وكلمة سر صحيحين"));
  await ctx.close();
});

const reqs = fs.existsSync("/tmp/ai-req.jsonl") ? fs.readFileSync("/tmp/ai-req.jsonl", "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
const r0 = reqs[0];
ok("AI request shape", r0 && r0.url === "/v1/messages" && r0.headers["x-api-key"] === "test-key" && r0.headers["anthropic-version"] === "2023-06-01" && r0.body.tool_choice?.name === "save_test_cases" && r0.body.model === "claude-haiku-5-5", r0 ? JSON.stringify({ u: r0.url, m: r0.body.model, tc: r0.body.tool_choice }) : "no request");

await browser.close();
fs.writeFileSync("/tmp/e2e-results.txt", results.join("\n") + "\n");
console.log(results.join("\n"));
