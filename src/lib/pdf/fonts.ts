import { readFile } from "node:fs/promises";
import path from "node:path";

// Embeds IBM Plex Sans Arabic (from @fontsource) into the PDF HTML as base64,
// so the PDF looks the same on any server, with no request to Google Fonts.

const FAMILY = "Tasleem PDF";
const WEIGHTS = [400, 600, 700];

// Same ranges Google Fonts uses to split the Arabic and Latin files.
const RANGES: Record<string, string> = {
  arabic:
    "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC",
  latin:
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
};

let cached: Promise<string> | null = null;

async function load(): Promise<string> {
  const dir = path.join(process.cwd(), "node_modules", "@fontsource", "ibm-plex-sans-arabic", "files");
  const rules: string[] = [];
  for (const weight of WEIGHTS) {
    for (const subset of Object.keys(RANGES)) {
      const file = path.join(dir, `ibm-plex-sans-arabic-${subset}-${weight}-normal.woff2`);
      try {
        const data = await readFile(file);
        rules.push(
          `@font-face{font-family:'${FAMILY}';font-style:normal;font-weight:${weight};font-display:block;` +
            `src:url(data:font/woff2;base64,${data.toString("base64")}) format('woff2');unicode-range:${RANGES[subset]};}`,
        );
      } catch {
        // Font file missing: the PDF falls back to system fonts.
      }
    }
  }
  if (rules.length === 0) {
    console.warn(`[pdf] IBM Plex Sans Arabic not found in ${dir}. Using system fonts.`);
  }
  return rules.join("\n");
}

export function getPdfFontCss(): Promise<string> {
  if (!cached) cached = load();
  return cached;
}
