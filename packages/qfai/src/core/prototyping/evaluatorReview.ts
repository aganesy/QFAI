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

/**
 * Maximum word count per qualitative `*Feel` field on the
 * reviewer-driven per-spec / per-screen payload schema.
 *
 * Each `*Feel` field is rejected when its word count exceeds this bound.
 * 1 word and exactly 200 words are both accepted.
 */
export const FEEL_FIELD_MAX_WORDS = 200;

export const ORDINAL_AXES = [
  "informationArchitecture",
  "navigationFlow",
  "usability",
  "functionality",
] as const;

export type OrdinalAxis = (typeof ORDINAL_AXES)[number];

/**
 * Qualitative prose-feel fields surfaced by the reviewer on each
 * per-spec / per-screen review payload. Each field is bounded by
 * {@link FEEL_FIELD_MAX_WORDS}.
 */
export const FEEL_FIELDS = [
  "operability",
  "transitionFeel",
  "crossScreenContinuity",
  "userStoryFeel",
  "acceptanceCriteriaFeel",
  "menuReachabilityFeel",
] as const;

export type FeelField = (typeof FEEL_FIELDS)[number];

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

/**
 * Reviewer-driven per-spec / per-screen review payload.
 *
 * This is the schema written to
 * `iter-NN/spec-NNNN/<screen>.review.json` by the product-surface
 * reviewer sub-agent and consumed by the prototyping CLI loop. The
 * SSOT for this schema is the prototyping CLI contract at
 * `.qfai/contracts/cli/qfai-prototyping.md` (§Review payload).
 *
 * Shape:
 *   - top-level discriminators (`specId`, `screenId`, `sessionStatus`)
 *     identify the (spec, screen) pair and the Reviewer Playwright
 *     session outcome (the `sessionStatus` enum mirrors
 *     {@link ReviewerSessionStatus} in `reviewerDispatch.ts`).
 *   - `ordinalAxes` nests the 4 canonical ordinal verdicts.
 *   - `impressions` nests the 6 bounded qualitative prose fields
 *     (each ≤ {@link FEEL_FIELD_MAX_WORDS} words).
 *   - `layoutAntiPatternsDetected` / `designMdViolations` carry the
 *     structural defect arrays that drive convergence and certify.
 *   - `timeBudgetSoftWarning` is optional and only present when the
 *     per-spec time budget overruns — its presence never hard-fails
 *     the cycle; only the global iteration budget can stop the run.
 *
 * Closed schema: any extra top-level / nested key is rejected so a
 * Reviewer-side typo cannot silently drop a real field.
 */
export const REVIEWER_SESSION_STATUSES = ["ok", "retryExhausted", "launchFailed"] as const;

export type ReviewerSessionStatus = (typeof REVIEWER_SESSION_STATUSES)[number];

export type ReviewerOrdinalAxes = Record<OrdinalAxis, OrdinalScore>;

export type ReviewerImpressions = Record<FeelField, string>;

export type ReviewerPayload = {
  readonly specId: string;
  readonly screenId: string;
  readonly sessionStatus: ReviewerSessionStatus;
  readonly ordinalAxes: ReviewerOrdinalAxes;
  readonly impressions: ReviewerImpressions;
  readonly layoutAntiPatternsDetected: readonly string[];
  readonly designMdViolations: readonly DesignMdViolation[];
  readonly timeBudgetSoftWarning?: string;
};

export type ParseReviewerPayloadResult =
  | { readonly ok: true; readonly review: ReviewerPayload }
  | { readonly ok: false; readonly errors: readonly string[] };

const REVIEWER_PAYLOAD_KNOWN_KEYS: ReadonlySet<string> = new Set<string>([
  "specId",
  "screenId",
  "sessionStatus",
  "ordinalAxes",
  "impressions",
  "layoutAntiPatternsDetected",
  "designMdViolations",
  "timeBudgetSoftWarning",
]);

function isReviewerSessionStatus(value: unknown): value is ReviewerSessionStatus {
  return (
    typeof value === "string" &&
    (REVIEWER_SESSION_STATUSES as readonly string[]).includes(value)
  );
}

