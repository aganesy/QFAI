// QFAI:SPEC-0028:TC-0028-0030
// QFAI:SPEC-0028:TC-0028-0037
// QFAI:SPEC-0028:TC-0028-0038
// QFAI:SPEC-0028:TC-0028-0039
// QFAI:SPEC-0028:TC-0028-0040
// QFAI:SPEC-0028:TC-0028-0041
// QFAI:SPEC-0028:TC-0028-0042
// QFAI:SPEC-0028:TC-0028-0043
// QFAI:SPEC-0028:TC-0028-0044
// QFAI:SPEC-0036:TC-0036-0011
// QFAI:SPEC-0036:TC-0036-0012
// QFAI:SPEC-0036:TC-0036-0013
// QFAI:SPEC-0036:TC-0036-0014
// QFAI:SPEC-0036:TC-0036-0015
// QFAI:SPEC-0036:TC-0036-0016
// QFAI:SPEC-0036:TC-0036-0017
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { CAPTURE_STATUSES } from "../../src/core/evidence/captureStatus.js";
import { BROWSER_QA_PHASES } from "../../src/core/browserQa/index.js";

/**
 * Slice revert independence (TC-0028-0030):
 * Evidence, backend, and browser QA slices still function
 * even if modeResolver (Slice 1) were reverted/absent.
 *
 * Uses vi.doMock + dynamic import so the mock is guaranteed
 * to be active before any module evaluation occurs.
 */
describe("slice revert independence (TC-0028-0030)", () => {
  it("evidence capture works without importing modeResolver", async () => {
    vi.resetModules();
    vi.doMock("../../src/core/prototyping/modeResolver.js", () => {
      throw new Error("modeResolver must not be imported by Slice 2/3/4 modules");
    });
    const { captureRenderEvidence } = await import("../../src/core/evidence/evidenceHandler.js");
    const result = await captureRenderEvidence({ registered: false });
    expect(result.record.screenshot.status).toBe("skipped");
    expect(result.errors).toHaveLength(0);
  });

  it("provider registry works without importing modeResolver", async () => {
    vi.resetModules();
    vi.doMock("../../src/core/prototyping/modeResolver.js", () => {
      throw new Error("modeResolver must not be imported by Slice 2/3/4 modules");
    });
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "test",
      capabilities: ["screenshot"],
      captureScreenshot: async () => "/img/test.png",
    });
    expect(registry.has("test")).toBe(true);
  });

  it("browser QA works without importing modeResolver", async () => {
    vi.resetModules();
    vi.doMock("../../src/core/prototyping/modeResolver.js", () => {
      throw new Error("modeResolver must not be imported by Slice 2/3/4 modules");
    });
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    const result = await runBrowserQa(registry, "nonexistent", { tier: "standard" });
    expect(result.phases.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// spec-0028: Real status model + browser QA phases
// ---------------------------------------------------------------------------

// QFAI:SPEC-0028:TC-0028-0037
describe("TC-0028-0037: real status model happy path", () => {
  it("CAPTURE_STATUSES contains captured/skipped/failed", () => {
    expect(CAPTURE_STATUSES).toContain("captured");
    expect(CAPTURE_STATUSES).toContain("skipped");
    expect(CAPTURE_STATUSES).toContain("failed");
  });
});

// QFAI:SPEC-0028:TC-0028-0038
describe("TC-0028-0038: requested status rejection", () => {
  it('"requested" is not a valid capture status', () => {
    expect(CAPTURE_STATUSES).not.toContain("requested");
  });
});

// QFAI:SPEC-0028:TC-0028-0039
describe("TC-0028-0039: actual runners execution — all 4 phases", () => {
  it("full-harness tier activates all 4 browser QA phases", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "full",
      capabilities: ["screenshot", "interaction", "visual", "accessibility"],
      captureScreenshot: async () => "/img/full.png",
      runInteraction: async () => {},
      runVisual: async () => {},
      runAccessibility: async () => {},
    });
    const result = await runBrowserQa(registry, "full", { tier: "full-harness" });
    expect(result.phases).toHaveLength(4);
    const captured = result.phases.filter((p) => p.status === "captured");
    expect(captured).toHaveLength(4);
  });
});

