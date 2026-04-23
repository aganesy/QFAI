/**
 * Fixture coverage tests — spec-0037 TDD-0015, TDD-0022
 *
 */
import path from "node:path";

import { describe, expect, it } from "vitest";

import { checkFixtureCoverage } from "../../../src/core/validators/uix/fixtureCoverage.js";

const TESTS_ROOT = path.resolve(__dirname, "..");

describe("fixture coverage", () => {
  it("pass/fail/non-UI per validator", async () => {
    // Check that taste.test.ts has pass, fail, and non-UI scenarios
    const result = await checkFixtureCoverage(
      path.join(TESTS_ROOT, "uix", "taste.test.ts"),
      "taste",
    );

    expect(result.hasPass).toBe(true);
    expect(result.hasFail).toBe(true);
    expect(result.hasNonUi).toBe(true);
    expect(result.fixtureCount).toBeGreaterThanOrEqual(3);
  });

  it("fixture files per validator", async () => {
    const validators = [
      { name: "taste", file: path.join(TESTS_ROOT, "uix", "taste.test.ts") },
      { name: "trend", file: path.join(TESTS_ROOT, "uix", "trend.test.ts") },
      { name: "threeLayer", file: path.join(TESTS_ROOT, "uix", "threeLayer.test.ts") },
      {
        name: "comparisonValidator",
        file: path.join(TESTS_ROOT, "uix", "comparisonValidator.test.ts"),
      },
      { name: "strategy", file: path.join(TESTS_ROOT, "uix", "strategy.test.ts") },
      { name: "screenContract", file: path.join(TESTS_ROOT, "uix", "screenContract.test.ts") },
    ];

    for (const v of validators) {
      const result = await checkFixtureCoverage(v.file, v.name);
      expect(result.fixtureCount).toBeGreaterThanOrEqual(2);
    }
  });
});
