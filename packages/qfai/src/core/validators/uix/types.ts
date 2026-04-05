import type { CanonicalPrototypingSurface } from "../../domain/surface.js";
import type { CanonicalStrategyDecision } from "../../domain/strategyDecision.js";

export type StrategySurface = CanonicalPrototypingSurface;

export type StrategySchema = {
  surface?: StrategySurface;
  selectionRequired?: boolean;
  decision?: CanonicalStrategyDecision;
  candidateOptions: CanonicalStrategyDecision[];
  chosenOption?: CanonicalStrategyDecision;
  rationale?: string | string[];
  verificationExpectations?: string | string[];
  notesForReviewer?: string | string[];
};
