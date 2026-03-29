// QFAI:SPEC-0028:TC-0028-0027
import { describe, expect, it } from "vitest";

import {
  STATIC_OBLIGATIONS,
  RUNTIME_HEAVY_CHECKS,
} from "../../src/core/prototyping/modeResolver.js";
import { CAPTURE_STATUSES } from "../../src/core/evidence/captureStatus.js";
import { BROWSER_QA_PHASES } from "../../src/core/browserQa/index.js";

describe("documentation boundary clarity (TC-0028-0027)", () => {
  it("STATIC_OBLIGATIONS and RUNTIME_HEAVY_CHECKS are disjoint sets (boundary is clear)", () => {
    for (const s of STATIC_OBLIGATIONS) {
      expect(RUNTIME_HEAVY_CHECKS).not.toContain(s);
    }
    for (const r of RUNTIME_HEAVY_CHECKS) {
      expect(STATIC_OBLIGATIONS).not.toContain(r);
    }
  });

  it("CAPTURE_STATUSES documents captured/skipped/failed semantics", () => {
    expect(CAPTURE_STATUSES).toContain("captured");
    expect(CAPTURE_STATUSES).toContain("skipped");
    expect(CAPTURE_STATUSES).toContain("failed");
    expect(CAPTURE_STATUSES).toHaveLength(3);
  });

  it("BROWSER_QA_PHASES lists all documented phases", () => {
    expect(BROWSER_QA_PHASES).toContain("smoke");
    expect(BROWSER_QA_PHASES).toContain("interaction");
    expect(BROWSER_QA_PHASES).toContain("visual");
    expect(BROWSER_QA_PHASES).toContain("accessibility");
  });
});
