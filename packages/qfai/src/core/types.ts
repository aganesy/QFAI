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
  dl_id?: string;
};

export type ValidationCounts = {
  info: number;
  warning: number;
  error: number;
};

export type ValidationPhase = "full" | "atdd" | "tdd" | "refinement";

export type ValidationTraceability = {
  sc: ScCoverage;
  testFiles: TestFileScan;
};

export type ValidationWaiverMatch = {
  dl_ids?: string[];
  paths?: string[];
};

export type ValidationWaiverAction = "suppress" | "downgrade";

export type ValidationWaiverDowngradeTo = "Info";

export type ValidationWaiverEntry = {
  id: string;
  rule_id: string;
  action: ValidationWaiverAction;
  downgrade_to?: ValidationWaiverDowngradeTo;
  match?: ValidationWaiverMatch;
  reason: string;
  expires_on: string;
  owner?: string;
};

export type ValidationWaiverSuppressed = {
  total: number;
  byWaiver: Record<string, number>;
  byRule: Record<string, number>;
};

export type ValidationWaivers = {
  active: ValidationWaiverEntry[];
  suppressed: ValidationWaiverSuppressed;
};

export type ValidationResult = {
  toolVersion: string;
  // optional to keep backward compatibility with validate.json from older versions
  phase?: ValidationPhase;
  issues: Issue[];
  counts: ValidationCounts;
  traceability: ValidationTraceability;
  waivers?: ValidationWaivers;
};
