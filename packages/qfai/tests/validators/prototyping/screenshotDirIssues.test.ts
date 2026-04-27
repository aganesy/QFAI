/**
 * Tests for validateScreenshotDirIssues (v1.8.4 Phase 3).
 *
 * spec-0012 TC-0012-0294 / TC-0012-0295 / AC-0012-0179
 */
import { describe, expect, it } from "vitest";

import { validateScreenshotDirIssues } from "../../../src/core/validators/prototyping/screenshotDir.js";

describe("validateScreenshotDirIssues", () => {
  const path = ".qfai/evidence/prototyping.json";

  it("returns empty when mode is not full-harness", () => {
    expect(validateScreenshotDirIssues([], "standard", path)).toEqual([]);
    expect(
      validateScreenshotDirIssues(
        [{ iteration: 1, screenshotDir: "" }],
        "low-cost",
        path,
      ),
    ).toEqual([]);
  });

  it("returns empty when scoringTrace is empty in full-harness", () => {
    expect(validateScreenshotDirIssues([], "full-harness", path)).toEqual([]);
  });

  it("returns empty when every entry has a non-empty screenshotDir", () => {
    const trace = [
      { iteration: 1, screenshotDir: ".qfai/evidence/prototyping/iterations/1" },
      { iteration: 2, screenshotDir: ".qfai/evidence/prototyping/iterations/2" },
    ];
    expect(validateScreenshotDirIssues(trace, "full-harness", path)).toEqual([]);
  });

  it("emits QFAI-PROT-331 (error) for each missing screenshotDir", () => {
    const trace = [
      { iteration: 1 }, // missing
      { iteration: 2, screenshotDir: ".qfai/evidence/prototyping/iterations/2" },
      { iteration: 3, screenshotDir: "   " }, // empty after trim
    ];
    const issues = validateScreenshotDirIssues(trace, "full-harness", path);
    expect(issues).toHaveLength(2);
    for (const i of issues) {
      expect(i.code).toBe("QFAI-PROT-331");
      expect(i.severity).toBe("error");
      expect(i.category).toBe("canonical");
      expect(i.file).toBe(path);
    }
  });

  it("flags non-record entries with QFAI-PROT-331", () => {
    const trace = [42, "not an object", null];
    const issues = validateScreenshotDirIssues(trace, "full-harness", path);
    expect(issues).toHaveLength(3);
    for (const i of issues) {
      expect(i.code).toBe("QFAI-PROT-331");
      expect(i.message).toMatch(/screenshotDir cannot be verified/);
    }
  });
});
