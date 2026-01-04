import type { ScCoverage } from "./traceability.js";
import type { Issue, ValidationResult } from "./types.js";
import { toRelativePath } from "./paths.js";

export function normalizeIssuePaths(root: string, issues: Issue[]): Issue[] {
  return issues.map((issue) => {
    if (!issue.file) {
      return issue;
    }
    const normalized = toRelativePath(root, issue.file);
    if (normalized === issue.file) {
      return issue;
    }
    return {
      ...issue,
      file: normalized,
    };
  });
}

export function normalizeScCoverage(root: string, sc: ScCoverage): ScCoverage {
  const refs: Record<string, string[]> = {};
  for (const [scId, files] of Object.entries(sc.refs)) {
    refs[scId] = files.map((file) => toRelativePath(root, file));
  }
  return {
    ...sc,
    refs,
  };
}

export function normalizeValidationResult(
  root: string,
  result: ValidationResult,
): ValidationResult {
  return {
    ...result,
    issues: normalizeIssuePaths(root, result.issues),
    traceability: {
      ...result.traceability,
      sc: normalizeScCoverage(root, result.traceability.sc),
    },
  };
}
