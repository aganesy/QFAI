/**
 * screenshotDir validator — ensures each scoringTrace entry carries a screenshotDir
 * field when mode=full-harness.
 *
 * spec-0012 TC-0012-0294 / TC-0012-0295 / AC-0012-0179
 *
 * v1.8.4 Phase 3: wired into validateStateGate via validateScreenshotDirIssues.
 * The legacy `validateScreenshotDir` (custom Issue type) remains @deprecated
 * for one release.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

/**
 * @deprecated v1.8.4: use `validateScreenshotDirIssues`. Will be removed
 * in Phase 8.
 */
export interface ScreenshotDirIssue {
  readonly rule: "PROT-SCREENSHOT-DIR";
  readonly index: number;
  readonly message: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * @deprecated v1.8.4: use `validateScreenshotDirIssues`.
 */
export function validateScreenshotDir(
  scoringTrace: readonly unknown[],
  mode: string,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- self-reference inside deprecated function
): ScreenshotDirIssue[] {
  if (mode !== "full-harness") {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-deprecated -- self-reference inside deprecated function
  const issues: ScreenshotDirIssue[] = [];

  for (let i = 0; i < scoringTrace.length; i++) {
    const entry = scoringTrace[i];
    if (!isRecord(entry)) {
      issues.push({
        rule: "PROT-SCREENSHOT-DIR",
        index: i,
        message: `scoringTrace[${i}] is not an object; screenshotDir cannot be verified.`,
      });
      continue;
    }
    if (typeof entry.screenshotDir !== "string" || entry.screenshotDir.trim() === "") {
      issues.push({
        rule: "PROT-SCREENSHOT-DIR",
        index: i,
        message: `scoringTrace[${i}].screenshotDir is missing or empty; full-harness requires screenshot evidence per iteration.`,
      });
    }
  }

  return issues;
}

/**
 * v1.8.4 standard adapter. Returns `Issue[]` so the validator participates in
 * `runPrototypingValidators` and `--fail-on error` aggregation.
 *
 * Issued code: `QFAI-PROT-331` (one issue per scoringTrace entry missing
 * `screenshotDir`).
 *
 * @param scoringTrace - `prototyping.json.fullHarness.scoringTrace` array.
 *   Caller is responsible for extracting the array; this function does not
 *   parse the surrounding record.
 * @param mode - effective mode string (e.g. "full-harness", "standard").
 *   Validator no-ops outside full-harness.
 * @param prototypingJsonPath - relative path used for issue.file.
 */
export function validateScreenshotDirIssues(
  scoringTrace: readonly unknown[],
  mode: string,
  prototypingJsonPath: string,
): Issue[] {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- adapter intentionally bridges legacy implementation
  return validateScreenshotDir(scoringTrace, mode).map((custom) =>
    issue(
      "QFAI-PROT-331",
      custom.message,
      "error",
      prototypingJsonPath,
      "prototyping.fullHarness.scoringTrace.screenshotDir",
      undefined,
      "canonical",
      "full-harness モードでは scoringTrace の各 entry に screenshotDir を記録してください。",
    ),
  );
}
