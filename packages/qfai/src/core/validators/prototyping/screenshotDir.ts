/**
 * screenshotDir validator — ensures each scoringTrace entry carries a screenshotDir
 * field when mode=full-harness.
 *
 * v1.8.4 Phase 9 BREAKING: removed the legacy `validateScreenshotDir` /
 * `ScreenshotDirIssue` exports; callers MUST use
 * `validateScreenshotDirIssues` which returns standard `Issue[]`.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Verifies each scoringTrace entry has a non-empty `screenshotDir` when
 * mode=full-harness. Issues `QFAI-PROT-331` per missing entry.
 */
export function validateScreenshotDirIssues(
  scoringTrace: readonly unknown[],
  mode: string,
  prototypingJsonPath: string,
): Issue[] {
  if (mode !== "full-harness") {
    return [];
  }

  const issues: Issue[] = [];
  const suggestion =
    "full-harness モードでは scoringTrace の各 entry に screenshotDir を記録してください。";

  for (let i = 0; i < scoringTrace.length; i++) {
    const entry = scoringTrace[i];
    if (!isRecord(entry)) {
      issues.push(
        issue(
          "QFAI-PROT-331",
          `scoringTrace[${i}] is not an object; screenshotDir cannot be verified.`,
          "error",
          prototypingJsonPath,
          "prototyping.fullHarness.scoringTrace.screenshotDir",
          undefined,
          "canonical",
          suggestion,
        ),
      );
      continue;
    }
    if (typeof entry.screenshotDir !== "string" || entry.screenshotDir.trim() === "") {
      issues.push(
        issue(
          "QFAI-PROT-331",
          `scoringTrace[${i}].screenshotDir is missing or empty; full-harness requires screenshot evidence per iteration.`,
          "error",
          prototypingJsonPath,
          "prototyping.fullHarness.scoringTrace.screenshotDir",
          undefined,
          "canonical",
          suggestion,
        ),
      );
    }
  }
  return issues;
}
