// QFAI:SPEC-0028:TC-0028-0010
// QFAI:SPEC-0028:TC-0028-0011
// QFAI:SPEC-0028:TC-0028-0012
// QFAI:SPEC-0028:TC-0028-0013
// QFAI:SPEC-0028:TC-0028-0014
// QFAI:SPEC-0028:TC-0028-0028
import { describe, expect, it } from "vitest";

import {
  captureRenderEvidence,
  type EvidenceCapability,
} from "../../src/core/evidence/evidenceHandler.js";

describe("captureRenderEvidence", () => {
  describe("skipped and failed status (TC-0028-0010, TC-0028-0011)", () => {
    it("returns all elements as skipped when capability is not registered", async () => {
      const result = await captureRenderEvidence({ registered: false });
      expect(result.record.screenshot.status).toBe("skipped");
      expect(result.record.viewport.status).toBe("skipped");
      expect(result.record.domRef.status).toBe("skipped");
    });

    it("returns screenshot as failed when capture throws", async () => {
      const result = await captureRenderEvidence({
        registered: true,
        captureScreenshot: async () => { throw new Error("timeout"); },
        captureViewport: async () => ({ width: 1280, height: 720 }),
        captureDom: async () => "/dom/snap.html",
      });
      expect(result.record.screenshot.status).toBe("failed");
      expect(result.record.viewport.status).toBe("captured");
      expect(result.record.domRef.status).toBe("captured");
    });
  });

  describe("absent capability no blocking (TC-0028-0012)", () => {
    it("returns all elements skipped and zero errors when capability not registered", async () => {
      const result = await captureRenderEvidence({ registered: false });
      expect(result.record.screenshot.status).toBe("skipped");
      expect(result.record.viewport.status).toBe("skipped");
      expect(result.record.domRef.status).toBe("skipped");
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("partial capture mixed status (TC-0028-0013, TC-0028-0014)", () => {
    it("handles mixed status: screenshot captured, DOM failed, viewport captured", async () => {
      const result = await captureRenderEvidence({
        registered: true,
        captureScreenshot: async () => "/img/screen.png",
        captureViewport: async () => ({ width: 1280, height: 720 }),
        captureDom: async () => { throw new Error("DOM extraction failed"); },
      });
      expect(result.record.screenshot.status).toBe("captured");
      expect(result.record.viewport.status).toBe("captured");
      expect(result.record.domRef.status).toBe("failed");
    });

    it("handles all elements failed without rejecting the record", async () => {
      const result = await captureRenderEvidence({
        registered: true,
        captureScreenshot: async () => { throw new Error("timeout"); },
        captureViewport: async () => { throw new Error("no viewport"); },
        captureDom: async () => { throw new Error("DOM error"); },
      });
      expect(result.record.screenshot.status).toBe("failed");
      expect(result.record.viewport.status).toBe("failed");
      expect(result.record.domRef.status).toBe("failed");
      // record exists and is not null/undefined
      expect(result.record).toBeDefined();
    });
  });

  describe("evidence quality not hard gate (TC-0028-0028)", () => {
    it("low-quality screenshot is recorded as failed without blocking error escalation", async () => {
      const result = await captureRenderEvidence({
        registered: true,
        captureScreenshot: async () => { throw new Error("low-quality result"); },
        captureViewport: async () => ({ width: 800, height: 600 }),
        captureDom: async () => "/dom/snap.html",
      });
      expect(result.record.screenshot.status).toBe("failed");
      // errors array contains the failure info but does not block
      expect(result.errors.length).toBeGreaterThan(0);
      // result still has valid viewport and domRef
      expect(result.record.viewport.status).toBe("captured");
      expect(result.record.domRef.status).toBe("captured");
    });
  });
});
