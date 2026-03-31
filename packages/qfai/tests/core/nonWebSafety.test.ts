// QFAI:SPEC-0012:TC-0012-0024
// QFAI:SPEC-0012:TC-0012-0025
// QFAI:SPEC-0012:TC-0012-0026
import { describe, expect, it } from "vitest";

import { captureRenderEvidence } from "../../src/core/evidence/evidenceHandler.js";
import { ProviderRegistry } from "../../src/core/providers/index.js";

describe("non-web project safety", () => {
  describe("zero errors on non-web CLI tool project (TC-0012-0024)", () => {
    it("evidence capture with no capability returns zero errors", async () => {
      const result = await captureRenderEvidence({ registered: false });
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("no browser dep requirement (TC-0012-0025)", () => {
    it("ProviderRegistry has no hard-coded browser provider", () => {
      const registry = new ProviderRegistry();
      expect(registry.has("playwright")).toBe(false);
      expect(registry.has("puppeteer")).toBe(false);
    });
  });

  describe("idempotent skip (TC-0012-0026)", () => {
    it("running evidence capture twice with unset capability gives identical results", async () => {
      const result1 = await captureRenderEvidence({ registered: false });
      const result2 = await captureRenderEvidence({ registered: false });
      expect(result1.record.screenshot.status).toBe(result2.record.screenshot.status);
      expect(result1.record.viewport.status).toBe(result2.record.viewport.status);
      expect(result1.record.domRef.status).toBe(result2.record.domRef.status);
      expect(result1.errors).toEqual(result2.errors);
    });
  });
});
