/**
 * Reviewer-Gate finding `R-EXPLORATION-CERTIFY-ATTEMPT` (severity
 * error).
 *
 * Emitted when `qfai prototyping certify` runs against a loop that
 * contains one or more iterations produced under `mode: exploration`.
 * Certify is the convergence-only seal — exploration iterations
 * intentionally relax soft gates and MUST NOT advance to the seal.
 *
 * Shape mirrors `detectMockHrefDrift`: a pure function consumes a
 * minimal data view (the per-iteration `mode` slots) and returns
 * issues.
 */

import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

export type CertifyIterationView = {
  readonly index: number;
  /**
   * Per-iteration mode recorded by iterate at
   * `prototyping.json#iterations[i].mode`. Absent fields are
   * interpreted as convergence (legacy iterations from before the
   * mode slot was introduced).
   */
  readonly mode?: "convergence" | "exploration";
};

export type CertifyExplorationInput = {
  readonly iterations: readonly CertifyIterationView[];
};

const FINDING_CODE = "R-EXPLORATION-CERTIFY-ATTEMPT";

/**
 * Returns one finding listing every exploration-mode iteration index
 * when at least one is present; zero issues otherwise.
 */
export function detectExplorationCertifyAttempt(
  input: CertifyExplorationInput,
): readonly Issue[] {
  const offending = input.iterations
    .filter((it) => it.mode === "exploration")
    .map((it) => it.index);
  if (offending.length === 0) return [];
  const message =
    `${FINDING_CODE}: certify cannot seal a loop containing exploration-mode ` +
    `iterations (offending iter index: ${offending.join(", ")}). Exploration ` +
    `relaxes the soft-gate set per DR-0263; only convergence-mode iterations ` +
    `may advance to the seal. Re-run iterate with --mode convergence (or omit ` +
    `the flag) and re-converge before certifying.`;
  return [
    issue(FINDING_CODE, message, "error", undefined, "reviewerGate.explorationCertifyAttempt"),
  ];
}

/**
 * Resolve `acceptedIterationIndex` for certify. Picks the highest
 * index iteration whose mode is convergence (or absent). Returns null
 * when no convergence iteration exists (every iter is exploration).
 */
export function resolveCertifyAcceptedIterationIndex(
  iterations: readonly CertifyIterationView[],
): number | null {
  let best: number | null = null;
  for (const it of iterations) {
    if (it.mode === "exploration") continue;
    if (best === null || it.index > best) {
      best = it.index;
    }
  }
  return best;
}
