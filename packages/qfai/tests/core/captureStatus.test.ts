// QFAI:SPEC-0012:TC-0012-0008
// QFAI:SPEC-0012:TC-0012-0009
import { describe, expect, it } from "vitest";

import {
  createRenderEvidenceRecord,
  CAPTURE_STATUSES,
} from "../../src/core/evidence/captureStatus.js";

describe("createRenderEvidenceRecord", () => {
  describe("full evidence capture (TC-0012-0008)", () => {
    it("returns a record with screenshot, viewport, and domRef all captured", () => {
      const record = createRenderEvidenceRecord({
        screenshot: { status: "captured", path: "/img/screen.png" },
        viewport: { status: "captured", width: 1280, height: 720 },
        domRef: { status: "captured", path: "/dom/snapshot.html" },
      });

      expect(record.screenshot.status).toBe("captured");
      expect(record.viewport.status).toBe("captured");
      expect(record.domRef.status).toBe("captured");
    });

    it("preserves path and dimension data in captured elements", () => {
      const record = createRenderEvidenceRecord({
        screenshot: { status: "captured", path: "/img/screen.png" },
        viewport: { status: "captured", width: 1280, height: 720 },
        domRef: { status: "captured", path: "/dom/snapshot.html" },
      });

      expect(record.screenshot.path).toBe("/img/screen.png");
      expect(record.viewport.width).toBe(1280);
      expect(record.viewport.height).toBe(720);
      expect(record.domRef.path).toBe("/dom/snapshot.html");
    });
  });

  describe("status vocabulary (TC-0012-0009)", () => {
    it("CAPTURE_STATUSES contains exactly captured, skipped, failed", () => {
      expect(CAPTURE_STATUSES).toEqual(["captured", "skipped", "failed"]);
    });

    it("all status values in a fully captured record are captured", () => {
      const record = createRenderEvidenceRecord({
        screenshot: { status: "captured", path: "/img/s.png" },
        viewport: { status: "captured", width: 800, height: 600 },
        domRef: { status: "captured", path: "/dom/d.html" },
      });

      const statuses = [record.screenshot.status, record.viewport.status, record.domRef.status];
      for (const s of statuses) {
        expect(s).toBe("captured");
        expect(CAPTURE_STATUSES).toContain(s);
      }
    });
  });
});
