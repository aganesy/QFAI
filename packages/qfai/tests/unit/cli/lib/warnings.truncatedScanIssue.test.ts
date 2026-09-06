/**
 * Unit test — a truncated test-file scan must be a finding, not just a
 * stdout line.
 *
 * Regression guard: `warnIfTruncated` used to be the only reaction to
 * `traceability.testFiles.truncated`, and it writes to stdout without
 * touching `result.issues`. Everything that consumes findings — the
 * `--fail-on` / `--strict` exit gate, the GitHub annotation stream,
 * `validator.json` and `summary.md` — reads issues or the counts derived
 * from them, so a run whose coverage was computed over a partial file set
 * was recorded as a clean PASS.
 */

import { describe, expect, it } from "vitest";

import { shouldFail } from "../../../../src/cli/lib/failOn.js";
import {
  TRUNCATED_SCAN_CODE,
  buildTruncatedScanIssue,
  withTruncatedScanIssue,
} from "../../../../src/cli/lib/warnings.js";
import type { ValidationResult } from "../../../../src/core/types.js";

function scan(truncated: boolean): ValidationResult["traceability"]["testFiles"] {
  return {
    globs: ["tests/**/*.test.ts"],
    excludeGlobs: ["**/node_modules/**"],
    // `matchedFileCount` equals `limit` by construction once the collector
    // stops at the cap — the fixture mirrors that.
    matchedFileCount: truncated ? 20000 : 12,
    truncated,
    limit: 20000,
  };
}

function result(truncated: boolean): ValidationResult {
  return {
    toolVersion: "0.0.0-test",
    issues: [],
    counts: { info: 0, warning: 0, error: 0 },
    traceability: {
      sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
      testFiles: scan(truncated),
    },
  };
}

describe("buildTruncatedScanIssue", () => {
  it("returns null when the scan completed", () => {
    expect(buildTruncatedScanIssue(scan(false), "validate")).toBeNull();
  });

  it("returns a warning-severity finding when the scan was truncated", () => {
    const issue = buildTruncatedScanIssue(scan(true), "validate");
    expect(issue).not.toBeNull();
    expect(issue?.code).toBe(TRUNCATED_SCAN_CODE);
    expect(issue?.severity).toBe("warning");
    expect(issue?.message).toContain("validate");
    expect(issue?.message).toContain("20000-file cap");
    expect(issue?.message).toContain("partial file set");
  });

  it("does not report the redundant collected count", () => {
    // `collected 20000 files (limit 20000)` carried no information: the two
    // numbers are equal whenever truncation fires.
    expect(buildTruncatedScanIssue(scan(true), "validate")?.message).not.toContain("collected");
  });
});

describe("withTruncatedScanIssue", () => {
  it("leaves a completed scan's result untouched", () => {
    const clean = result(false);
    expect(withTruncatedScanIssue(clean, "report")).toBe(clean);
  });

  it("appends the finding and counts it as a warning", () => {
    const withIssue = withTruncatedScanIssue(result(true), "report");
    expect(withIssue.issues.map((issue) => issue.code)).toEqual([TRUNCATED_SCAN_CODE]);
    expect(withIssue.counts).toEqual({ info: 0, warning: 1, error: 0 });
  });

  it("is idempotent so `report --in` does not duplicate validate's finding", () => {
    const once = withTruncatedScanIssue(result(true), "validate");
    const twice = withTruncatedScanIssue(once, "report");
    expect(twice).toBe(once);
    expect(twice.counts.warning).toBe(1);
  });

  it("makes the truncated run reachable from the `--fail-on warning` gate", () => {
    const before = result(true);
    expect(shouldFail(before, "warning")).toBe(false);

    const after = withTruncatedScanIssue(before, "validate");
    expect(shouldFail(after, "warning")).toBe(true);
    // Still not an error: a truncated scan is unsound, not broken.
    expect(shouldFail(after, "error")).toBe(false);
    expect(shouldFail(after, "never")).toBe(false);
  });
});
