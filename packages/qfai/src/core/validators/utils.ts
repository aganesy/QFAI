import type { Issue, IssueCategory, IssueSeverity } from "../types.js";

export function issue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file?: string,
  rule?: string,
  refs?: string[],
  category: IssueCategory = "compatibility",
  suggested_action?: string,
  details?: {
    dl_id?: string;
  },
): Issue {
  const issue: Issue = {
    code,
    severity,
    category,
    message,
  };
  if (suggested_action) {
    issue.suggested_action = suggested_action;
  }
  if (file) {
    issue.file = file;
  }
  if (rule) {
    issue.rule = rule;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  if (details?.dl_id) {
    issue.dl_id = details.dl_id;
  }
  return issue;
}

export function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "ENOENT";
}
