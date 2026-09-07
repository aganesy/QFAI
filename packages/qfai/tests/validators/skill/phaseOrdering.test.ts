/**
 * Phase ordering validator — spec-0010 TDD-0036
 *
 * QFAI:SPEC-0010:TC-0010-0036
 */

import { describe, expect, it } from "vitest";

import { validatePhaseOrdering } from "../../../src/core/validators/skill/phaseOrdering.js";

const VALID_SKILL_FRAGMENT = `
## Required Process step 9 — Brand archetype selection

### Phase A (brand autonomous selection)

The agent selects an archetype autonomously.

### Phase B (customization)

Apply selected archetype defaults and override with project constraints.
`;

const SWAPPED_FRAGMENT = `
## Required Process step 9 — Brand archetype selection

### Phase B (customization)

Apply selected archetype defaults and override with project constraints.

### Phase A (brand autonomous selection)

The agent selects an archetype autonomously.
`;

describe("validatePhaseOrdering", () => {
  // QFAI:SPEC-0010:TC-0010-0036
  it("returns no issues for valid Phase A → Phase B ordering", () => {
    const issues = validatePhaseOrdering(VALID_SKILL_FRAGMENT);
    expect(issues).toHaveLength(0);
  });

  // QFAI:SPEC-0010:TC-0010-0036
  it("returns a SKILL-PHASE-ORDER issue when Phase B precedes Phase A", () => {
    const issues = validatePhaseOrdering(SWAPPED_FRAGMENT);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("SKILL-PHASE-ORDER");
    expect(issues[0].message).toMatch(/Phase B.*before.*Phase A|Phase A.*MUST/i);
  });

  it("returns no issues when neither phase label is present", () => {
    const issues = validatePhaseOrdering("No phase references here.");
    expect(issues).toHaveLength(0);
  });
});
