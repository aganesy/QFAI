/**
 * Observability types — metrics, guidance, drift, and capability profiles.
 */

export type PerIterationMetric = {
  type: "iteration";
  index: number;
  durationMs: number;
  tokenCost: number;
  model: string;
  ts: string;
};

export type AggregateMetric = {
  type: "aggregate";
  totalCost: number;
  totalTime: number;
  iterationCount: number;
  runId: string;
  ts: string;
};

export type MetricRecord = PerIterationMetric | AggregateMetric;

export type ModeRecommendation = {
  // The only supported recommendation literal is the single-thread loop.
  mode: "single-thread-loop";
  reasoning: string;
};

export type ProjectCharacteristics = {
  fileCount: number;
  testRatio: number;
  specCoverage: number;
  codeComplexity: number;
};

export type DriftResult = {
  driftScore: number;
  flaggedDimensions: string[];
  withinThreshold: boolean;
};

export type CapabilityProfile = {
  testMaturity: number;
  specCoverage: number;
  codeComplexity: number;
  observabilityReadiness: number;
};

export type HistoricalEntry = {
  runId: string;
  timestamp: string;
  totalCost: number;
  totalTime: number;
};
