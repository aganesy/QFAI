import type { ScCoverage, TestFileScan } from "./traceability.js";

export type IssueSeverity = "info" | "warning" | "error";

export type IssueCategory = "canonical" | "compatibility" | "change";

export type IssueLocation = {
  line: number;
  column?: number;
};

export type Issue = {
  code: string;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  suppressed?: boolean;
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

export type ValidationWaiverSeverity = "warning" | "info";

export type ValidationWaiverScope = {
  paths: string[];
};

export type ValidationWaiverEntry = {
  id: string;
  rule: string;
  scope: ValidationWaiverScope;
  action: ValidationWaiverAction;
  downgrade_to?: ValidationWaiverDowngradeTo;
  severity?: ValidationWaiverSeverity;
  match?: ValidationWaiverMatch;
  reason: string;
  expires: string;
  evidence: string;
  owner?: string;
  // backward-compatible aliases for historical report consumers
  rule_id?: string;
  expires_on?: string;
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
