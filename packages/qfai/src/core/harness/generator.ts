/**
 * Generator — produces output from a planner strategy.
 *
 * On refine, incorporates evaluator feedback. On pivot, receives
 * a fresh strategy from the planner.
 */

import type { GeneratorOutput, PlannerStrategy } from "./types.js";

export class Generator {
  generate(strategy: PlannerStrategy, feedback?: string): GeneratorOutput {
    const content = feedback
      ? `[Refined] Output based on strategy: ${strategy.approach}. Feedback incorporated: ${feedback}`
      : `Output based on strategy: ${strategy.approach}`;

    return {
      content,
      metadata: {
        strategyApproach: strategy.approach,
        hasFeedback: !!feedback,
      },
    };
  }
}
