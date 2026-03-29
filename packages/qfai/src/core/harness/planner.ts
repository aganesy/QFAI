/**
 * Planner — creates generation strategies from spec inputs (BR-0031).
 *
 * The planner produces a strategy for the generator and can be re-invoked
 * on pivot decisions with new context.
 */

import type { PlannerStrategy, SpecInputs } from "./types.js";

export class Planner {
  createStrategy(inputs: SpecInputs, pivotContext?: string): PlannerStrategy {
    const approach = pivotContext
      ? `Revised approach based on pivot: ${pivotContext}`
      : `Generate implementation for ${inputs.specId} covering: ${inputs.requirements.join(", ")}`;

    return {
      approach,
      constraints: inputs.constraints ?? [],
      budgetGuidance: pivotContext
        ? "Revised budget allocation after pivot"
        : "Standard budget allocation",
    };
  }
}
