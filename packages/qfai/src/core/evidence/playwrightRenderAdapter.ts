import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { RenderCaptureAdapter, RenderCaptureTarget } from "./types.js";

type BrowserModule = typeof import("playwright");

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

async function loadPlaywright(): Promise<BrowserModule> {
  return import("playwright");
}

export function createPlaywrightRenderAdapter(input: { targetUrl?: string }): RenderCaptureAdapter {
  async function renderTarget(target: RenderCaptureTarget): Promise<{
    screenshotPath: string;
    htmlPath: string;
  }> {
    if (!input.targetUrl) {
      throw new Error("target URL is required for Playwright render capture");
    }

    const playwright = await loadPlaywright();
    const browser = await playwright.chromium.launch();
    try {
      const page = await browser.newPage({
        viewport: {
          width: target.width ?? 1440,
          height: target.height ?? 900,
        },
      });
      const resolvedUrl = new URL(target.route ?? "/", input.targetUrl).toString();
      await page.goto(resolvedUrl, { waitUntil: "networkidle" });
      const slug = sanitizeName(`${target.targetId}.${target.viewport}`);
      const screenshotPath = path.join(process.cwd(), ".", slug);
      return {
        screenshotPath,
        htmlPath: await page.content(),
      };
    } finally {
      await browser.close();
    }
  }

  return {
    async captureScreenshot(target, outputDir) {
      if (!input.targetUrl) {
        throw new Error("target URL is required for Playwright render capture");
      }
      const playwright = await loadPlaywright();
      const browser = await playwright.chromium.launch();
      try {
        await mkdir(outputDir, { recursive: true });
        const page = await browser.newPage({
          viewport: {
            width: target.width ?? 1440,
            height: target.height ?? 900,
          },
        });
        const resolvedUrl = new URL(target.route ?? "/", input.targetUrl).toString();
        await page.goto(resolvedUrl, { waitUntil: "networkidle" });
        const targetName = sanitizeName(`${target.targetId}.${target.viewport}`);
        const screenshotPath = path.join(outputDir, `${targetName}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        return screenshotPath;
      } finally {
        await browser.close();
      }
    },
    async captureHtml(target, outputDir) {
      if (!input.targetUrl) {
        throw new Error("target URL is required for Playwright render capture");
      }
      const playwright = await loadPlaywright();
      const browser = await playwright.chromium.launch();
      try {
        await mkdir(outputDir, { recursive: true });
        const page = await browser.newPage({
          viewport: {
            width: target.width ?? 1440,
            height: target.height ?? 900,
          },
        });
        const resolvedUrl = new URL(target.route ?? "/", input.targetUrl).toString();
        await page.goto(resolvedUrl, { waitUntil: "networkidle" });
        const targetName = sanitizeName(`${target.targetId}.${target.viewport}`);
        const htmlPath = path.join(outputDir, `${targetName}.html`);
        await writeFile(htmlPath, await page.content(), "utf-8");
        return htmlPath;
      } finally {
        await browser.close();
      }
    },
  };
}