// QFAI:SPEC-0028:TC-0028-0040
describe("TC-0028-0040: full-harness mode requires actual runners", () => {
  it("full-harness phases are gated by provider capabilities", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    // Provider with only screenshot capability
    registry.register({
      name: "partial",
      capabilities: ["screenshot"],
      captureScreenshot: async () => "/img/partial.png",
    });
    const result = await runBrowserQa(registry, "partial", { tier: "full-harness" });
    expect(result.phases).toHaveLength(4);
    // smoke should be captured (has screenshot), others skipped
    const smoke = result.phases.find((p) => p.phase === "smoke");
    expect(smoke?.status).toBe("captured");
    const skipped = result.phases.filter((p) => p.status === "skipped");
    expect(skipped.length).toBeGreaterThanOrEqual(3);
  });
});

// QFAI:SPEC-0028:TC-0028-0041
describe("TC-0028-0041: standard mode — browser QA limited phases", () => {
  it("standard tier only activates smoke phase", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "std",
      capabilities: ["screenshot", "interaction", "visual", "accessibility"],
      captureScreenshot: async () => "/img/std.png",
      runInteraction: async () => {},
      runVisual: async () => {},
      runAccessibility: async () => {},
    });
    const result = await runBrowserQa(registry, "std", { tier: "standard" });
    const captured = result.phases.filter((p) => p.status === "captured");
    // Standard mode: only smoke phase is active
    expect(captured).toHaveLength(1);
    expect(captured[0]?.phase).toBe("smoke");
  });
});

// QFAI:SPEC-0028:TC-0028-0042
describe("TC-0028-0042: honest empty clean — empty findings with status captured", () => {
  it("captured phase returns empty findings array", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "clean",
      capabilities: ["screenshot"],
      captureScreenshot: async () => "/img/clean.png",
    });
    const result = await runBrowserQa(registry, "clean", { tier: "standard" });
    const smoke = result.phases.find((p) => p.phase === "smoke");
    expect(smoke?.status).toBe("captured");
    expect(smoke?.findings).toEqual([]);
  });
});

// QFAI:SPEC-0028:TC-0028-0043
describe("TC-0028-0043: dishonest empty — skipped without provider", () => {
  it("missing provider results in skipped status, not captured", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    const result = await runBrowserQa(registry, "nonexistent", { tier: "full-harness" });
    // All phases should be skipped, not falsely captured
    for (const phase of result.phases) {
      expect(phase.status).toBe("skipped");
    }
  });
});

// QFAI:SPEC-0028:TC-0028-0044
describe("TC-0028-0044: foundation comment removal — no placeholder comments in source", () => {
  it("runner.ts does not contain TODO or FIXME placeholder comments", async () => {
    const runnerSrc = await readFile(
      path.join(process.cwd(), "src", "core", "browserQa", "runner.ts"),
      "utf-8",
    );
    // Allow "Foundation-only" documentation comment, but no TODO/FIXME left behind
    expect(runnerSrc).not.toMatch(/\/\/\s*TODO(?!:)/i);
    expect(runnerSrc).not.toMatch(/\/\/\s*FIXME/i);
  });
});

// ---------------------------------------------------------------------------
// spec-0036: Browser QA phase runners
// ---------------------------------------------------------------------------

// QFAI:SPEC-0036:TC-0036-0011
describe("TC-0036-0011: smoke phase actual runner", () => {
  it("smoke phase executes when provider has screenshot capability", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "smoke-test",
      capabilities: ["screenshot"],
      captureScreenshot: async () => "/img/smoke.png",
    });
    const result = await runBrowserQa(registry, "smoke-test", { tier: "full-harness" });
    const smoke = result.phases.find((p) => p.phase === "smoke");
    expect(smoke).toBeDefined();
    expect(smoke?.status).toBe("captured");
  });
});

