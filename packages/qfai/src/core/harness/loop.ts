/**
 * Harness loop — orchestrates the planner/generator/evaluator cycle
 * with configurable iteration bounds, plateau detection, and evidence generation.
 */

import type { CritiqueAdapter } from "../critique/adapter.js";
import { PlateauDetector } from "../calibration/plateau.js";
import { Planner } from "./planner.js";
import { Generator } from "./generator.js";
import { Evaluator, type EvaluatorConfig } from "./evaluator.js";
import type {
  GeneratorOutput,
  HarnessConfig,
  IterationRecord,
  LoopResult,
  LoopStatus,
  SpecInputs,
  ValidationError,
} from "./types.js";
import { MIN_ITERATIONS, MAX_ITERATIONS, DEFAULT_MAX_ITERATIONS } from "./types.js";

export class HarnessLoop {
  private config: HarnessConfig;
  private planner: Planner;
  private generator: Generator;
  private evaluator: Evaluator;
  private plateauDetector: PlateauDetector;
  private critiqueAdapter: CritiqueAdapter | undefined;

  constructor(
    config: Partial<HarnessConfig> = {},
    critiqueAdapter?: CritiqueAdapter,
  ) {
    const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;

    this.config = {
      maxIterations,
      thresholds: config.thresholds ?? { accept: 0.8, refine: 0.5 },
      dimensionWeights: config.dimensionWeights,
      dimensionFloors: config.dimensionFloors,
      plateauDelta: config.plateauDelta,
      plateauLookback: config.plateauLookback,
    };

    this.planner = new Planner();
    this.generator = new Generator();
    this.evaluator = new Evaluator({
      thresholds: this.config.thresholds,
      dimensionWeights: this.config.dimensionWeights ?? {
        quality: 0.3,
        correctness: 0.3,
        completeness: 0.2,
        style: 0.2,
      },
      dimensionFloors: this.config.dimensionFloors,
    } as EvaluatorConfig);
    this.plateauDetector = new PlateauDetector(
      {
        deltaThreshold: config.plateauDelta ?? 0.02,
        lookbackWindow: config.plateauLookback ?? 3,
      },
      maxIterations,
    );
    this.critiqueAdapter = critiqueAdapter;
  }

  validateInputs(inputs: SpecInputs): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!inputs.specId) {
      errors.push({ field: "specId", message: "specId is required" });
    }
    if (!inputs.requirements || inputs.requirements.length === 0) {
      errors.push({
        field: "requirements",
        message: "At least one requirement is required",
      });
    }

    return errors;
  }

  validateConfig(): ValidationError[] {
    const errors: ValidationError[] = [];

    if (this.config.maxIterations < MIN_ITERATIONS) {
      errors.push({
        field: "maxIterations",
        message: `maxIterations must be >= ${MIN_ITERATIONS} (got ${this.config.maxIterations})`,
      });
    }
    if (this.config.maxIterations > MAX_ITERATIONS) {
      errors.push({
        field: "maxIterations",
        message: `maxIterations must be <= ${MAX_ITERATIONS} (got ${this.config.maxIterations})`,
      });
    }

    return errors;
  }

  async run(inputs: SpecInputs): Promise<LoopResult> {
    // Pre-loop validation
    const inputErrors = this.validateInputs(inputs);
    if (inputErrors.length > 0) {
      throw new Error(
        `Pre-loop validation failed: ${inputErrors.map((e) => `${e.field}: ${e.message}`).join("; ")}`,
      );
    }

    const configErrors = this.validateConfig();
    if (configErrors.length > 0) {
      throw new Error(
        `Configuration validation failed: ${configErrors.map((e) => `${e.field}: ${e.message}`).join("; ")}`,
      );
    }

    const iterations: IterationRecord[] = [];
    const scores: number[] = [];
    let bestScore = -1;
    let bestIteration = 0;
    let bestOutput: GeneratorOutput = { content: "" };

    let strategy = this.planner.createStrategy(inputs);
    let feedback: string | undefined;

    for (let i = 1; i <= this.config.maxIterations; i++) {
      // Generate
      const output = this.generator.generate(strategy, feedback);

      // Get optional critique
      let critiqueResult = undefined;
      if (this.critiqueAdapter) {
        critiqueResult = await this.critiqueAdapter.requestCritique({
          output: output.content,
          context: inputs.specId,
          iteration: i,
        });
      }

      // Evaluate
      const evalResult = this.evaluator.evaluate({
        output,
        strategy,
        iteration: i,
        critique: critiqueResult,
      });

      const iterationRecord: IterationRecord = {
        iteration: i,
        plannerStrategy: i === 1 || evalResult.decision === "pivot" ? strategy : undefined,
        generatorOutput: output,
        evaluatorResult: evalResult,
        critiqueResult,
      };
      iterations.push(iterationRecord);
      scores.push(evalResult.weightedTotal);

      if (evalResult.weightedTotal > bestScore) {
        bestScore = evalResult.weightedTotal;
        bestIteration = i;
        bestOutput = output;
      }

      // Accept — exit immediately
      if (evalResult.decision === "accept") {
        return {
          status: "accepted",
          finalOutput: output,
          finalScore: evalResult.weightedTotal,
          terminationReason: "accepted",
          iterationCount: i,
          iterations,
          bestIteration: i,
        };
      }

      // Check plateau
      const plateauCheck = this.plateauDetector.shouldExit(i, scores);
      if (plateauCheck.exit && plateauCheck.reason === "plateau") {
        return {
          status: "plateau",
          finalOutput: bestOutput,
          finalScore: bestScore,
          terminationReason: "plateau",
          iterationCount: i,
          iterations,
          bestIteration,
        };
      }

      // Refine or Pivot
      if (evalResult.decision === "pivot") {
        strategy = this.planner.createStrategy(inputs, evalResult.pivotContext);
        feedback = undefined;
      } else {
        feedback = evalResult.feedback;
      }
    }

    // Cap reached
    return {
      status: "cap-reached",
      finalOutput: bestOutput,
      finalScore: bestScore,
      terminationReason: "cap-reached",
      iterationCount: this.config.maxIterations,
      iterations,
      bestIteration,
    };
  }
}
