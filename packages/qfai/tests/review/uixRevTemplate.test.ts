/**
 * UIX review template tests — spec-0037 TDD-0001, TDD-0002, TDD-0016..TDD-0019
 *
 * QFAI:SPEC-0011:TC-0011-0001
 * QFAI:SPEC-0011:TC-0011-0002
 * QFAI:SPEC-0011:TC-0011-0016
 * QFAI:SPEC-0011:TC-0011-0017
 * QFAI:SPEC-0011:TC-0011-0018
 * QFAI:SPEC-0011:TC-0011-0019
 */
import { describe, expect, it } from "vitest";

import {
  CANONICAL_REVIEW_ITEMS,
  detectGenericFallbackAxes,
  getCanonicalReviewItemIds,
  getReviewItem,
} from "../../src/core/review/uixRevTemplate.js";

const EXPECTED_IDS = [
  "reference-pool-translation",
  "anti-goal-enforcement",
  "exploration-brief-quality",
  "rubric-specificity",
  "evaluator-calibration-quality",
  "selected-direction-adequacy",
  "screen-contract-sufficiency",
  "breakthrough-readiness",
  "accept-refine-pivot-judgement",
] as const;

describe("uix-rev template", () => {
  it("9 review items present (canonical WS-E)", () => {
    expect(CANONICAL_REVIEW_ITEMS).toHaveLength(9);

    const ids = getCanonicalReviewItemIds();
    for (const expected of EXPECTED_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("exploration brief + anti-goal execution", () => {
    const taste = getReviewItem("exploration-brief-quality");
    expect(taste).toBeDefined();
    expect(taste?.evaluationCriteria.length).toBeGreaterThan(0);

    const antiPref = getReviewItem("anti-goal-enforcement");
    expect(antiPref).toBeDefined();
    expect(antiPref?.evaluationCriteria.length).toBeGreaterThan(0);
  });

  it("reference pool translation item verification", () => {
    const trend = getReviewItem("reference-pool-translation");
    expect(trend).toBeDefined();
    expect(trend?.description).toContain("translated");

    // Check criteria include adopted/rejected translation checks
    const criteria = (trend?.evaluationCriteria ?? []).join(" ").toLowerCase();
    expect(criteria).toContain("adopted");
    expect(criteria).toContain("rejected");
  });

  it("rubric specificity item verification", () => {
    const axis = getReviewItem("rubric-specificity");
    expect(axis).toBeDefined();

    // Check criteria reference originality / blandness pressure
    const criteria = (axis?.evaluationCriteria ?? []).join(" ").toLowerCase();
    expect(criteria).toContain("originality");
    expect(criteria).toContain("generic");
  });

  it("evaluator calibration + generic fallback cross-check", () => {
    const generic = getReviewItem("evaluator-calibration-quality");
    expect(generic).toBeDefined();

    // Check that generic axes are detectable
    const axesWithGeneric = [
      "## invariant",
      "",
      "- visual consistency: General visual harmony",
      "",
      "## trend-derived",
      "",
      "- micro_interaction: local_translation: From 2025 trends",
    ].join("\n");

    const genericAxes = detectGenericFallbackAxes(axesWithGeneric);
    expect(genericAxes.length).toBeGreaterThan(0);
  });

  it("canonical names check (WS-E: 9 review items)", () => {
    const ids = getCanonicalReviewItemIds();
    expect(ids).toEqual([
      "reference-pool-translation",
      "anti-goal-enforcement",
      "exploration-brief-quality",
      "rubric-specificity",
      "evaluator-calibration-quality",
      "selected-direction-adequacy",
      "screen-contract-sufficiency",
      "breakthrough-readiness",
      "accept-refine-pivot-judgement",
    ]);

    expect(ids).toHaveLength(9);
  });
});
