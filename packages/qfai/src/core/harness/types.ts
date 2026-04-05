/**
 * Full-harness mode types.
 *
 * Defines the planner/generator/evaluator loop interfaces
 * and evidence structures for /qfai-prototyping full-harness mode.
 */

import type { CritiqueResult } from "../critique/types.js";
import type { Decision, ThresholdConfig } from "../calibration/types.js";

export type HarnessConfig = {
  maxIterations: number;
  thresholds: ThresholdConfig;
  dimensionWeights?: Record<string, number> | undefined;
  dimensionFloors?: Record<string, number> | undefined;
  plateauDelta?: number | undefined;
  plateauLookback?: number | undefined;
};

export const MIN_ITERATIONS = 5;
export const MAX_ITERATIONS = 15;
export const DEFAULT_MAX_ITERATIONS = 15;

export type PlannerStrategy = {
  approach: string;
  constraints: string[];
  budgetGuidance: string;
};

export type GeneratorOutput = {
  content: string;
  metadata?: Record<string, unknown> | undefined;
};

export type EvaluatorInput = {
  output: GeneratorOutput;
  strategy: PlannerStrategy;
  iteration: number;
  critique?: CritiqueResult | undefined;
};

export type DimensionScore = {
  dimension: string;
  score: number;
  weight: number;
  floor?: number | undefined;
};

export type EvaluatorResult = {
  decision: Decision;
  weightedTotal: number;
  dimensionScores: DimensionScore[];
  feedback?: string | undefined;
  pivotContext?: string | undefined;
};

export type IterationRecord = {
  iteration: number;
  plannerStrategy?: PlannerStrategy | undefined;
  generatorOutput: GeneratorOutput;
  evaluatorResult: EvaluatorResult;
  critiqueResult?: CritiqueResult | undefined;
};

export type LoopStatus = "converged" | "max-iterations" | "plateau";

export type LoopResult = {
  status: LoopStatus;
  finalOutput: GeneratorOutput;
  finalScore: number;
  terminationReason: LoopStatus;
  iterationCount: number;
  iterations: IterationRecord[];
  bestIteration: number;
};

export type HarnessEvidence = {
  runId: string;
  timestamp: string;
  status: LoopStatus;
  iterationCount: number;
  finalScore: number;
  terminationReason: LoopStatus;
  iterations: IterationRecord[];
  bestIteration: number;
};

export type ReviewSummary = {
  finalScore: number;
  recommendation: string;
  iterationSummary: Array<{
    iteration: number;
    score: number;
    decision: Decision;
  }>;
};

export type SpecInputs = {
  specId: string;
  requirements: string[];
  constraints?: string[] | undefined;
  calibrationPackPath?: string | undefined;
};

export type ValidationError = {
  field: string;
  message: string;
};
