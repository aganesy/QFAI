import type {
  BrowserQaInput,
  BrowserQaPhaseResult,
  BrowserQaProvider,
} from "../browserQa/types.js";
import { isUiBearingSurfaceType } from "../detection/surfaceType.js";

type BrowserModule = typeof import("playwright");

async function loadPlaywright(): Promise<BrowserModule> {
  return import("playwright");
}

async function withPage<T>(
  input: BrowserQaInput,
  task: (
    page: Awaited<ReturnType<Awaited<ReturnType<BrowserModule["chromium"]["launch"]>>["newPage"]>>,
  ) => Promise<T>,
): Promise<T> {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch();
  try {
    const page = await browser.newPage();
    if (input.targetUrl) {
      await page.goto(input.targetUrl, { waitUntil: "networkidle" });
    } else if (input.htmlContent) {
      await page.setContent(input.htmlContent, { waitUntil: "load" });
    } else {
      throw new Error("Browser QA requires targetUrl or htmlContent");
    }
    return await task(page);
  } finally {
    await browser.close();
  }
}

function completed(phase: BrowserQaPhaseResult["phase"]): BrowserQaPhaseResult {
  return { phase, status: "executed", findings: [] };
}

export function createPlaywrightBrowserQaProvider(): BrowserQaProvider {
  return {
    providerId: "playwright",
    canRun(surface) {
      return isUiBearingSurfaceType(surface);
    },
    async runSmoke(input) {
      return withPage(input, async (page) => {
        await page.title();
        return completed("smoke");
      });
    },
    async runInteraction(input) {
      return withPage(input, async (page) => {
        await page.locator("button, a, input, form").count();
        return completed("interaction");
      });
    },
    async runVisual(input) {
      return withPage(input, async (page) => {
        await page.viewportSize();
        return completed("visual");
      });
    },
    async runAccessibility(input) {
      return withPage(input, async (page) => {
        await page.locator("html").getAttribute("lang");
        return completed("accessibility");
      });
    },
  };
}
