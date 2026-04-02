// QFAI:SPEC-0012:TC-0012-0030
// QFAI:SPEC-0012:TC-0012-0037
// QFAI:SPEC-0012:TC-0012-0038
import { describe, expect, it, vi } from "vitest";

import { CAPTURE_STATUSES } from "../../src/core/evidence/captureStatus.js";

/**
 * Slice revert independence (TC-0012-0030):
 * Evidence, backend, and browser QA slices still function
 * even if modeResolver (Slice 1) were reverted/absent.
 *
 * Uses vi.doMock + dynamic import so the mock is guaranteed
 * to be active before any module evaluation occurs.
 */
describe("slice revert independence (TC-0012-0030)", () => {
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
});

// ---------------------------------------------------------------------------
// spec-0028: Real status model
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0037
describe("TC-0012-0037: real status model happy path", () => {
  it("CAPTURE_STATUSES contains captured/skipped/failed", () => {
    expect(CAPTURE_STATUSES).toContain("captured");
    expect(CAPTURE_STATUSES).toContain("skipped");
    expect(CAPTURE_STATUSES).toContain("failed");
  });
});

// QFAI:SPEC-0012:TC-0012-0038
describe("TC-0012-0038: requested status rejection", () => {
  it('"requested" is not a valid capture status', () => {
    expect(CAPTURE_STATUSES).not.toContain("requested");
  });
});
