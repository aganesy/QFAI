/**
 * Browser QA orchestrated runner tests — WS-B
 */
import { describe, expect, it } from "vitest";

import {
  runBrowserQaOrchestrated,
  summarizeBrowserQaResult,
} from "../../src/core/browserQa/runner.js";
import type {
  BrowserQaProvider,
  BrowserQaInput,
  BrowserQaPhaseResult,
} from "../../src/core/browserQa/types.js";
import { BROWSER_QA_PHASES } from "../../src/core/browserQa/types.js";

const MINIMAL_HTML = `<!doctype html><html lang="en"><head><title>Test</title><meta name="viewport" content="width=device-width"></head><body><h1>Hello</h1></body></html>`;

function makeProvider(overrides: Partial<BrowserQaProvider> = {}): BrowserQaProvider {
  return {
    providerId: "test-provider",
    canRun: () => true,
    runSmoke: async (input) => ({ phase: "smoke", status: "executed", findings: [] }),
    runInteraction: async (input) => ({ phase: "interaction", status: "executed", findings: [] }),
    runVisual: async (input) => ({ phase: "visual", status: "executed", findings: [] }),
    runAccessibility: async (input) => ({
      phase: "accessibility",
      status: "executed",
      findings: [],
    }),
    ...overrides,
  };
}

describe("runBrowserQaOrchestrated", () => {
  it("TC-B1: no provider → all 4 phases use builtin, executed", async () => {
    const input: BrowserQaInput = {
      htmlContent: MINIMAL_HTML,
      surface: "web",
    };
    const result = await runBrowserQaOrchestrated(input);

    expect(result.phases).toHaveLength(4);
    expect(result.provider).toBe("qfai-builtin");
    for (const phase of BROWSER_QA_PHASES) {
      const p = result.phases.find((r) => r.phase === phase);
      expect(p).toBeDefined();
      expect(p!.status).toBe("executed");
    }
  });

  it("TC-B2: provider registered, all phases executed", async () => {
    const provider = makeProvider();
    const input: BrowserQaInput = { surface: "web", htmlContent: MINIMAL_HTML };
    const result = await runBrowserQaOrchestrated(input, provider);

    expect(result.phases).toHaveLength(4);
    expect(result.provider).toBe("test-provider");
    for (const p of result.phases) {
      expect(p.status).toBe("executed");
    }
  });

  it("TC-B3: smoke fails → subsequent phases skipped", async () => {
    const provider = makeProvider({
      runSmoke: async () => ({ phase: "smoke", status: "failed", findings: [] }),
    });
    const input: BrowserQaInput = { surface: "web", htmlContent: MINIMAL_HTML };
    const result = await runBrowserQaOrchestrated(input, provider);

    expect(result.phases[0].status).toBe("failed");
    expect(result.phases[1].status).toBe("skipped");
    expect(result.phases[2].status).toBe("skipped");
    expect(result.phases[3].status).toBe("skipped");
  });

  it("TC-B4: non-ui surface → all 4 phases skipped with reason", async () => {
    const input: BrowserQaInput = { surface: "cli", htmlContent: MINIMAL_HTML };
    const result = await runBrowserQaOrchestrated(input);

    expect(result.phases).toHaveLength(4);
    for (const p of result.phases) {
      expect(p.status).toBe("skipped");
      expect(p.skippedReason).toContain("non-ui");
    }
  });

  it("TC-B4b: non-ui surface (non-ui) → all 4 phases skipped", async () => {
    const input: BrowserQaInput = { surface: "non-ui" };
    const result = await runBrowserQaOrchestrated(input);

    expect(result.phases).toHaveLength(4);
    for (const p of result.phases) {
      expect(p.status).toBe("skipped");
    }
  });

  it("TC-B5: findings have structured schema", async () => {
    const input: BrowserQaInput = {
      htmlContent: `<html><body><img src="test.png"></body></html>`,
      surface: "web",
    };
    const result = await runBrowserQaOrchestrated(input);

    const allFindings = result.phases.flatMap((p) => p.findings);
    expect(allFindings.length).toBeGreaterThan(0);
    for (const f of allFindings) {
      expect(f.phase).toBeDefined();
      expect(f.severity).toMatch(/^(info|warning|error)$/);
      expect(f.message).toBeTruthy();
    }
  });

  it("provider canRun=false → all phases skipped", async () => {
    const provider = makeProvider({ canRun: () => false });
    const input: BrowserQaInput = { surface: "web", htmlContent: MINIMAL_HTML };
    const result = await runBrowserQaOrchestrated(input, provider);

    for (const p of result.phases) {
      expect(p.status).toBe("skipped");
    }
  });

  it("provider throws → phase failed, subsequent skipped", async () => {
    const provider = makeProvider({
      runInteraction: async () => {
        throw new Error("boom");
      },
    });
    const input: BrowserQaInput = { surface: "web", htmlContent: MINIMAL_HTML };
    const result = await runBrowserQaOrchestrated(input, provider);

    expect(result.phases[0].status).toBe("executed");
    expect(result.phases[1].status).toBe("failed");
    expect(result.phases[2].status).toBe("skipped");
    expect(result.phases[3].status).toBe("skipped");
  });
});

describe("summarizeBrowserQaResult", () => {
  it("produces correct summary", async () => {
    const input: BrowserQaInput = { surface: "web", htmlContent: MINIMAL_HTML };
    const result = await runBrowserQaOrchestrated(input);
    const summary = summarizeBrowserQaResult(result);

    expect(summary.providerId).toBe("qfai-builtin");
    for (const phase of BROWSER_QA_PHASES) {
      expect(summary.phases[phase]).toBeDefined();
      expect(summary.phases[phase].status).toBeDefined();
    }
  });

  it("includes skipped reasons", async () => {
    const input: BrowserQaInput = { surface: "cli" };
    const result = await runBrowserQaOrchestrated(input);
    const summary = summarizeBrowserQaResult(result);

    expect(summary.skippedReasons.length).toBe(4);
  });
});
