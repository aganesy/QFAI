import type { Issue, ValidationResult } from "./types.js";
import { toRelativePath } from "./paths.js";

export function normalizeIssuePaths(root: string, issues: Issue[]): Issue[] {
  return issues.map((issue) => {
    const original = issue.relatedFiles;
    const related = original?.map((file) => toRelativePath(root, file));
    const relatedChanged =
      related !== undefined && related.some((file, index) => file !== original?.[index]);
    if (!issue.file) {
      return related !== undefined && relatedChanged ? { ...issue, relatedFiles: related } : issue;
    }
    const normalized = toRelativePath(root, issue.file);
    if (normalized === issue.file && !relatedChanged) {
      return issue;
    }
    return {
      ...issue,
      file: normalized,
      ...(related !== undefined ? { relatedFiles: related } : {}),
    };
  });
}

export function normalizeValidationResult(
  root: string,
  result: ValidationResult,
): ValidationResult {
  return {
    ...result,
    issues: normalizeIssuePaths(root, result.issues),
  };
}
