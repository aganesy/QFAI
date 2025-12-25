export type IssueSeverity = "info" | "warning" | "error";

export type IssueLocation = {
  line: number;
  column?: number;
};

export type Issue = {
  code: string;
  severity: IssueSeverity;
  message: string;
  file?: string;
  refs?: string[];
  rule?: string;
  loc?: IssueLocation;
};

export type ValidationCounts = {
  info: number;
  warning: number;
  error: number;
};

export type ValidationResult = {
  issues: Issue[];
  counts: ValidationCounts;
};
