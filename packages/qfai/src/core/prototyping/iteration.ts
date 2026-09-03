/**
 * Iteration core types and helpers.
 *
 * The prototyping skill runs one prototype through up to MAX_ITERATIONS
 * iterations, in a single design lineage. Each iteration captures
 * screenshot+html and produces a reviewer review.json with 4-axis
 * ordinal scores, prose critique, layout-anti-pattern detection,
 * DESIGN.md compliance violations, and a pivot directive. Stop is
 * deterministic: either all 4 axes hit `exceptional` with no
 * layout-anti-patterns and no DESIGN.md violations, or the iteration
 * index reaches the budget.
 */

import type { DesignMdViolation } from "./designMdViolations.js";

export const MAX_ITERATIONS = 10;
export const MAX_ITERATION_INDEX = MAX_ITERATIONS - 1;

export type OrdinalScore = "weak" | "acceptable" | "strong" | "exceptional";

export const ORDINAL_SCORES: readonly OrdinalScore[] = [
  "weak",
  "acceptable",
  "strong",
  "exceptional",
] as const;

export type PivotDirective = "continue" | "refine" | "pivot";

export const PIVOT_DIRECTIVES: readonly PivotDirective[] = ["continue", "refine", "pivot"] as const;

export type Iteration = {
  readonly index: number;
  readonly commitSha: string;
  readonly scores: {
    readonly informationArchitecture: OrdinalScore;
    readonly navigationFlow: OrdinalScore;
    readonly usability: OrdinalScore;
    readonly functionality: OrdinalScore;
  };
  readonly proseCritique: string;
  readonly layoutAntiPatternsDetected: readonly string[];
  readonly designMdViolations: readonly DesignMdViolation[];
  readonly pivotDirective: PivotDirective;
  readonly evidenceRefs: {
    readonly screenshot: string;
    readonly html: string;
  };
};

export type StopReason =
  | "axes-exceptional"
  | "max-iterations"
  | "license-verify-fail"
  | "input-error";

export const STOP_REASONS: readonly StopReason[] = [
  "axes-exceptional",
  "max-iterations",
  "license-verify-fail",
  "input-error",
] as const;

export function isStopReason(value: unknown): value is StopReason {
  return typeof value === "string" && (STOP_REASONS as readonly string[]).includes(value);
}

/** Pure function. No I/O. Used by both validator and CLI. */
export function shouldStop(iterations: readonly unknown[]): StopReason | null {
  if (iterations.length === 0) return null;
  const last = iterations[iterations.length - 1];
  if (last === undefined) return null;
  if (allFourAxesExceptional(last)) return "axes-exceptional";
  if (isRecord(last) && typeof last.index === "number" && last.index >= MAX_ITERATION_INDEX) {
    return "max-iterations";
  }
  return null;
}

export type PerSpecScreenIter = {
  readonly specId: string;
  readonly screen: string;
  readonly latestIteration: Iteration;
};

export type MultiSpecStopResult = {
  readonly stopReason: StopReason | null;
  readonly laggingSpecs: readonly string[];
};

/**
 * Decide global prototyping convergence across multiple (spec × screen)
 * pairs. Convergence is an AND across every pair: a single pair below
 * `allFourAxesExceptional` blocks the global stop. When convergence is
 * not achieved, `laggingSpecs` lists every spec ID (unique, sorted) that
 * has at least one non-converged pair, so the orchestrator can route the
 * next iteration at spec granularity.
 *
 * Pure function. No I/O. Max-iterations stop semantics for multi-spec
 * runs are handled at the caller level (each pair owns its own index
 * sequence); this function only decides convergence.
 */
export function shouldStopAcrossSpecs(pairs: readonly PerSpecScreenIter[]): MultiSpecStopResult {
  if (pairs.length === 0) {
    return { stopReason: null, laggingSpecs: [] };
  }
  const laggingSet = new Set<string>();
  for (const pair of pairs) {
    if (!allFourAxesExceptional(pair.latestIteration)) {
      laggingSet.add(pair.specId);
    }
  }
  if (laggingSet.size === 0) {
    return { stopReason: "axes-exceptional", laggingSpecs: [] };
  }
  const laggingSpecs = Array.from(laggingSet).sort();
  return { stopReason: null, laggingSpecs };
}

export function allFourAxesExceptional(iter: unknown): boolean {
  if (!isRecord(iter) || !isRecord(iter.scores)) return false;
  if (!Array.isArray(iter.layoutAntiPatternsDetected)) return false;
  if (!Array.isArray(iter.designMdViolations)) return false;
  return (
    iter.scores.informationArchitecture === "exceptional" &&
    iter.scores.navigationFlow === "exceptional" &&
    iter.scores.usability === "exceptional" &&
    iter.scores.functionality === "exceptional" &&
    iter.layoutAntiPatternsDetected.length === 0 &&
    iter.designMdViolations.length === 0
  );
}

export function iterationDir(index: number): string {
  return `.qfai/evidence/prototyping/iter-${String(index).padStart(2, "0")}`;
}

export function iterationHtmlPath(index: number, screenId: string): string {
  return `${iterationDir(index)}/${screenId}.html`;
}

export function iterationScreenshotPath(index: number, screenId: string): string {
  return `${iterationDir(index)}/${screenId}.png`;
}

export function iterationReviewPath(index: number): string {
  return `${iterationDir(index)}/review.json`;
}

/**
 * `reviewerId` stamped on the placeholder iteration that
 * `prototyping iterate --cycle 0` seeds before any reviewer has run.
 *
 * The evidence validator reads it to exempt the seed from the
 * reviewer-deliverable obligations: the seed is by construction not a
 * review. Shared as a constant so the writer and the reader cannot
 * drift — a renamed literal on one side would silently either demand a
 * `review.json` from the seed or waive the demand for every iteration.
 */
export const SEED_REVIEWER_ID = "iterate-seed" as const;

/**
 * Closed evidence-ref kind set for the per-iteration evidence refs.
 */
export const EVIDENCE_REF_KINDS = ["screenshot", "html"] as const;
export type EvidenceRefKind = (typeof EVIDENCE_REF_KINDS)[number];

export type EvidenceRef = {
  readonly kind: EvidenceRefKind;
  readonly path: string;
};

/**
 * Build the per-iteration `evidenceRefs[]` array that bijects with the
 * declared `screens[].id` list. Two refs are emitted per screen
 * (`screenshot` + `html`); both use the zero-padded `iter-NN/<id>.<ext>`
 * path template. The function is pure and case-preserving — callers
 * pass already-underscored ids (the validator rejects hyphen casing at
 * the UI contract surface).
 */
export function buildEvidenceRefs(iterIndex: number, screenIds: readonly string[]): EvidenceRef[] {
  const dir =
    iterationDir(iterIndex).split("/").pop() ?? `iter-${String(iterIndex).padStart(2, "0")}`;
  const out: EvidenceRef[] = [];
  for (const id of screenIds) {
    out.push({ kind: "screenshot", path: `${dir}/${id}.png` });
    out.push({ kind: "html", path: `${dir}/${id}.html` });
  }
  return out;
}

export function isOrdinalScore(value: unknown): value is OrdinalScore {
  return typeof value === "string" && (ORDINAL_SCORES as readonly string[]).includes(value);
}

export function isPivotDirective(value: unknown): value is PivotDirective {
  return typeof value === "string" && (PIVOT_DIRECTIVES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
