/**
 * Evaluator review schema for v2.0 single-thread prototyping (spec-0017).
 *
 * The reviewer (product-surface-reviewer) writes one of these per iteration
 * to `iter-NN/review.json`. The schema enforces:
 *   - 4 ordinal axes (weak / acceptable / strong / exceptional)
 *   - 200..500 word prose critique
 *   - Anti-slop detection cap: if `slopPatternsDetected.length > 0`,
 *     `originality` is bounded above by `acceptable` (cannot be `strong`
 *     or `exceptional`).
 *   - Explicit `pivotDirective: continue | refine | pivot`
 *
 * The cap rule and word-count rule are enforced at construction time so
 * downstream consumers can rely on the type. The validator
 * (`prototypingEvidenceV3.ts`) re-checks the same invariants on disk.
 */

import {
  isOrdinalScore,
  isPivotDirective,
  type OrdinalScore,
  type PivotDirective,
} from "./iteration.js";

export const PROSE_CRITIQUE_MIN_WORDS = 200;
export const PROSE_CRITIQUE_MAX_WORDS = 500;

export type EvaluatorReview = {
  readonly schemaVersion: "3.0";
  readonly iterIndex: number;
  readonly reviewerId: string;
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

export type BuildEvaluatorReviewInput = Omit<EvaluatorReview, "schemaVersion">;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function buildEvaluatorReview(input: BuildEvaluatorReviewInput): EvaluatorReview {
  if (!Number.isInteger(input.iterIndex) || input.iterIndex < 0) {
    throw new Error("buildEvaluatorReview: iterIndex must be a non-negative integer");
  }
  if (typeof input.reviewerId !== "string" || input.reviewerId.trim().length === 0) {
    throw new Error("buildEvaluatorReview: reviewerId must be a non-empty string");
  }

  for (const axis of ["designQuality", "originality", "craft", "functionality"] as const) {
    const score = input.scores[axis];
    if (!isOrdinalScore(score)) {
      throw new Error(
        `buildEvaluatorReview: scores.${axis} must be one of weak|acceptable|strong|exceptional (got ${String(score)})`,
      );
    }
  }

  if (!isPivotDirective(input.pivotDirective)) {
    throw new Error(
      `buildEvaluatorReview: pivotDirective must be one of continue|refine|pivot (got ${String(input.pivotDirective)})`,
    );
  }

  const wordCount = countWords(input.proseCritique);
  if (wordCount < PROSE_CRITIQUE_MIN_WORDS || wordCount > PROSE_CRITIQUE_MAX_WORDS) {
    throw new Error(
      `buildEvaluatorReview: proseCritique must be ${PROSE_CRITIQUE_MIN_WORDS}..${PROSE_CRITIQUE_MAX_WORDS} words (got ${wordCount})`,
    );
  }

  // Anti-slop cap: originality cannot be strong/exceptional while any slop
  // pattern is detected. This is a key v2.0 mechanism: the reviewer must
  // not reward a generic AI-default-looking artifact with a high
  // originality score, even if it scores well on other axes.
  if (input.slopPatternsDetected.length > 0) {
    if (
      input.scores.originality === "strong" ||
      input.scores.originality === "exceptional"
    ) {
      throw new Error(
        "buildEvaluatorReview: originality cannot be strong or exceptional while " +
          `slopPatternsDetected[] is non-empty (current: ${input.scores.originality}, ` +
          `slop: [${input.slopPatternsDetected.join(", ")}])`,
      );
    }
  }

  if (
    typeof input.evidenceRefs.screenshot !== "string" ||
    input.evidenceRefs.screenshot.trim().length === 0
  ) {
    throw new Error("buildEvaluatorReview: evidenceRefs.screenshot must be a non-empty string");
  }
  if (
    typeof input.evidenceRefs.html !== "string" ||
    input.evidenceRefs.html.trim().length === 0
  ) {
    throw new Error("buildEvaluatorReview: evidenceRefs.html must be a non-empty string");
  }

  return {
    schemaVersion: "3.0",
    iterIndex: input.iterIndex,
    reviewerId: input.reviewerId,
    scores: { ...input.scores },
    proseCritique: input.proseCritique,
    slopPatternsDetected: [...input.slopPatternsDetected],
    pivotDirective: input.pivotDirective,
    evidenceRefs: {
      screenshot: input.evidenceRefs.screenshot,
      html: input.evidenceRefs.html,
    },
  };
}
