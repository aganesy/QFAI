/**
 * Iteration core types and helpers.
 *
 * The /qfai-prototyping skill runs one prototype through up to
 * MAX_ITERATIONS iterations, in a single design lineage. Each iteration
 * captures screenshot+html and produces a reviewer review.json with
 * 4-axis ordinal scores, prose critique, anti-slop pattern detection,
 * and a pivot directive. Stop is deterministic: either all 4 axes hit
 * `exceptional` with no slop, or the iteration index reaches the budget.
 */

export const MAX_ITERATIONS = 15;
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
    readonly designQuality: OrdinalScore;
    readonly originality: OrdinalScore;
    readonly craft: OrdinalScore;
    readonly functionality: OrdinalScore;
  };
  readonly proseCritique: string;
  readonly slopPatternsDetected: readonly string[];
  readonly pivotDirective: PivotDirective;
  readonly evidenceRefs: {
    readonly screenshot: string;
    readonly html: string;
  };
};

export type StopReason = "axes-exceptional" | "max-iterations";

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

export function allFourAxesExceptional(iter: unknown): boolean {
  if (!isRecord(iter) || !isRecord(iter.scores) || !Array.isArray(iter.slopPatternsDetected)) {
    return false;
  }
  return (
    iter.scores.designQuality === "exceptional" &&
    iter.scores.originality === "exceptional" &&
    iter.scores.craft === "exceptional" &&
    iter.scores.functionality === "exceptional" &&
    iter.slopPatternsDetected.length === 0
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

export function isOrdinalScore(value: unknown): value is OrdinalScore {
  return typeof value === "string" && (ORDINAL_SCORES as readonly string[]).includes(value);
}

export function isPivotDirective(value: unknown): value is PivotDirective {
  return typeof value === "string" && (PIVOT_DIRECTIVES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
