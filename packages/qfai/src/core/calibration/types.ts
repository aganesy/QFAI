/**
 * Calibration pack types for harness scoring alignment.
 *
 * Calibration packs are file-based YAML assets (SD-0030-003)
 * containing scoring alignment examples and threshold configuration.
 */

export type AlignmentExample = {
  input: string;
  expectedScore: number;
  rationale: string;
};

export type CalibrationPack = {
  version: string;
  examples: AlignmentExample[];
  thresholds?: ThresholdConfig;
};

export type ThresholdConfig = {
  accept: number;
  refine: number;
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  accept: 0.8,
  refine: 0.5,
};

export type Decision = "accept" | "refine" | "pivot";

export type DecisionResult = {
  decision: Decision;
  score: number;
  feedback?: string | undefined;
};

export type ReviewerScore = {
  score: number;
  confidence?: number;
  feedback?: string;
};

export type PlateauConfig = {
  deltaThreshold: number;
  lookbackWindow: number;
};

export const DEFAULT_PLATEAU_CONFIG: PlateauConfig = {
  deltaThreshold: 0.02,
  lookbackWindow: 3,
};

export type PlateauResult = {
  detected: boolean;
  delta: number;
  scores: number[];
};
