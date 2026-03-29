export type PlannerState = {
  strategies: Array<{
    approach: string;
    constraints: string[];
    budgetGuidance: string;
  }>;
};

export type GeneratorState = {
  outputs: string[];
};

export type EvaluatorState = {
  scores: number[];
  decisions: string[];
};

export type HandoffArtifact = {
  version: string;
  sessionId: string;
  timestamp: string;
  iteration: number;
  planner: PlannerState;
  generator: GeneratorState;
  evaluator: EvaluatorState;
};

export type HandoffValidationResult = {
  valid: boolean;
  errors: string[];
};
