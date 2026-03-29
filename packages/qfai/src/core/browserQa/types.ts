/**
 * Browser QA types.
 *
 * @experimental Output shape is intentionally minimal for v1.7.5;
 * full normalization deferred to v1.7.6 (OQ-0002).
 */

export type BrowserQaPhase = "smoke" | "interaction" | "visual" | "accessibility";

export const BROWSER_QA_PHASES: readonly BrowserQaPhase[] = [
  "smoke",
  "interaction",
  "visual",
  "accessibility",
];

export type ExpectationTier = "standard" | "low-cost" | "full-harness";

export type BrowserQaFinding = {
  phase: BrowserQaPhase;
  severity: "error" | "warning" | "info";
  description: string;
  repairSuggestion: string;
  location?: string;
};

export type BrowserQaPhaseResult = {
  phase: BrowserQaPhase;
  status: "executed" | "skipped";
  findings: BrowserQaFinding[];
};

export type BrowserQaResult = {
  phases: BrowserQaPhaseResult[];
};

export type BrowserQaConfig = {
  tier: ExpectationTier;
};
