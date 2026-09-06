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
  /**
   * Severity this finding was declared with before a mode relaxation
   * rewrote it (`relaxedFrom: "error"` on a gate exploration mode
   * downgraded to `warning`). Mirrors `suppressed` on the waiver path
   * so a consumer of `issues[]` can tell a weakened gate from one the
   * validator authored at the lower severity.
   */
  relaxedFrom?: IssueSeverity;
  suggested_action?: string;
  file?: string;
  /**
   * Every other file this finding implicates, when `file` is only a
   * representative (a duplicate ID is defined in N files but reported once).
   * `--spec` scoping keeps the finding if any of these is in scope.
   */
  relatedFiles?: string[];
  refs?: string[];
  rule?: string;
  /**
   * The CI job a finding belongs to, when the producer reported one.
   *
   * `file` + `rule` alone cannot place a workflow-lane finding: two jobs in one workflow
   * file break the same rule for different reasons, and a consumer reading only `file`
   * cannot tell them apart. The reviewer-justification gate ingests findings from the
   * workflow-set lint lanes verbatim, and this is the third of the three site fields those
   * lanes report — dropping it forced the job into prose and out of every JSON consumer.
   */
  job?: string;
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
  | "full"
  | "saas-package";

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

/**
 * Wall-clock cost of the UI/UX validator group, with the budget each part was
 * measured against.
 *
 * How long a run took is a property of the machine that ran it, not of the
 * tree being validated, so it is reported here instead of as a finding: the
 * same commit keeps the same `counts` on a laptop and on a loaded CI runner.
 * Present only for the profiles that run the UI/UX group.
 */
export type ValidationTimings = {
  uiuxMs: number;
  uiuxBudgetMs: number;
  htmlMockMs: number;
  htmlMockBudgetMs: number;
};

export type ValidationResult = {
  toolVersion: string;
  /**
   * When this run produced its result, ISO-8601.
   *
   * Optional because a `validate.json` written before this field existed does
   * not carry it, and a reader must be able to tell "older writer" from "the
   * run happened at the epoch".
   *
   * It exists so a consumer can relate the result to the tree it describes.
   * `qfai prototyping certify` seals evidence on the strength of a STORED
   * `validate.json`, and with no timestamp on it a success from before the
   * evidence changed was indistinguishable from one after (#1107).
   */
  generatedAt?: string;
  profile?: ValidationProfile;
  issues: Issue[];
  counts: ValidationCounts;
  traceability: ValidationTraceability;
  waivers?: ValidationWaivers;
  timings?: ValidationTimings;
};
