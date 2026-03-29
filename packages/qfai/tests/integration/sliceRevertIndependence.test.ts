// QFAI:SPEC-0028:TC-0028-0030
import { describe, expect, it, vi } from "vitest";

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
