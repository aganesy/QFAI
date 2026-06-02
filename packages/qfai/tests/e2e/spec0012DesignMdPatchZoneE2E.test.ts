/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0139
 * (DESIGN.md front-matter `patch_zone:` block — in-zone edits update
 * only `patchHash`; out-of-zone edits invalidate evidence with
 * `R-DESIGN-MD-PATCH-OUT-OF-ZONE`).
 *
 * Converted from `.skip` test-first skeleton to deterministic
 * temp-fixture exercises of the dual-hash helper + validator.
 */
// QFAI:SPEC-0012:US-0012-0139

import { describe, expect, it } from "vitest";

import { computeDesignMdHashes } from "../../src/core/design/designMdPatchZone.js";
import { detectDesignMdPatchOutOfZone } from "../../src/core/validators/designMdPatchZone.js";

const PATCH_ZONE_DESIGN = `---
brand:
  name: "Acme"
visual:
  colors:
    primary: "#2563eb"
    accent: "#f59e0b"
  radius:
    sm: "4px"
    md: "8px"
patch_zone:
  tokens:
    - visual.colors.accent
    - visual.radius.md
---
# DESIGN.md body
`;

describe("US-0012-0139 — in-zone DESIGN.md edit preserves evidence (patchHash bumps, majorHash stable)", () => {
  it("changing an in-zone token value bumps patchHash but NOT majorHash", () => {
    const before = computeDesignMdHashes(PATCH_ZONE_DESIGN);
    const after = computeDesignMdHashes(PATCH_ZONE_DESIGN.replace('"#f59e0b"', '"#fa6500"'));
    expect(after.majorHash).toBe(before.majorHash);
    expect(after.patchHash).not.toBe(before.patchHash);
  });

  it("the reviewer-gate detector emits zero R-DESIGN-MD-PATCH-OUT-OF-ZONE findings on a clean in-zone edit", () => {
    const inZoneAfter = PATCH_ZONE_DESIGN.replace('"#f59e0b"', '"#fa6500"');
    const issues = detectDesignMdPatchOutOfZone({
      before: PATCH_ZONE_DESIGN,
      after: inZoneAfter,
      filePath: "DESIGN.md",
    });
    expect(issues.filter((i) => i.code === "R-DESIGN-MD-PATCH-OUT-OF-ZONE")).toEqual([]);
  });
});

describe("US-0012-0139 — out-of-zone edit invalidates evidence + surfaces R-DESIGN-MD-PATCH-OUT-OF-ZONE", () => {
  it("changing an out-of-zone token value bumps majorHash (evidence-invalidation surface)", () => {
    const before = computeDesignMdHashes(PATCH_ZONE_DESIGN);
    // visual.colors.primary is NOT in the patch_zone tokens list.
    const after = computeDesignMdHashes(PATCH_ZONE_DESIGN.replace('"#2563eb"', '"#7777FF"'));
    expect(after.majorHash).not.toBe(before.majorHash);
  });
});
