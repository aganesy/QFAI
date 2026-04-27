/**
 * Iteration gate validator for full-harness prototyping runs.
 *
 * Enforces: a full-harness run MUST have at least 2 iterations before
 * convergence is claimed. A single-iteration run with converged=true is invalid.
 *
 * spec-0012 TC-0012-0287 / AC-0012-0172
 *
 * v1.8.4 Phase 3: wired into validateStateGate via validateIterationGateIssues.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

export interface FullHarnessIterationEntry {
  readonly iterationCount: number;
  readonly converged?: boolean;
  readonly [key: string]: unknown;
}

/**
 * @deprecated v1.8.4: use `validateIterationGateIssues`. Will be removed
 * in Phase 8.
 */
export interface IterationGateIssue {
  readonly rule: "PROT-ITER-GATE";
  readonly message: string;
}

/**
 * @deprecated v1.8.4: use `validateIterationGateIssues`.
 */
export function validateIterationGate(
  iterations: readonly FullHarnessIterationEntry[],
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- self-reference inside deprecated function
): IterationGateIssue[] {
  if (iterations.length === 0) {
    return [];
  }

  for (const entry of iterations) {
    if (entry.iterationCount === 1 && entry.converged === true) {
      return [
        {
          rule: "PROT-ITER-GATE",
          message:
            "minimum 2 iterations required before convergence: iteration 1 cannot be marked converged.",
        },
      ];
    }
  }

  return [];
}

/**
 * v1.8.4 standard adapter. Returns `Issue[]`.
 *
 * Issued code: `QFAI-PROT-333` (single issue when iteration #1 is marked
 * converged=true).
 *
 * Caller passes the `fullHarness.iterations` array; this validator does not
 * parse the surrounding record.
 */
export function validateIterationGateIssues(
  iterations: readonly FullHarnessIterationEntry[],
  prototypingJsonPath: string,
): Issue[] {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- adapter intentionally bridges legacy implementation
  return validateIterationGate(iterations).map((custom) =>
    issue(
      "QFAI-PROT-333",
      custom.message,
      "error",
      prototypingJsonPath,
      "prototyping.fullHarness.iterations.convergence",
      undefined,
      "canonical",
      "iteration 1 で converged=true は許容されません。少なくとも 2 iteration 以上 走らせてください。",
    ),
  );
}
