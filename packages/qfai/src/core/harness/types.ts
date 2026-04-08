/**
 * Full-harness mode types — v1.7.15 measurement-driven model.
 *
 * Each iteration is a real observation of code state.
 * No planner/generator/evaluator loop.
 */

import type { Decision } from "../calibration/types.js";

export type FullHarnessPanelScore = {
  panel: "L1" | "L2";
  total: number;
  axes: Array<{
    axisId: string;
    score: number;
    rationale: string;
    evidenceRefs: string[];
  }>;
};

export type FullHarnessIteration = {
  iteration: number;
  commitSha: string;
  reviewerId: string;
  timestamp: string;
  changeSummary: string[];
  limitations: string[];
  evidenceRefs: {
    render: string[];
    browserQa: string[];
    runtimeGate: string[];
    uiFidelity: string[];
    specCoverage: string[];
  };
  l1: FullHarnessPanelScore;
  l2: FullHarnessPanelScore;
  weightedTotal: number;
  deltaFromPrevious: number | null;
  decision: Decision;
};

export type TerminationReason = "converged" | "max-iterations" | "plateau" | "manual-stop";

export type FullHarnessHistory = {
  runId: string;
  iterations: FullHarnessIteration[];
  bestIteration: number;
  terminationReason?: TerminationReason;
  scoringTrace: Array<{
    iteration: number;
    l1Total: number;
    l2Total: number;
    weightedTotal: number;
    deltaFromPrevious: number | null;
    decision: Decision;
    commitSha: string;
  }>;
};

export type MeasurementInput = {
  root: string;
  reviewer: string;
  changeSummary: string[];
  limitations: string[];
  calibration: {
    packPath: string;
    thresholds: { accept: number; refine: number };
    maxIterations: number;
    plateauDelta: number;
    plateauLookback: number;
  };
  renderRefs?: string[];
  browserQaRefs?: string[];
  runtimeGateRefs?: string[];
  uiFidelityRefs?: string[];
  specCoverageRefs?: string[];
  l1: FullHarnessPanelScore;
  l2: FullHarnessPanelScore;
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
  "placeholder",
  "tbd",
  "n/a",
  "none",
  "",
];
