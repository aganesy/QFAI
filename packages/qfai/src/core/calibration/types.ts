/**
 * Calibration pack types.
 *
 * Iteration count is fixed globally via
 * `core/prototyping/iteration.ts#MAX_ITERATIONS` and is not a calibration
 * field.
 *
 * The remaining types here support the calibration pack file format
 * (alignment examples + thresholds) consumed by the design-system-threshold
 * validator and reviewer calibration helpers.
 */

export type AlignmentExample = {
  input: string;
  expectedScore: number;
  rationale: string;
};

export type ThresholdConfig = {
  accept: number;
  refine: number;
};

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  accept: 0.8,
  refine: 0.5,
};

export type CalibrationPack = {
  version: string;
  examples: AlignmentExample[];
  thresholds: ThresholdConfig;
  maxIterations: number;
};

export type EffectiveCalibrationConfig = {
  maxIterations: number;
  perAxisMinimum: number;
};

export const DEFAULT_EFFECTIVE_CONFIG: EffectiveCalibrationConfig = {
  maxIterations: 5,
  perAxisMinimum: 0.6,
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
