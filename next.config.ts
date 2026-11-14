import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer starts a real Chrome process, so it must stay outside the server bundle.
  serverExternalPackages: ["puppeteer"],
};

export default nextConfig;
