import type { Issue, ValidationResult } from "../../core/types.js";

import { warn } from "./logger.js";

export const TRUNCATED_SCAN_CODE = "QFAI-SCAN-001";

// `matchedFileCount` is assigned after the collector already stopped at the
// cap, so it equals `limit` by construction whenever `truncated` is true.
// Reporting it would only ever read "collected N files (limit N)", so the
// message states the cap and what it costs instead.
function truncatedScanMessage(
  scan: ValidationResult["traceability"]["testFiles"],
  context: string,
): string {
  return (
    `${context}: test-file scan stopped at the ${scan.limit}-file cap; ` +
    "traceability/ATDD coverage in this run is computed over a partial file set"
  );
}

export function warnIfTruncated(
  scan: ValidationResult["traceability"]["testFiles"],
  context: string,
): void {
  if (!scan.truncated) {
    return;
  }
  warn(`[warn] ${truncatedScanMessage(scan, context)}`);
}

/**
 * A truncated scan makes every coverage number in the run a claim about an
 * arbitrary prefix of the repository, so it has to be a finding — the stdout
 * echo alone is unreachable from `--fail-on` / `--strict`, the GitHub
 * annotation stream and the run-log. `doctor` already grades the same
 * condition as a warning.
 */
export function buildTruncatedScanIssue(
  scan: ValidationResult["traceability"]["testFiles"],
  context: string,
): Issue | null {
  if (!scan.truncated) {
    return null;
  }
  return {
    code: TRUNCATED_SCAN_CODE,
    severity: "warning",
    category: "canonical",
    message: truncatedScanMessage(scan, context),
    rule: "validate.testFileScanTruncated",
    suggested_action:
      "Narrow testFileGlobs or add exclude globs so the scan fits under the " +
      `${scan.limit}-file cap, then re-run before treating this run's coverage as complete.`,
  };
}

/**
 * Append the truncation finding to an already-assembled result, skipping the
 * append when the code is present (a `report --in` run reads a `validate.json`
 * that already carries it).
 */
export function withTruncatedScanIssue(
  result: ValidationResult,
  context: string,
): ValidationResult {
  const issue = buildTruncatedScanIssue(result.traceability.testFiles, context);
  if (!issue || result.issues.some((existing) => existing.code === issue.code)) {
    return result;
  }
  return {
    ...result,
    issues: [...result.issues, issue],
    counts: { ...result.counts, warning: result.counts.warning + 1 },
  };
}
