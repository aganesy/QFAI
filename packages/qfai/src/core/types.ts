import type { ScCoverage, TestFileScan } from "./traceability.js";

export type IssueSeverity = "info" | "warning" | "error";

export type IssueCategory = "canonical" | "change";

export type IssueLocation = {
  line: number;
  column?: number;
};

export type Issue = {
  code: string;
  severity: IssueSeverity;
  // current-only issue model: canonical contract violations or explicit change advisories
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

export type ValidationProfile =
  | "discussion"
  | "sdd"
  | "prototyping"
  | "atdd"
  | "tdd"
  | "verify"
  | "full";

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
  // optional aliases emitted in waiver serialization
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
  profile?: ValidationProfile;
  issues: Issue[];
  counts: ValidationCounts;
  traceability: ValidationTraceability;
  waivers?: ValidationWaivers;
};
