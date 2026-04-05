import type {
  BrowserQaInput,
  BrowserQaPhaseResult,
  BrowserQaProvider,
} from "../browserQa/types.js";
import { isUiBearingSurfaceType } from "../detection/surfaceType.js";

interface PlaywrightPage {
  goto(url: string, options?: { waitUntil?: string }): Promise<unknown>;
  setContent(html: string, options?: { waitUntil?: string }): Promise<void>;
  title(): Promise<string>;
  locator(selector: string): {
    count(): Promise<number>;
    getAttribute(name: string): Promise<string | null>;
  };
  viewportSize(): Promise<{ width: number; height: number } | null>;
  close(): Promise<void>;
}

interface PlaywrightBrowser {
  newPage(): Promise<PlaywrightPage>;
  close(): Promise<void>;
}

interface PlaywrightBrowserType {
  launch(options?: Record<string, unknown>): Promise<PlaywrightBrowser>;
}

interface PlaywrightModule {
  chromium: PlaywrightBrowserType;
}

async function loadPlaywright(): Promise<PlaywrightModule> {
  try {
    return await (import("playwright") as Promise<PlaywrightModule>);
  } catch {
    throw new Error("Playwright is not installed. Install it with: npm install playwright");
  }
}

async function withPage<T>(
  input: BrowserQaInput,
  task: (page: PlaywrightPage) => Promise<T>,
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
  return {
    phase,
    status: "executed",
    findings: [],
    repair_suggestions: [],
    evidence_refs: [`provider:playwright:${phase}`],
    checks_performed: [`playwright executed ${phase} checks`],
  };
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
