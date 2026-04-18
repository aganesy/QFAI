/**
 * Sidecar flow ordering validator — spec-0010 TDD-0045
 *
 * QFAI:SPEC-0010:TC-0010-0045
 */

import { describe, expect, it } from "vitest";

import { validateSidecarFlowOrdering } from "../../../src/core/validators/skill/sidecarFlowOrdering.js";

const VALID_FRAGMENT = `
### Sidecar Generation Flow

並列禁止 (no parallel)

- Step 1c — Populate 04_Sources.md Trend Scan entries. This step MUST finish before Step 1d.
- Step 1d — Derive TRD axes drawing source_refs from entries completed in Step 1c.
`;

const SWAPPED_FRAGMENT = `
### Sidecar Generation Flow

- Step 1d — Derive TRD axes.
- Step 1c — Populate 04_Sources.md Trend Scan entries.
`;

const PARALLEL_FRAGMENT = `
### Sidecar Generation Flow

- Step 1c and Step 1d may run in parallel to save time.
- Step 1d — Derive TRD axes concurrently with Step 1c.
`;

describe("validateSidecarFlowOrdering", () => {
  // QFAI:SPEC-0010:TC-0010-0045
  it("returns no issues for valid Step 1c → Step 1d sequential ordering", () => {
    const issues = validateSidecarFlowOrdering(VALID_FRAGMENT);
    expect(issues).toHaveLength(0);
  });

  // QFAI:SPEC-0010:TC-0010-0045
  it("returns a SKILL-SIDECAR-FLOW issue when Step 1d precedes Step 1c", () => {
    const issues = validateSidecarFlowOrdering(SWAPPED_FRAGMENT);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("SKILL-SIDECAR-FLOW");
    expect(issues[0].message).toMatch(/Step 1d.*before.*Step 1c|Step 1c.*MUST precede/i);
  });

  // QFAI:SPEC-0010:TC-0010-0045
  it("returns a SKILL-SIDECAR-FLOW issue when Step 1c and 1d are marked parallel", () => {
    const issues = validateSidecarFlowOrdering(PARALLEL_FRAGMENT);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("SKILL-SIDECAR-FLOW");
    expect(issues[0].message).toMatch(/parallel|並列禁止/i);
  });

  it("returns no issues when neither Step 1c nor Step 1d is present", () => {
    const issues = validateSidecarFlowOrdering("No step references here.");
    expect(issues).toHaveLength(0);
  });
});
