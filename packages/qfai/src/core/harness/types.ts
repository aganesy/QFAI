/**
 * Full-harness mode types.
 *
 * Full-harness now follows the reviewerScores/allItemsPass95 evidence schema
 * used by prototyping.json. Legacy weighted totals are intentionally excluded.
 */

export type FullHarnessAxisScore = {
  axisId: string;
  score: number;
  rationale: string;
  evidenceRefs: string[];
};

export type FullHarnessReviewerScore = {
  reviewerId: string;
  role?: string;
  scores: FullHarnessAxisScore[];
};

export type FullHarnessEvidenceRefs = {
  render: string[];
  browserQa: string[];
  runtimeGate: string[];
  uiObservation: string[];
  specCoverage: string[];
  discussion: string[];
  screenContract: string[];
  trend: string[];
};

export type FullHarnessIteration = {
  iteration: number;
  commitSha: string;
  timestamp: string;
  changeSummary: string[];
  limitations: string[];
  evidenceRefs: FullHarnessEvidenceRefs;
  reviewerScores: FullHarnessReviewerScore[];
  allItemsPass95: boolean;
  stopReason?: string;
};

export type TerminationReason = "converged" | "max-iterations" | "plateau" | "manual-stop";
export type FinalDecision = "pending" | "accepted" | "rejected" | "abandoned";
export type ReviewerSignoffStatus = "pending" | "approved" | "rejected" | "abandoned";
export type ReviewerLogVerdict = "approve" | "revise" | "reject" | "abandon";

export type FullHarnessScoreSnapshot = {
  iteration: number;
  reviewerCount: number;
  axisCount: number;
  minScore: number | null;
  averageScore: number | null;
  allItemsPass95: boolean;
  commitSha: string;
};

export type FullHarnessHistory = {
  runId: string;
  iterations: FullHarnessIteration[];
  bestIteration: number;
  terminationReason?: TerminationReason;
  scoringTrace: FullHarnessScoreSnapshot[];
};

export type MeasurementInput = {
  root: string;
  reviewer: string;
  changeSummary: string[];
  limitations: string[];
  iterationPolicy: {
    maxIterations: number;
  };
  renderRefs: string[];
  browserQaRefs: string[];
  runtimeGateRefs: string[];
  uiObservationRefs: string[];
  specCoverageRefs: string[];
  discussionRefs: string[];
  screenContractRefs: string[];
  discussionDirRelative?: string;
  trendRefs: string[];
  reviewerScores: FullHarnessReviewerScore[];
  allItemsPass95: boolean;
  stopReason?: string;
};

export type MeasurementResult = {
  iteration: FullHarnessIteration;
  history: FullHarnessHistory;
  terminationReason: TerminationReason | undefined;
  isTerminal: boolean;
};

export type FullHarnessCalibrationRef = {
  configPath: string;
  packPath: string;
  packVersion: string;
};

export const REVIEWER_PLACEHOLDERS = [
  "qfai",
  "default",
  "system",
  "auto",
  "unknown",
  "placeholder",
  "tbd",
  "n/a",
  "none",
  "",
];
