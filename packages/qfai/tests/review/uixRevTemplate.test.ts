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
  "taste-reflection-quality",
  "anti-preference-enforcement",
  "trend-relevance-freshness",
  "dynamic-axis-specificity",
  "generic-fallback-persistence",
  "strategy-appropriateness",
  "scoring-schema-completeness",
  "selected-anchor-adequacy",
  "screen-contract-sufficiency",
  "accept-refine-pivot-judgement",
] as const;

describe("uix-rev template", () => {
  it("10 review items present (canonical WS-E)", () => {
    expect(CANONICAL_REVIEW_ITEMS).toHaveLength(10);

    const ids = getCanonicalReviewItemIds();
    for (const expected of EXPECTED_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("taste + anti-preference execution", () => {
    const taste = getReviewItem("taste-reflection-quality");
    expect(taste).toBeDefined();
    expect(taste?.evaluationCriteria.length).toBeGreaterThan(0);

    const antiPref = getReviewItem("anti-preference-enforcement");
    expect(antiPref).toBeDefined();
    expect(antiPref?.evaluationCriteria.length).toBeGreaterThan(0);
  });

  it("trend relevance item verification", () => {
    const trend = getReviewItem("trend-relevance-freshness");
    expect(trend).toBeDefined();
    expect(trend?.description).toContain("temporal");

    // Check criteria include freshness and domain alignment
    const criteria = (trend?.evaluationCriteria ?? []).join(" ").toLowerCase();
    expect(criteria).toContain("freshness");
    expect(criteria).toContain("domain");
  });

  it("axis specificity item verification", () => {
    const axis = getReviewItem("dynamic-axis-specificity");
    expect(axis).toBeDefined();

    // Check criteria reference taste/trend sources
    const criteria = (axis?.evaluationCriteria ?? []).join(" ").toLowerCase();
    expect(criteria).toContain("taste");
    expect(criteria).toContain("trend");
  });

  it("generic fallback + trend cross-check", () => {
    const generic = getReviewItem("generic-fallback-persistence");
    expect(generic).toBeDefined();

    // Check that generic axes are detectable
    const axesWithGeneric = [
      "## invariant",
      "",
      "- visual consistency: General visual harmony",
      "",
      "## trend-derived",
      "",
      "- micro_interaction: source_translation: From 2025 trends",
    ].join("\n");

    const genericAxes = detectGenericFallbackAxes(axesWithGeneric);
    expect(genericAxes.length).toBeGreaterThan(0);
  });

  it("canonical names check (WS-E: 10 review items)", () => {
    const ids = getCanonicalReviewItemIds();
    expect(ids).toEqual([
      "taste-reflection-quality",
      "anti-preference-enforcement",
      "trend-relevance-freshness",
      "dynamic-axis-specificity",
      "generic-fallback-persistence",
      "strategy-appropriateness",
      "scoring-schema-completeness",
      "selected-anchor-adequacy",
      "screen-contract-sufficiency",
      "accept-refine-pivot-judgement",
    ]);

    expect(ids).toHaveLength(10);
  });
});
