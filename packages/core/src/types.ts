export type IssueSeverity = "warning";

export type Issue = {
  code: string;
  severity: IssueSeverity;
  message: string;
  file?: string;
  refs?: string[];
};

export type ValidationResult = {
  issues: Issue[];
};