function collectImpressions(
  source: Record<string, unknown>,
  errors: string[],
): ReviewerImpressions | null {
  const accepted: Partial<Record<FeelField, string>> = {};
  let complete = true;
  for (const field of FEEL_FIELDS) {
    if (!(field in source)) {
      errors.push(`missing field: impressions.${field}`);
      complete = false;
      continue;
    }
    const value = source[field];
    if (typeof value !== "string") {
      errors.push(`impressions.${field} must be a string`);
      complete = false;
      continue;
    }
    const wordCount = countWords(value);
    if (wordCount > FEEL_FIELD_MAX_WORDS) {
      errors.push(
        `impressions.${field} exceeds ${FEEL_FIELD_MAX_WORDS} words (got ${wordCount})`,
      );
      complete = false;
      continue;
    }
    accepted[field] = value;
  }
  for (const key of Object.keys(source)) {
    if (!(FEEL_FIELDS as readonly string[]).includes(key)) {
      errors.push(`unknown field: impressions.${key}`);
      complete = false;
    }
  }
  if (!complete) return null;
  if (!isCompleteFeelRecord(accepted)) return null;
  return accepted;
}

function isCompleteFeelRecord(
  value: Partial<Record<FeelField, string>>,
): value is Record<FeelField, string> {
  return FEEL_FIELDS.every((field) => typeof value[field] === "string");
}

function collectOrdinalAxes(
  source: Record<string, unknown>,
  errors: string[],
): ReviewerOrdinalAxes | null {
  const accepted: Partial<Record<OrdinalAxis, OrdinalScore>> = {};
  let complete = true;
  for (const axis of ORDINAL_AXES) {
    if (!(axis in source)) {
      errors.push(`missing field: ordinalAxes.${axis}`);
      complete = false;
      continue;
    }
    const value = source[axis];
    if (!isOrdinalScore(value)) {
      errors.push(
        `ordinalAxes.${axis} must be one of weak|acceptable|strong|exceptional (got ${String(value)})`,
      );
      complete = false;
      continue;
    }
    accepted[axis] = value;
  }
  for (const key of Object.keys(source)) {
    if (!(ORDINAL_AXES as readonly string[]).includes(key)) {
      errors.push(`unknown field: ordinalAxes.${key}`);
      complete = false;
    }
  }
  if (!complete) return null;
  if (!isCompleteAxisRecord(accepted)) return null;
  return accepted;
}

function isCompleteAxisRecord(
  value: Partial<Record<OrdinalAxis, OrdinalScore>>,
): value is Record<OrdinalAxis, OrdinalScore> {
  return ORDINAL_AXES.every((axis) => isOrdinalScore(value[axis]));
}

function pushLapErrors(
  record: Record<string, unknown>,
  errors: string[],
): readonly string[] | null {
  if (!("layoutAntiPatternsDetected" in record)) {
    errors.push("missing field: layoutAntiPatternsDetected");
    return null;
  }
  const value = record.layoutAntiPatternsDetected;
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    errors.push("layoutAntiPatternsDetected must be a string array");
    return null;
  }
  return value.filter((v): v is string => typeof v === "string");
}

function isDesignMdViolationKind(value: string): value is DesignMdViolation["kind"] {
  return VIOLATION_KINDS.has(value);
}

function pushDmvErrors(
  record: Record<string, unknown>,
  errors: string[],
): readonly DesignMdViolation[] | null {
  if (!("designMdViolations" in record)) {
    errors.push("missing field: designMdViolations");
    return null;
  }
  const value = record.designMdViolations;
  if (!Array.isArray(value)) {
    errors.push("designMdViolations must be an array");
    return null;
  }
  const out: DesignMdViolation[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const entry = value[i];
    if (!isRecord(entry)) {
      errors.push(`designMdViolations[${i}] must be an object {kind, found}`);
      continue;
    }
    const kindValue = entry.kind;
    if (typeof kindValue !== "string" || !isDesignMdViolationKind(kindValue)) {
      errors.push(
        `designMdViolations[${i}].kind must be one of color|font|radius|shadow (got ${String(kindValue)})`,
      );
      continue;
    }
    if (typeof entry.found !== "string") {
      errors.push(`designMdViolations[${i}].found must be a string`);
      continue;
    }
    out.push({ kind: kindValue, found: entry.found });
  }
  return out;
}

/**
 * Parse and validate a reviewer-driven per-spec / per-screen review
 * payload against the prototyping CLI contract
 * (`.qfai/contracts/cli/qfai-prototyping.md` §Review payload).
 *
 * Fail-fast on shape errors but aggregate every named-field violation
 * so callers can render the full diagnostic surface in one pass — the
 * reviewer prompt typically fixes more than one problem per retry.
 *
 * Validation rules (closed schema):
 *   - `specId` / `screenId` required as non-empty strings
 *   - `sessionStatus` required, one of `ok | retryExhausted | launchFailed`
 *     (mirrors {@link ReviewerSessionStatus} in `reviewerDispatch.ts`)
 *   - `ordinalAxes` required as a nested record with all 4 axes
 *     (must satisfy {@link isOrdinalScore})
 *   - `impressions` required as a nested record with all 6 `*Feel`
 *     fields (each string, ≤ {@link FEEL_FIELD_MAX_WORDS} words)
 *   - `layoutAntiPatternsDetected` required as string[]
 *   - `designMdViolations` required as array of `{kind, found}`
 *   - `timeBudgetSoftWarning` is optional; presence is soft-only and
 *     never blocks the cycle
 *   - any extra top-level / nested key is rejected (closed schema;
 *     protects against typos and schema drift)
 *
 * `menuReachabilityFeel` describing unreachable menu entries is
 * accepted — it is a qualitative critique field, not a hard-fail
 * gate.
 */
