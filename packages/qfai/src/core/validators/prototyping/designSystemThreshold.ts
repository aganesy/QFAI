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
 * spec-0012 TC-0012-0301 / TC-0012-0302 / TC-0012-0303 / AC-0012-0183, AC-0012-0184
 */

import { access } from "node:fs/promises";
import path from "node:path";

export const DS_PASS_THRESHOLD = 0.75;

export interface DesignSystemThresholdIssue {
  readonly rule: "PROT-DS-THRESHOLD";
  readonly score: number;
  readonly immediateFixRequired: boolean;
  readonly message: string;
}

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

export async function validateDesignSystemThreshold(
  packDir: string,
  prototypingRecord: unknown,
): Promise<DesignSystemThresholdIssue[]> {
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
    {
      rule: "PROT-DS-THRESHOLD",
      score,
      immediateFixRequired: true,
      message: `designSystemCompliance score ${(score * 100).toFixed(0)}% is below threshold ${(DS_PASS_THRESHOLD * 100).toFixed(0)}%; immediate fix required for next iteration.`,
    },
  ];
}
