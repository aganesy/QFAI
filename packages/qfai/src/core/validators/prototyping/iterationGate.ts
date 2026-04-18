/**
 * Iteration gate validator for full-harness prototyping runs.
 *
 * Enforces: a full-harness run MUST have at least 2 iterations before
 * convergence is claimed. A single-iteration run with converged=true is invalid.
 *
 * spec-0012 TC-0012-0287 / AC-0012-0172
 */

export interface FullHarnessIterationEntry {
  readonly iterationCount: number;
  readonly converged?: boolean;
  readonly [key: string]: unknown;
}

export interface IterationGateIssue {
  readonly rule: "PROT-ITER-GATE";
  readonly message: string;
}

export function validateIterationGate(
  iterations: readonly FullHarnessIterationEntry[],
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