export function parseEvaluatorReview(input: unknown): ParseReviewerPayloadResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["review payload must be a JSON object"] };
  }

  let specId: string | null = null;
  if (!("specId" in input)) {
    errors.push("missing field: specId");
  } else if (typeof input.specId !== "string" || input.specId.trim().length === 0) {
    errors.push("specId must be a non-empty string");
  } else {
    specId = input.specId;
  }

  let screenId: string | null = null;
  if (!("screenId" in input)) {
    errors.push("missing field: screenId");
  } else if (typeof input.screenId !== "string" || input.screenId.trim().length === 0) {
    errors.push("screenId must be a non-empty string");
  } else {
    screenId = input.screenId;
  }

  let sessionStatus: ReviewerSessionStatus | null = null;
  if (!("sessionStatus" in input)) {
    errors.push("missing field: sessionStatus");
  } else if (!isReviewerSessionStatus(input.sessionStatus)) {
    errors.push(
      `sessionStatus must be one of ok|retryExhausted|launchFailed (got ${String(input.sessionStatus)})`,
    );
  } else {
    sessionStatus = input.sessionStatus;
  }

  let axes: ReviewerOrdinalAxes | null = null;
  if (!("ordinalAxes" in input)) {
    errors.push("missing field: ordinalAxes");
  } else if (!isRecord(input.ordinalAxes)) {
    errors.push("ordinalAxes must be an object");
  } else {
    axes = collectOrdinalAxes(input.ordinalAxes, errors);
  }

  let impressions: ReviewerImpressions | null = null;
  if (!("impressions" in input)) {
    errors.push("missing field: impressions");
  } else if (!isRecord(input.impressions)) {
    errors.push("impressions must be an object");
  } else {
    impressions = collectImpressions(input.impressions, errors);
  }

  const lap = pushLapErrors(input, errors);
  const dmv = pushDmvErrors(input, errors);

  // Note: missing-field and unknown-field diagnostics are surfaced
  // independently and can co-occur on the same input. When the unknown
  // key is a typo of a missing expected key, the caller sees both
  // `missing field: <expected>` and `unknown field: <typo>` in the
  // same `errors[]`. Intentional: aggregate every violation so the
  // reviewer prompt can fix more than one issue per retry.
  for (const key of Object.keys(input)) {
    if (!REVIEWER_PAYLOAD_KNOWN_KEYS.has(key)) {
      errors.push(`unknown field: ${key}`);
    }
  }

  let timeBudgetSoftWarning: string | undefined;
  if ("timeBudgetSoftWarning" in input) {
    const value = input.timeBudgetSoftWarning;
    if (typeof value !== "string") {
      errors.push("timeBudgetSoftWarning must be a string when present");
    } else {
      timeBudgetSoftWarning = value;
    }
  }

  if (
    errors.length > 0 ||
    specId === null ||
    screenId === null ||
    sessionStatus === null ||
    axes === null ||
    impressions === null ||
    lap === null ||
    dmv === null
  ) {
    return { ok: false, errors };
  }

  const review: ReviewerPayload = {
    specId,
    screenId,
    sessionStatus,
    ordinalAxes: {
      informationArchitecture: axes.informationArchitecture,
      navigationFlow: axes.navigationFlow,
      usability: axes.usability,
      functionality: axes.functionality,
    },
    impressions: {
      operability: impressions.operability,
      transitionFeel: impressions.transitionFeel,
      crossScreenContinuity: impressions.crossScreenContinuity,
      userStoryFeel: impressions.userStoryFeel,
      acceptanceCriteriaFeel: impressions.acceptanceCriteriaFeel,
      menuReachabilityFeel: impressions.menuReachabilityFeel,
    },
    layoutAntiPatternsDetected: [...lap],
    designMdViolations: dmv.map((v) => ({ kind: v.kind, found: v.found })),
    ...(timeBudgetSoftWarning !== undefined ? { timeBudgetSoftWarning } : {}),
  };
  return { ok: true, review };
}
