/**
 * Evaluator review schema for single-thread prototyping.
 *
 * The reviewer (product-surface-reviewer) writes one of these per iteration
 * to `iter-NN/review.json`. The schema enforces:
 *   - 4 ordinal axes (weak / acceptable / strong / exceptional):
 *     informationArchitecture, navigationFlow, usability, functionality
 *   - 200..500 word prose critique
 *   - Layout-anti-pattern detection cap: if
 *     `layoutAntiPatternsDetected.length > 0`, `informationArchitecture`
 *     is bounded above by `acceptable` (cannot be `strong` or
 *     `exceptional`).
 *   - DESIGN.md compliance: `designMdViolations[]` must be a valid
 *     array of `{kind, found}` records. The cap rule does NOT apply to
 *     dmv — dmv enforces a separate certify gate at convergence time.
 *   - Explicit `pivotDirective: continue | refine | pivot`
 *
 * The cap rule and word-count rule are enforced at construction time so
 * downstream consumers can rely on the type. The on-disk evidence
 * validator re-checks the same invariants.
 */

import type { DesignMdViolation } from "./designMdViolations.js";
import {
  isOrdinalScore,
  isPivotDirective,
  type OrdinalScore,
  type PivotDirective,
} from "./iteration.js";

export const PROSE_CRITIQUE_MIN_WORDS = 200;
export const PROSE_CRITIQUE_MAX_WORDS = 500;

export const ORDINAL_AXES = [
  "informationArchitecture",
  "navigationFlow",
  "usability",
  "functionality",
] as const;

export type OrdinalAxis = (typeof ORDINAL_AXES)[number];

const VIOLATION_KINDS: ReadonlySet<string> = new Set(["color", "font", "radius", "shadow"]);

export type EvaluatorReview = {
  readonly iterIndex: number;
  readonly reviewerId: string;
  readonly scores: Record<OrdinalAxis, OrdinalScore>;
  readonly proseCritique: string;
  readonly layoutAntiPatternsDetected: readonly string[];
  readonly designMdViolations: readonly DesignMdViolation[];
  readonly pivotDirective: PivotDirective;
  readonly evidenceRefs: {
    readonly screenshot: string;
    readonly html: string;
  };
};

export type BuildEvaluatorReviewInput = EvaluatorReview;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateScores(input: BuildEvaluatorReviewInput): void {
  // The static type promises a Record<OrdinalAxis, OrdinalScore>, but
  // this validator also runs against on-disk evidence reloaded as JSON
  // (where the type is gone). Read through `unknown` to keep the
  // runtime checks honest without a bare `as` cast.
  const scores: unknown = input.scores;
  if (!isRecord(scores)) {
    throw new Error("buildEvaluatorReview: scores must be an object");
  }
  for (const axis of ORDINAL_AXES) {
    if (!(axis in scores)) {
      throw new Error(`buildEvaluatorReview: scores.${axis} is required`);
    }
    const score = scores[axis];
    if (!isOrdinalScore(score)) {
      throw new Error(
        `buildEvaluatorReview: scores.${axis} must be one of weak|acceptable|strong|exceptional (got ${String(score)})`,
      );
    }
  }
}

function validateDesignMdViolations(input: BuildEvaluatorReviewInput): void {
  const dmv: unknown = input.designMdViolations;
  if (!Array.isArray(dmv)) {
    throw new Error("buildEvaluatorReview: designMdViolations must be an array");
  }
  for (let i = 0; i < dmv.length; i += 1) {
    const entry: unknown = dmv[i];
    if (!isRecord(entry)) {
      throw new Error(
        `buildEvaluatorReview: designMdViolations[${i}] must be an object {kind, found}`,
      );
    }
    if (typeof entry.kind !== "string" || !VIOLATION_KINDS.has(entry.kind)) {
      throw new Error(
        `buildEvaluatorReview: designMdViolations[${i}].kind must be one of color|font|radius|shadow (got ${String(entry.kind)})`,
      );
    }
    if (typeof entry.found !== "string") {
      throw new Error(`buildEvaluatorReview: designMdViolations[${i}].found must be a string`);
    }
  }
}

function validateAntiPatternCap(input: BuildEvaluatorReviewInput): void {
  if (!Array.isArray(input.layoutAntiPatternsDetected)) {
    throw new Error("buildEvaluatorReview: layoutAntiPatternsDetected must be a string array");
  }
  if (input.layoutAntiPatternsDetected.length === 0) return;
  const ia = input.scores.informationArchitecture;
  if (ia === "strong" || ia === "exceptional") {
    throw new Error(
      "buildEvaluatorReview: informationArchitecture must be capped at acceptable when " +
        `layoutAntiPatternsDetected[] is non-empty (current: ${ia}, ` +
        `lap: [${input.layoutAntiPatternsDetected.join(", ")}])`,
    );
  }
}

export function buildEvaluatorReview(input: BuildEvaluatorReviewInput): EvaluatorReview {
  if (!Number.isInteger(input.iterIndex) || input.iterIndex < 0) {
    throw new Error("buildEvaluatorReview: iterIndex must be a non-negative integer");
  }
  if (typeof input.reviewerId !== "string" || input.reviewerId.trim().length === 0) {
    throw new Error("buildEvaluatorReview: reviewerId must be a non-empty string");
  }

  validateScores(input);

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

  validateDesignMdViolations(input);
  validateAntiPatternCap(input);

  if (
    typeof input.evidenceRefs.screenshot !== "string" ||
    input.evidenceRefs.screenshot.trim().length === 0
  ) {
    throw new Error("buildEvaluatorReview: evidenceRefs.screenshot must be a non-empty string");
  }
  if (typeof input.evidenceRefs.html !== "string" || input.evidenceRefs.html.trim().length === 0) {
    throw new Error("buildEvaluatorReview: evidenceRefs.html must be a non-empty string");
  }

  return {
    iterIndex: input.iterIndex,
    reviewerId: input.reviewerId,
    scores: { ...input.scores },
    proseCritique: input.proseCritique,
    layoutAntiPatternsDetected: [...input.layoutAntiPatternsDetected],
    designMdViolations: input.designMdViolations.map((v) => ({ kind: v.kind, found: v.found })),
    pivotDirective: input.pivotDirective,
    evidenceRefs: {
      screenshot: input.evidenceRefs.screenshot,
      html: input.evidenceRefs.html,
    },
  };
}
