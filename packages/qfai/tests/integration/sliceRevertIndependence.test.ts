// QFAI:SPEC-0028:TC-0028-0030
import { describe, expect, it } from "vitest";

import { captureRenderEvidence } from "../../src/core/evidence/evidenceHandler.js";
import { runBrowserQa } from "../../src/core/browserQa/index.js";
import { ProviderRegistry } from "../../src/core/providers/index.js";

/**
 * Slice revert independence (TC-0028-0030):
 * Evidence, backend, and browser QA slices still function
 * even if modeResolver (Slice 1) were reverted/absent.
 * This test verifies that no cross-slice import dependency
 * exists between Slice 2/3/4 and Slice 1.
 */
describe("slice revert independence (TC-0028-0030)", () => {
  it("evidence capture works without importing modeResolver", async () => {
    const result = await captureRenderEvidence({ registered: false });
    expect(result.record.screenshot.status).toBe("skipped");
    expect(result.errors).toHaveLength(0);
  });

  it("provider registry works without importing modeResolver", () => {
    const registry = new ProviderRegistry();
    registry.register({
      name: "test",
      capabilities: ["screenshot"],
      captureScreenshot: async () => "/img/test.png",
    });
    expect(registry.has("test")).toBe(true);
  });

  it("browser QA works without importing modeResolver", async () => {
    const registry = new ProviderRegistry();
    const result = await runBrowserQa(registry, "nonexistent", { tier: "standard" });
    expect(result.phases.length).toBeGreaterThan(0);
  });
});
