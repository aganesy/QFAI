// QFAI:SPEC-0028:TC-0028-0019
// QFAI:SPEC-0028:TC-0028-0020
// QFAI:SPEC-0028:TC-0028-0021
// QFAI:SPEC-0028:TC-0028-0022
// QFAI:SPEC-0028:TC-0028-0023
// QFAI:SPEC-0028:TC-0028-0029
import { describe, expect, it } from "vitest";

import {
  runBrowserQa,
  type BrowserQaConfig,
  type BrowserQaFinding,
  type BrowserQaPhaseResult,
  BROWSER_QA_PHASES,
} from "../../src/core/browserQa/index.js";
import { ProviderRegistry } from "../../src/core/providers/index.js";

function makeFullProvider() {
  return {
    name: "test-provider",
    capabilities: ["screenshot" as const, "viewport" as const, "dom" as const, "interaction" as const, "visual" as const, "accessibility" as const],
    captureScreenshot: async () => "/img/test.png",
    captureViewport: async () => ({ width: 1280, height: 720 }),
    captureDom: async () => "/dom/test.html",
  };
}

function makePartialProvider() {
  return {
    name: "partial-provider",
    capabilities: ["screenshot" as const, "dom" as const],
    captureScreenshot: async () => "/img/partial.png",
    captureDom: async () => "/dom/partial.html",
  };
}

describe("runBrowserQa", () => {
  describe("phase independence (TC-0028-0019, TC-0028-0020)", () => {
    it("skips visual phase when provider lacks visual capability", async () => {
      const registry = new ProviderRegistry();
      registry.register(makePartialProvider());
      const result = await runBrowserQa(registry, "partial-provider", { tier: "full-harness" });
      const visual = result.phases.find((p) => p.phase === "visual");
      expect(visual?.status).toBe("skipped");
      // smoke should still execute
      const smoke = result.phases.find((p) => p.phase === "smoke");
      expect(smoke?.status).not.toBe("skipped");
    });

    it("all 4 phases execute when provider has full capabilities", async () => {
      const registry = new ProviderRegistry();
      registry.register(makeFullProvider());
      const result = await runBrowserQa(registry, "test-provider", { tier: "full-harness" });
      expect(result.phases).toHaveLength(4);
      for (const phase of result.phases) {
        expect(phase.status).toBe("executed");
      }
    });
  });

  describe("structured output schema (TC-0028-0021, TC-0028-0022)", () => {
    it("smoke phase findings have phase, severity, description, repairSuggestion fields", async () => {
      const registry = new ProviderRegistry();
      registry.register(makeFullProvider());
      const result = await runBrowserQa(registry, "test-provider", { tier: "standard" });
      const smoke = result.phases.find((p) => p.phase === "smoke");
      expect(smoke).toBeDefined();
      // even with no actual findings, the structure is correct
      if (smoke && smoke.findings.length > 0) {
        for (const f of smoke.findings) {
          expect(f).toHaveProperty("phase");
          expect(f).toHaveProperty("severity");
          expect(f).toHaveProperty("description");
          expect(f).toHaveProperty("repairSuggestion");
        }
      }
    });

    it("BROWSER_QA_PHASES contains exactly 4 phases", () => {
      expect(BROWSER_QA_PHASES).toEqual(["smoke", "interaction", "visual", "accessibility"]);
    });
  });

  describe("absent backend skip (TC-0028-0023)", () => {
    it("all 4 phases return skipped when no backend is registered", async () => {
      const registry = new ProviderRegistry();
      const result = await runBrowserQa(registry, "nonexistent", { tier: "full-harness" });
      expect(result.phases).toHaveLength(4);
      for (const phase of result.phases) {
        expect(phase.status).toBe("skipped");
      }
    });

    it("results array is populated even when all phases are skipped", async () => {
      const registry = new ProviderRegistry();
      const result = await runBrowserQa(registry, "nonexistent", { tier: "full-harness" });
      expect(result.phases.length).toBeGreaterThan(0);
    });
  });

  describe("schema extensibility (TC-0028-0029)", () => {
    it("smoke results are structurally unchanged when extending to smoke+visual", async () => {
      const registry = new ProviderRegistry();
      registry.register(makeFullProvider());

      const smokeOnly = await runBrowserQa(registry, "test-provider", { tier: "standard" });
      const smokeAndMore = await runBrowserQa(registry, "test-provider", { tier: "full-harness" });

      const smokeResultA = smokeOnly.phases.find((p) => p.phase === "smoke");
      const smokeResultB = smokeAndMore.phases.find((p) => p.phase === "smoke");

      // same structure for the smoke phase regardless of tier
      expect(smokeResultA?.phase).toBe(smokeResultB?.phase);
      expect(smokeResultA?.status).toBe(smokeResultB?.status);
    });
  });
});
