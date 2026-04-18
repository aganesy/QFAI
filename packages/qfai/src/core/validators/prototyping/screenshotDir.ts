/**
 * screenshotDir validator — ensures each scoringTrace entry carries a screenshotDir
 * field when mode=full-harness.
 *
 * spec-0012 TC-0012-0294 / TC-0012-0295 / AC-0012-0179
 */

export interface ScreenshotDirIssue {
  readonly rule: "PROT-SCREENSHOT-DIR";
  readonly index: number;
  readonly message: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateScreenshotDir(
  scoringTrace: readonly unknown[],
  mode: string,
): ScreenshotDirIssue[] {
  if (mode !== "full-harness") {
    return [];
  }

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
