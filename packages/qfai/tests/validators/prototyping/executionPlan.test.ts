/**
 * Tests for executionPlan presence validator.
 *
 * v1.8.4: validateExecutionPlanIssues is the standard `Issue[]` adapter,
 * required for `runPrototypingValidators` participation and `--fail-on error`
 * aggregation. The legacy `validateExecutionPlan` (custom Issue type) is
 * @deprecated and will be removed in Phase 7.
 *
 * spec-0012 TC-0012-0290 / AC-0012-0175
 */
import { describe, expect, it } from "vitest";

import { validateExecutionPlanIssues } from "../../../src/core/validators/prototyping/executionPlan.js";

describe("validateExecutionPlanIssues (v1.8.4 standard adapter)", () => {
  const path = ".qfai/evidence/prototyping.json";

  it("returns empty when mode is not full-harness", () => {
    const record = {
      mode: { effective: "standard", source: "config", rationale: "default" },
    };
    expect(validateExecutionPlanIssues(record, path)).toEqual([]);
  });

  it("emits QFAI-PROT-310 (error, canonical) when executionPlan is absent in full-harness", () => {
    const record = {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      // no executionPlan
    };
    const issues = validateExecutionPlanIssues(record, path);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-PROT-310");
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.category).toBe("canonical");
    expect(issues[0]?.file).toBe(path);
    expect(issues[0]?.message).toMatch(/executionPlan is required in full-harness/);
    expect(issues[0]?.suggested_action).toMatch(/full-harness/);
  });

  it("returns empty when executionPlan object is present in full-harness", () => {
    const record = {
      mode: { effective: "full-harness", source: "explicit-request", rationale: "test" },
      executionPlan: {
        targetIterations: 20,
        evaluationAxesSource: ".qfai/contracts/design/evaluation-rubric.yaml",
        delegationMap: { UI実装: "frontend-engineer" },
        plannedAt: "2026-04-26T00:00:00Z",
      },
    };
    expect(validateExecutionPlanIssues(record, path)).toEqual([]);
  });

  it("returns empty when root record is invalid (mode cannot be determined)", () => {
    // detectMode returns "other" when the input is not a record, so the
    // validator short-circuits. Other validators (e.g. QFAI-PROT-150) cover
    // the broader "prototyping.json malformed" case.
    expect(validateExecutionPlanIssues("not an object", path)).toEqual([]);
    expect(validateExecutionPlanIssues(null, path)).toEqual([]);
    expect(validateExecutionPlanIssues(42, path)).toEqual([]);
  });
});
