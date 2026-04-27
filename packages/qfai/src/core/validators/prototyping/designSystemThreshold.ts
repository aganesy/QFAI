/**
 * designSystemCompliance threshold validator.
 *
 * Checks the `scoringTrace.designSystemCompliance` score value:
 * - score >= DS_PASS_THRESHOLD  → no finding
 * - score <  DS_PASS_THRESHOLD  → threshold finding with immediate-fix flag
 * - 12_design_system.md absent  → check skipped entirely
 *
 * DS_PASS_THRESHOLD = 0.75  (scores >= 0.75 pass, < 0.75 fail)
 *
 * v1.8.4 Phase 9 BREAKING: removed the legacy `validateDesignSystemThreshold` /
 * `DesignSystemThresholdIssue` exports; callers MUST use
 * `validateDesignSystemThresholdIssues` which returns standard `Issue[]`.
 */

import { access } from "node:fs/promises";
import path from "node:path";

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

export const DS_PASS_THRESHOLD = 0.75;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function designSystemMdPresent(packDir: string): Promise<boolean> {
  try {
    await access(path.join(packDir, "uiux", "12_design_system.md"));
    return true;
  } catch {
    return false;
  }
}

function extractScore(prototypingRecord: unknown): number | null {
  if (!isRecord(prototypingRecord)) return null;
  const trace = prototypingRecord.scoringTrace;
  if (!isRecord(trace)) return null;
  const score = trace.designSystemCompliance;
  if (typeof score !== "number") return null;
  return score;
}

/**
 * Issues `QFAI-PROT-334` when scoringTrace.designSystemCompliance is below
 * the 0.75 threshold while 12_design_system.md is present in the
 * calibration pack.
 */
export async function validateDesignSystemThresholdIssues(
  packDir: string,
  prototypingRecord: unknown,
  prototypingJsonPath: string,
): Promise<Issue[]> {
  const hasDesignSystem = await designSystemMdPresent(packDir);
  if (!hasDesignSystem) {
    return [];
  }

  const score = extractScore(prototypingRecord);
  if (score === null) {
    return [];
  }

  if (score >= DS_PASS_THRESHOLD) {
    return [];
  }

  return [
    issue(
      "QFAI-PROT-334",
      `designSystemCompliance score ${(score * 100).toFixed(0)}% is below threshold ${(DS_PASS_THRESHOLD * 100).toFixed(0)}%; immediate fix required for next iteration.`,
      "error",
      prototypingJsonPath,
      "prototyping.scoringTrace.designSystemCompliance.threshold",
      undefined,
      "canonical",
      `scoringTrace.designSystemCompliance を閾値 ${(DS_PASS_THRESHOLD * 100).toFixed(0)}% 以上に上げる修正を次イテレーションに含めてください。`,
    ),
  ];
}
