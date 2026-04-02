// QFAI:SPEC-0012:TC-0012-0027
import { describe, expect, it } from "vitest";

import { CAPTURE_STATUSES } from "../../src/core/evidence/captureStatus.js";

describe("documentation boundary clarity (TC-0012-0027)", () => {
  it("CAPTURE_STATUSES documents captured/skipped/failed semantics", () => {
    expect(CAPTURE_STATUSES).toContain("captured");
    expect(CAPTURE_STATUSES).toContain("skipped");
    expect(CAPTURE_STATUSES).toContain("failed");
    expect(CAPTURE_STATUSES).toHaveLength(3);
  });
});
