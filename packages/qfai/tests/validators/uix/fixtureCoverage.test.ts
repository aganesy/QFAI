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
    // Check that threeLayer.test.ts has pass, fail, and non-UI scenarios
    const result = await checkFixtureCoverage(
      path.join(TESTS_ROOT, "uix", "threeLayer.test.ts"),
      "threeLayer",
    );

    expect(result.hasPass).toBe(true);
    expect(result.hasFail).toBe(true);
    expect(result.hasNonUi).toBe(true);
    expect(result.fixtureCount).toBeGreaterThanOrEqual(3);
  });

  it("fixture files per validator", async () => {
    // The canonical UIX validators — the set `runCanonicalUixValidators` runs.
    // The retired pre-`DESIGN.md` sidecar validators (taste / strategy) were
    // deleted with their tests, so naming them here only asserted that fixtures
    // exist for validators that no longer do. `trendScan` stays: its SSOT is
    // `04_Sources.md#Trend Scan`, not a retired sidecar.
    const validators = [
      { name: "classification", file: path.join(TESTS_ROOT, "uix", "classification.test.ts") },
      { name: "threeLayer", file: path.join(TESTS_ROOT, "uix", "threeLayer.test.ts") },
      { name: "trendScan", file: path.join(TESTS_ROOT, "uix", "trendScan.test.ts") },
      {
        name: "comparisonValidator",
        file: path.join(TESTS_ROOT, "uix", "comparisonValidator.test.ts"),
      },
      { name: "screenContract", file: path.join(TESTS_ROOT, "uix", "screenContract.test.ts") },
    ];

    for (const v of validators) {
      const result = await checkFixtureCoverage(v.file, v.name);
      expect(result.fixtureCount).toBeGreaterThanOrEqual(3);
    }
  });
});
