import { describe, expect, it } from "vitest";

import {
  CANONICAL_STRATEGY_DECISIONS,
  isCanonicalStrategyDecision,
} from "../../../src/core/domain/strategyDecision.js";

describe("canonical strategy decisions", () => {
  it("accepts the canonical six values", () => {
    expect(CANONICAL_STRATEGY_DECISIONS).toEqual([
      "template",
      "component-library",
      "design-system",
      "native-pattern",
      "bespoke",
      "none",
    ]);
    for (const decision of CANONICAL_STRATEGY_DECISIONS) {
      expect(isCanonicalStrategyDecision(decision)).toBe(true);
    }
  });

  it("rejects freeform values", () => {
    for (const decision of ["choose option a", "custom-strategy", "library"]) {
      expect(isCanonicalStrategyDecision(decision)).toBe(false);
    }
  });
});
