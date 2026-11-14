import type { NextConfig } from "next";

// Files the PDF routes read from disk at runtime. Next.js can't see these reads,
// so they are added to the serverless bundle by hand.
const PDF_FILES = [
  "./node_modules/@sparticuz/chromium/bin/**",
  "./node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-{arabic,latin}-{400,600,700}-normal.woff2",
];

const nextConfig: NextConfig = {
  // Chrome runs as its own process, so these stay outside the server bundle.
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/pdf/**": PDF_FILES,
    "/r/**": PDF_FILES,
  },
};

export default nextConfig;
