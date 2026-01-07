import type { ScCoverage, TestFileScan } from "./traceability.js";

export type IssueSeverity = "info" | "warning" | "error";

export type IssueCategory = "compatibility" | "change";

export type IssueLocation = {
  line: number;
  column?: number;
};

export type Issue = {
  code: string;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  suggested_action?: string;
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

export type ValidationTraceability = {
  sc: ScCoverage;
  testFiles: TestFileScan;
};

export type ValidationResult = {
  toolVersion: string;
  issues: Issue[];
  counts: ValidationCounts;
  traceability: ValidationTraceability;
};
