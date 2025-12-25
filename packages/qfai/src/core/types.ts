export type IssueSeverity = "info" | "warning" | "error";

export const VALIDATION_SCHEMA_VERSION = "0.2" as const;

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
  schemaVersion: typeof VALIDATION_SCHEMA_VERSION;
  toolVersion: string;
  issues: Issue[];
  counts: ValidationCounts;
};
