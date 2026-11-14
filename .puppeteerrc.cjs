// On Vercel the PDF routes use @sparticuz/chromium, so skip downloading
// the full Chrome that `puppeteer` normally fetches on install.
module.exports = {
  skipDownload: Boolean(process.env.VERCEL),
};
