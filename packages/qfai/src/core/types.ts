import type { ScCoverage } from "./traceability.js";

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

export type ValidationTraceability = {
  sc: ScCoverage;
};

export type ValidationResult = {
  toolVersion: string;
  issues: Issue[];
  counts: ValidationCounts;
  traceability?: ValidationTraceability;
};