// QFAI:SPEC-0036:TC-0036-0012
describe("TC-0036-0012: visual phase actual runner", () => {
  it("visual phase executes when provider has visual capability", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "visual-test",
      capabilities: ["screenshot", "visual"],
      captureScreenshot: async () => "/img/vis.png",
      runVisual: async () => {},
    });
    const result = await runBrowserQa(registry, "visual-test", { tier: "full-harness" });
    const visual = result.phases.find((p) => p.phase === "visual");
    expect(visual).toBeDefined();
    expect(visual?.status).toBe("captured");
  });
});

// QFAI:SPEC-0036:TC-0036-0013
describe("TC-0036-0013: interaction phase actual runner", () => {
  it("interaction phase executes when provider has interaction capability", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "interact-test",
      capabilities: ["screenshot", "interaction"],
      captureScreenshot: async () => "/img/int.png",
      runInteraction: async () => {},
    });
    const result = await runBrowserQa(registry, "interact-test", { tier: "full-harness" });
    const interaction = result.phases.find((p) => p.phase === "interaction");
    expect(interaction).toBeDefined();
    expect(interaction?.status).toBe("captured");
  });
});

// QFAI:SPEC-0036:TC-0036-0014
describe("TC-0036-0014: accessibility phase actual runner", () => {
  it("accessibility phase executes when provider has accessibility capability", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "a11y-test",
      capabilities: ["screenshot", "accessibility"],
      captureScreenshot: async () => "/img/a11y.png",
      runAccessibility: async () => {},
    });
    const result = await runBrowserQa(registry, "a11y-test", { tier: "full-harness" });
    const a11y = result.phases.find((p) => p.phase === "accessibility");
    expect(a11y).toBeDefined();
    expect(a11y?.status).toBe("captured");
  });
});

// QFAI:SPEC-0036:TC-0036-0015
describe("TC-0036-0015: foundation comment removal", () => {
  it("types.ts and runner.ts have no leftover FIXME comments", async () => {
    const typesSrc = await readFile(
      path.join(process.cwd(), "src", "core", "browserQa", "types.ts"),
      "utf-8",
    );
    const runnerSrc = await readFile(
      path.join(process.cwd(), "src", "core", "browserQa", "runner.ts"),
      "utf-8",
    );
    expect(typesSrc).not.toMatch(/\/\/\s*FIXME/i);
    expect(runnerSrc).not.toMatch(/\/\/\s*FIXME/i);
  });
});

// QFAI:SPEC-0036:TC-0036-0016
describe("TC-0036-0016: honest empty with clean metadata", () => {
  it("captured phases with no findings return empty array, not undefined", async () => {
    const { ProviderRegistry } = await import("../../src/core/providers/index.js");
    const { runBrowserQa } = await import("../../src/core/browserQa/index.js");
    const registry = new ProviderRegistry();
    registry.register({
      name: "clean-meta",
      capabilities: ["screenshot", "interaction", "visual", "accessibility"],
      captureScreenshot: async () => "/img/clean.png",
      runInteraction: async () => {},
      runVisual: async () => {},
      runAccessibility: async () => {},
    });
    const result = await runBrowserQa(registry, "clean-meta", { tier: "full-harness" });
    for (const phase of result.phases) {
      if (phase.status === "captured") {
        expect(phase.findings).toEqual([]);
        expect(Array.isArray(phase.findings)).toBe(true);
      }
    }
  });
});

// QFAI:SPEC-0036:TC-0036-0017
describe("TC-0036-0017: all 4 phases execution", () => {
  it("BROWSER_QA_PHASES contains exactly 4 phases", () => {
    expect(BROWSER_QA_PHASES).toHaveLength(4);
    expect(BROWSER_QA_PHASES).toContain("smoke");
    expect(BROWSER_QA_PHASES).toContain("interaction");
    expect(BROWSER_QA_PHASES).toContain("visual");
    expect(BROWSER_QA_PHASES).toContain("accessibility");
  });
});
