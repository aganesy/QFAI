/**
 * Stable category identifier set + additive-only snapshot
 * (spec-0012 Phase 4 / REQ-0012-0068 / TC-0012-0466).
 *
 * The category identifier set is part of the operator-visible contract;
 * any addition requires an explicit spec amendment + ledger row.
 */

import { describe, expect, it } from "vitest";

import { BLOCKED_CATEGORIES } from "../../../../src/core/prototyping/blockedSummary.js";

describe("BLOCKED_CATEGORIES: stable + additive-only snapshot", () => {
  it("matches the locked 3-identifier set in exact order", () => {
    // Snapshot: ANY change to this array MUST land alongside a spec
    // amendment + ledger entry. The order is the emission order in the
    // [BLOCKED] summary text.
    expect([...BLOCKED_CATEGORIES]).toEqual([
      "designMdViolations",
      "layoutAntiPatternsDetected",
      "axes-below-exceptional",
    ]);
  });

  it("rejects re-ordering of the category list", () => {
    expect(BLOCKED_CATEGORIES[0]).toBe("designMdViolations");
    expect(BLOCKED_CATEGORIES[1]).toBe("layoutAntiPatternsDetected");
    expect(BLOCKED_CATEGORIES[2]).toBe("axes-below-exceptional");
  });

  it("pins the category count to 3 (additive-only invariant)", () => {
    expect(BLOCKED_CATEGORIES.length).toBe(3);
  });
});
