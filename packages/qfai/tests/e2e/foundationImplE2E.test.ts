// QFAI:SPEC-0036:US-0036-0001

import { describe, expect, it } from "vitest";

import {
  captureRenderEvidence,
  type EvidenceCapability,
} from "../../src/core/evidence/evidenceHandler.js";

// ---------------------------------------------------------------------------
// E2E: spec-0036 — Foundation Implementation Completion
// ---------------------------------------------------------------------------

// QFAI:SPEC-0036:US-0036-0001
describe("E2E: US-0036-0001 — Render Evidence Wiring (placeholder removal)", () => {
  it("captureRenderEvidence returns structured result with status fields", async () => {
    const capability: EvidenceCapability = {
      registered: true,
      captureScreenshot: async () => "/img/captured.png",
      captureViewport: async () => ({ width: 1280, height: 720 }),
      captureDom: async () => "/dom/captured.html",
    };
    const result = await captureRenderEvidence(capability);

    // Structured result: captured with real evidence data
    expect(result.record.screenshot.status).toBe("captured");
    expect(result.record.viewport.status).toBe("captured");
    expect(result.record.domRef.status).toBe("captured");
    expect(result.errors).toHaveLength(0);

    // Verify captured elements contain actual evidence
    if (result.record.screenshot.status === "captured") {
      expect(result.record.screenshot.path).toBeTruthy();
    }
    if (result.record.viewport.status === "captured") {
      expect(result.record.viewport.width).toBe(1280);
      expect(result.record.viewport.height).toBe(720);
    }
  });

  it("captureRenderEvidence returns skipped with reason when unavailable", async () => {
    const capability: EvidenceCapability = { registered: false };
    const result = await captureRenderEvidence(capability);

    expect(result.record.screenshot.status).toBe("skipped");
    if (result.record.screenshot.status === "skipped") {
      expect(result.record.screenshot.reason).toBeTruthy();
    }
  });

  it("partial capture reports failed items alongside captured items", async () => {
    const capability: EvidenceCapability = {
      registered: true,
      captureScreenshot: async () => "/img/ok.png",
      captureViewport: async () => {
        throw new Error("browser crashed");
      },
      captureDom: async () => {
        throw new Error("DOM timeout");
      },
    };
    const result = await captureRenderEvidence(capability);

    expect(result.record.screenshot.status).toBe("captured");
    expect(result.record.viewport.status).toBe("failed");
    expect(result.record.domRef.status).toBe("failed");
    expect(result.errors.length).toBe(2);
  });
});
