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

export type CalibrationOverrides = {
  perAxisMinimum?: number;
  maxIterationsByMode?: Record<string, number>;
};

export type CalibrationPack = {
  version: string;
  examples: AlignmentExample[];
  thresholds: ThresholdConfig;
  maxIterations: number;
  plateauDelta: number;
  plateauLookback: number;
  overrides?: CalibrationOverrides;
};

export type EffectiveCalibrationConfig = {
  maxIterations: number;
  perAxisMinimum: number;
  maxIterationsByMode: Record<string, number>;
};

export const DEFAULT_EFFECTIVE_CONFIG: EffectiveCalibrationConfig = {
  maxIterations: 5,
  perAxisMinimum: 0.6,
  maxIterationsByMode: {},
};

export type ThresholdConfig = {
  accept: number;
  refine: number;
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  accept: 0.8,
  refine: 0.5,
};

export type Decision = "accept" | "refine" | "reject";

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
