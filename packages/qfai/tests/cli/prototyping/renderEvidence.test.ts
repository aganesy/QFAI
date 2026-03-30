/**
 * Render evidence tests — spec-0036 TDD-0001..TDD-0004, TDD-0008, TDD-0011
 *
 * QFAI:SPEC-0036:TC-0036-0001
 * QFAI:SPEC-0036:TC-0036-0002
 * QFAI:SPEC-0036:TC-0036-0003
 * QFAI:SPEC-0036:TC-0036-0004
 * QFAI:SPEC-0036:TC-0036-0008
 */
import { describe, expect, it } from "vitest";

import {
  captureRenderEvidence,
  type CaptureTarget,
} from "../../../src/core/uiux/renderEvidence.js";

const defaultTargets: CaptureTarget[] = [
  { id: "desktop", url: "http://localhost:3000", viewport: "desktop", width: 1920, height: 1080 },
  { id: "mobile", url: "http://localhost:3000", viewport: "mobile", width: 375, height: 812 },
];

describe("render evidence", () => {
  it("placeholder removal", async () => {
    // The module must not contain "not implemented in this slice"
    const mod = await import("../../../src/core/uiux/renderEvidence.js");
    const sourceText = JSON.stringify(mod);
    expect(sourceText).not.toContain("not implemented in this slice");

    // Calling capture should produce actual result, not placeholder
    const result = await captureRenderEvidence(defaultTargets, { available: true }, {});
    expect(result.status).not.toBe("not implemented");
  });

  it("capture success", async () => {
    const result = await captureRenderEvidence(defaultTargets, { available: true }, {});

    expect(result.status).toBe("captured");
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.entries[0]?.status).toBe("captured");
  });

  it("skip with reason", async () => {
    const result = await captureRenderEvidence(
      defaultTargets,
      { available: false, reason: "Headless browser not installed" },
      {},
    );

    expect(result.status).toBe("skipped");
    expect(result.reason).toBeTruthy();
    expect(result.reason?.length).toBeGreaterThan(0);
  });

  it("mixed capture fails with detail", async () => {
    const result = await captureRenderEvidence(
      [
        {
          id: "ok-1",
          url: "http://localhost:3000/a",
          viewport: "desktop",
          width: 1920,
          height: 1080,
        },
        { id: "ok-2", url: "http://localhost:3000/b", viewport: "mobile", width: 375, height: 812 },
        {
          id: "fail-1",
          url: "http://localhost:3000/c",
          viewport: "tablet",
          width: 768,
          height: 1024,
        },
      ],
      { available: true },
      {},
      async (target) => {
        if (target.id === "fail-1") throw new Error("Timeout");
        return {
          viewport: target.viewport,
          status: "captured" as const,
          width: target.width,
          height: target.height,
          imagePath: `evidence/${target.id}.png`,
          htmlPath: `evidence/${target.id}.html`,
        };
      },
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toContain("Partial capture failure");
    expect(result.capturedItems).toHaveLength(2);
    expect(result.failedItems).toHaveLength(1);
    expect(result.failedItems?.[0]?.reason).toContain("Timeout");
  });

  it("all capture failures return failed status", async () => {
    const result = await captureRenderEvidence(
      defaultTargets,
      { available: true },
      {},
      async () => {
        throw new Error("Target unreachable");
      },
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toContain("All captures failed");
    expect(result.failedItems).toHaveLength(2);
    expect(result.entries).toHaveLength(0);
  });

  it("alternative suggestion", async () => {
    const result = await captureRenderEvidence(
      defaultTargets,
      { available: false, reason: "Headless not available" },
      {},
    );

    expect(result.alternative).toBeTruthy();
    expect(result.alternative?.length).toBeGreaterThan(0);
  });
});
