/**
 * Iteration gate validator for full-harness prototyping runs.
 *
 * Enforces: a full-harness run MUST have at least 2 iterations before
 * convergence is claimed. A single-iteration run with converged=true is invalid.
 *
 * v1.8.4 Phase 9 BREAKING: removed the legacy `validateIterationGate` /
 * `IterationGateIssue` exports; callers MUST use
 * `validateIterationGateIssues` which returns standard `Issue[]`.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

export interface FullHarnessIterationEntry {
  readonly iterationCount: number;
  readonly converged?: boolean;
  readonly [key: string]: unknown;
}

/**
 * Issues `QFAI-PROT-333` when iteration #1 is marked converged=true.
 */
export function validateIterationGateIssues(
  iterations: readonly FullHarnessIterationEntry[],
  prototypingJsonPath: string,
): Issue[] {
  if (iterations.length === 0) {
    return [];
  }

  for (const entry of iterations) {
    if (entry.iterationCount === 1 && entry.converged === true) {
      return [
        issue(
          "QFAI-PROT-333",
          "minimum 2 iterations required before convergence: iteration 1 cannot be marked converged.",
          "error",
          prototypingJsonPath,
          "prototyping.fullHarness.iterations.convergence",
          undefined,
          "canonical",
          "iteration 1 で converged=true は許容されません。少なくとも 2 iteration 以上 走らせてください。",
        ),
      ];
    }
  }

  return [];
}
