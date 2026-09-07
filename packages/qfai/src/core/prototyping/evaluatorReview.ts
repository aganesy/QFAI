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
  MAX_ITERATION_INDEX,
  type OrdinalScore,
  type PivotDirective,
} from "./iteration.js";

export const PROSE_CRITIQUE_MIN_WORDS = 200;
export const PROSE_CRITIQUE_MAX_WORDS = 500;

/**
 * QFAI-PROT-002 CJK character band. Japanese-only proseCritique
 * (no whitespace) is accepted when its CJK character count falls in
 * `600..2500`.
 *
 * The band is enforced via {@link validateProseCritiqueBand} as the
 * OR-fallback half of the bilingual rule: a critique passes when EITHER
 * its English word count is in `200..500` words OR its CJK character
 * count is in `600..2500` characters.
 */
export const PROSE_CRITIQUE_MIN_CJK_CHARS = 600;
export const PROSE_CRITIQUE_MAX_CJK_CHARS = 2500;

// CJK Unified Ideographs (U+4E00..U+9FFF), Hiragana (U+3040..U+309F),
// Katakana (U+30A0..U+30FF). Used to discriminate the CJK-only path
// from whitespace-tokenised English in `validateProseCritiqueBand`.
//
// Coverage note: this regex covers Hiragana / Katakana / CJK Unified
// Ideographs (BMP only). CJK Unified Ideographs Extension A
// (U+3400..U+4DBF) and Extension B+ (surrogate-pair ideographs like
// 𠮷 at U+20BB7) are intentionally out of scope for prototyping
// critique heuristics — the bands target everyday Japanese prose,
// which sits inside the BMP. Revisit if Japanese proseCritique
// false-positives appear with rare-kanji-heavy text.
const CJK_CHAR_RE = /[぀-ヿ一-鿿]/u;

function countCjkCharacters(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (CJK_CHAR_RE.test(ch)) n += 1;
  }
  return n;
}

export type ProseCritiqueValidationResult =
  | {
      readonly ok: true;
      readonly measuredWords: number;
      readonly measuredCharacters: number;
    }
  | {
      readonly ok: false;
      readonly measuredWords: number;
      readonly measuredCharacters: number;
      readonly error: string;
    };

/**
 * Validate a proseCritique against the bilingual QFAI-PROT-002 band:
 *   - English path: 200..500 whitespace-separated words.
 *   - CJK path: 600..2500 CJK characters.
 *
 * Returns `ok: true` when EITHER band is satisfied. When neither is
 * satisfied, returns `ok: false` with an error message that names:
 *   - the count form measured (`characters` when the text contains CJK,
 *     otherwise `words`),
 *   - the band used (`600..2500` or `200..500`),
 *   - the actual measured count.
 *
 * Uses `Intl.Segmenter('ja', { granularity: 'word' })` when available
 * to obtain a more accurate Japanese word count for diagnostic
 * purposes; the CJK character count is the authoritative band check.
 */
export function validateProseCritiqueBand(text: string): ProseCritiqueValidationResult {
  const wordCount = countWords(text);
  const cjkCount = countCjkCharacters(text);
  const looksCjk = cjkCount > 0;

  const wordInBand = wordCount >= PROSE_CRITIQUE_MIN_WORDS && wordCount <= PROSE_CRITIQUE_MAX_WORDS;
  const cjkInBand =
    cjkCount >= PROSE_CRITIQUE_MIN_CJK_CHARS && cjkCount <= PROSE_CRITIQUE_MAX_CJK_CHARS;

  if (wordInBand || cjkInBand) {
    return { ok: true, measuredWords: wordCount, measuredCharacters: cjkCount };
  }

  if (looksCjk) {
    return {
      ok: false,
      measuredWords: wordCount,
      measuredCharacters: cjkCount,
      error:
        `proseCritique ${cjkCount} characters outside band ` +
        `${PROSE_CRITIQUE_MIN_CJK_CHARS}..${PROSE_CRITIQUE_MAX_CJK_CHARS}`,
    };
  }

  return {
    ok: false,
    measuredWords: wordCount,
    measuredCharacters: cjkCount,
    error:
      `proseCritique ${wordCount} words outside band ` +
      `${PROSE_CRITIQUE_MIN_WORDS}..${PROSE_CRITIQUE_MAX_WORDS}`,
  };
}

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
 * SSOT for this schema is the shipped reference at
 * `.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`,
 * which `qfai init` installs into every consuming project — the
 * reviewer sub-agent runs there and has to be able to read it.
 *
 * Shape (11 required top-level fields, per that reference):
 *   - top-level discriminators (`specId`, `screenId`, `cycle`,
 *     `sessionStatus`, `retryCount`) identify the (spec, screen, cycle)
 *     triple and the Reviewer Playwright session outcome (the
 *     `sessionStatus` enum mirrors {@link ReviewerSessionStatus} in
 *     `reviewerDispatch.ts`).
 *   - `ordinalAxes` nests the 4 canonical ordinal verdicts.
 *   - `impressions` nests the 6 bounded qualitative prose fields
 *     (each ≤ {@link FEEL_FIELD_MAX_WORDS} words).
 *   - `layoutAntiPatternsDetected` / `designMdViolations` carry the
 *     structural defect arrays that drive convergence and certify.
 *   - `wallTimeSec` records the Reviewer-measured per-session wall
 *     time (number, no upper bound; informational).
 *   - `softWarnings.timeBudget` is a boolean and is true iff
 *     `wallTimeSec` exceeded the per-session NFR cap
 *     ({@link REVIEWER_TIME_BUDGET_SEC}: one (spec, screen) session,
 *     not a per-spec total). The whole
 *     `softWarnings` object is required and closed (single key today;
 *     additional soft-warning channels would extend the nested object,
 *     not flatten new top-level keys).
 *
 * Closed schema: any extra top-level / nested key is rejected so a
 * Reviewer-side typo cannot silently drop a real field.
 *
 * Breaking change vs the prior shape: the legacy flat
 * `timeBudgetSoftWarning?: string` field is removed in favor of the
 * SSOT-compliant `softWarnings.timeBudget: boolean` nested form, and
 * the new required `cycle`, `retryCount`, `wallTimeSec` fields are
 * introduced. Consumers writing review.json files must regenerate;
 * see the project's CHANGELOG entry for migration notes.
 */
export const REVIEWER_SESSION_STATUSES = ["ok", "retryExhausted", "launchFailed"] as const;

export type ReviewerSessionStatus = (typeof REVIEWER_SESSION_STATUSES)[number];

export type ReviewerOrdinalAxes = Record<OrdinalAxis, OrdinalScore>;

export type ReviewerImpressions = Record<FeelField, string>;

export type ReviewerSoftWarnings = {
  readonly timeBudget: boolean;
};

export type ReviewerPayload = {
  readonly specId: string;
  readonly screenId: string;
  readonly cycle: number;
  readonly sessionStatus: ReviewerSessionStatus;
  readonly retryCount: number;
  readonly ordinalAxes: ReviewerOrdinalAxes;
  readonly impressions: ReviewerImpressions;
  readonly layoutAntiPatternsDetected: readonly string[];
  readonly designMdViolations: readonly DesignMdViolation[];
  readonly wallTimeSec: number;
  readonly softWarnings: ReviewerSoftWarnings;
};

export type ParseReviewerPayloadResult =
  | { readonly ok: true; readonly review: ReviewerPayload }
  | { readonly ok: false; readonly errors: readonly string[] };

const REVIEWER_PAYLOAD_KNOWN_KEYS: ReadonlySet<string> = new Set<string>([
  "specId",
  "screenId",
  "cycle",
  "sessionStatus",
  "retryCount",
  "ordinalAxes",
  "impressions",
  "layoutAntiPatternsDetected",
  "designMdViolations",
  "wallTimeSec",
  "softWarnings",
]);

const SOFT_WARNINGS_KNOWN_KEYS: ReadonlySet<string> = new Set<string>(["timeBudget"]);

/**
 * Reviewer wall-time cap in seconds for ONE session — i.e. one
 * `(spec, screen)` pair, since `dispatchReviewerToPair` runs a
 * separate session per pair and each writes its own payload. The cap
 * is deliberately per-session, not per-spec: a payload carries only
 * its own `wallTimeSec`, so a per-spec total is not derivable here and
 * a multi-screen spec would otherwise have to inflate every pair's
 * flag (which this same relation check rejects). Declared by the
 * shipped reference
 * (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`
 * §Field rules). `softWarnings.timeBudget` is `true` iff `wallTimeSec`
 * exceeds this cap — the parser enforces that relation so a payload
 * cannot record a 301-second session with the warning switched off.
 */
export const REVIEWER_TIME_BUDGET_SEC = 300;

function isReviewerSessionStatus(value: unknown): value is ReviewerSessionStatus {
  return (
    typeof value === "string" && (REVIEWER_SESSION_STATUSES as readonly string[]).includes(value)
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
      errors.push(`impressions.${field} exceeds ${FEEL_FIELD_MAX_WORDS} words (got ${wordCount})`);
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

/**
 * Allowed keys of a single `designMdViolations[]` element. The shipped
 * reference declares the payload closed at every level, so an element
 * carrying an unlisted key (e.g. a hand-added `severity`) is a hard
 * failure rather than silently-dropped data.
 */
const DESIGN_MD_VIOLATION_KNOWN_KEYS: ReadonlySet<string> = new Set<string>(["kind", "found"]);

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
  const entries: readonly unknown[] = value;
  for (let i = 0; i < entries.length; i += 1) {
    const entry: unknown = entries[i];
    if (!isRecord(entry)) {
      errors.push(`designMdViolations[${i}] must be an object {kind, found}`);
      continue;
    }
    let entryOk = true;
    for (const key of Object.keys(entry)) {
      if (!DESIGN_MD_VIOLATION_KNOWN_KEYS.has(key)) {
        errors.push(`unknown field: designMdViolations[${i}].${key}`);
        entryOk = false;
      }
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
    if (!entryOk) continue;
    out.push({ kind: kindValue, found: entry.found });
  }
  return out;
}

/**
 * Parse and validate a reviewer-driven per-spec / per-screen review
 * payload against the shipped reference
 * (`.qfai/assistant/skills/qfai-prototyping/references/review-payload-schema.md`).
 *
 * Fail-fast on shape errors but aggregate every named-field violation
 * so callers can render the full diagnostic surface in one pass — the
 * reviewer prompt typically fixes more than one problem per retry.
 *
 * Validation rules (closed schema, 11 required top-level fields):
 *   - `specId` / `screenId` required as non-empty strings
 *   - `cycle` required as an integer in `0..MAX_ITERATION_INDEX`
 *     (currently `0..9`); upper-bound violations are rejected to keep
 *     the closed-schema contract symmetric with the CLI `--cycle` range
 *   - `sessionStatus` required, one of `ok | retryExhausted | launchFailed`
 *     (mirrors {@link ReviewerSessionStatus} in `reviewerDispatch.ts`)
 *   - `retryCount` required as a non-negative integer
 *   - `ordinalAxes` required as a nested record with all 4 axes
 *     (must satisfy {@link isOrdinalScore})
 *   - `impressions` required as a nested record with all 6 `*Feel`
 *     fields (each string, ≤ {@link FEEL_FIELD_MAX_WORDS} words)
 *   - `layoutAntiPatternsDetected` required as string[]
 *   - `designMdViolations` required as array of `{kind, found}`
 *   - `wallTimeSec` required as a non-negative finite number
 *   - `softWarnings` required as a closed nested object with the
 *     single boolean key `timeBudget`, which must equal
 *     `wallTimeSec > {@link REVIEWER_TIME_BUDGET_SEC}` (the reference
 *     defines the flag as derived, not free-standing)
 *   - any extra top-level / nested key is rejected (closed schema;
 *     `designMdViolations[]` elements included — `{kind, found}` only;
 *     protects against typos and schema drift). The legacy flat
 *     `timeBudgetSoftWarning?: string` key is no longer accepted —
 *     callers must use `softWarnings.timeBudget: boolean`.
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

  let cycle: number | null = null;
  if (!("cycle" in input)) {
    errors.push("missing field: cycle");
  } else if (typeof input.cycle !== "number" || !Number.isInteger(input.cycle) || input.cycle < 0) {
    errors.push(`cycle must be a non-negative integer (got ${String(input.cycle)})`);
  } else if (input.cycle > MAX_ITERATION_INDEX) {
    // 13th-wave Fix (codex r3265809796 / r3265811203, MAJOR/MINOR): the CLI
    // contract pins `cycle: 0..MAX_ITERATION_INDEX` (currently 0..9) as the
    // SSOT; the parser must reject upper-bound violations to keep the
    // closed-schema contract symmetric with the enum/range surface. A
    // reviewer sub-agent emitting `cycle: 99` would otherwise propagate
    // through certify with a silently-out-of-range value.
    errors.push(
      `cycle must be <= ${MAX_ITERATION_INDEX} (MAX_ITERATION_INDEX; got ${String(input.cycle)})`,
    );
  } else {
    cycle = input.cycle;
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

  let retryCount: number | null = null;
  if (!("retryCount" in input)) {
    errors.push("missing field: retryCount");
  } else if (
    typeof input.retryCount !== "number" ||
    !Number.isInteger(input.retryCount) ||
    input.retryCount < 0
  ) {
    errors.push(`retryCount must be a non-negative integer (got ${String(input.retryCount)})`);
  } else {
    retryCount = input.retryCount;
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

  let wallTimeSec: number | null = null;
  if (!("wallTimeSec" in input)) {
    errors.push("missing field: wallTimeSec");
  } else if (
    typeof input.wallTimeSec !== "number" ||
    !Number.isFinite(input.wallTimeSec) ||
    input.wallTimeSec < 0
  ) {
    errors.push(
      `wallTimeSec must be a non-negative finite number (got ${String(input.wallTimeSec)})`,
    );
  } else {
    wallTimeSec = input.wallTimeSec;
  }

  let softWarnings: ReviewerSoftWarnings | null = null;
  if (!("softWarnings" in input)) {
    errors.push("missing field: softWarnings");
  } else if (!isRecord(input.softWarnings)) {
    errors.push("softWarnings must be an object");
  } else {
    softWarnings = collectSoftWarnings(input.softWarnings, errors);
  }

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

  // `softWarnings.timeBudget` is not free-standing state: the shipped
  // reference defines it as `wallTimeSec > REVIEWER_TIME_BUDGET_SEC`.
  // Type-checking the boolean alone let a 301-second session persist
  // `timeBudget: false` and carry the over-budget evidence through
  // certify unflagged, so validate the relation here (only once both
  // operands are themselves valid — otherwise the type errors above
  // already describe the payload).
  if (wallTimeSec !== null && softWarnings !== null) {
    const expected = wallTimeSec > REVIEWER_TIME_BUDGET_SEC;
    if (softWarnings.timeBudget !== expected) {
      errors.push(
        `softWarnings.timeBudget must be ${String(expected)} for wallTimeSec ` +
          `${String(wallTimeSec)} (true iff wallTimeSec > ${String(REVIEWER_TIME_BUDGET_SEC)}; ` +
          `got ${String(softWarnings.timeBudget)})`,
      );
    }
  }

  if (
    errors.length > 0 ||
    specId === null ||
    screenId === null ||
    cycle === null ||
    sessionStatus === null ||
    retryCount === null ||
    axes === null ||
    impressions === null ||
    lap === null ||
    dmv === null ||
    wallTimeSec === null ||
    softWarnings === null
  ) {
    return { ok: false, errors };
  }

  const review: ReviewerPayload = {
    specId,
    screenId,
    cycle,
    sessionStatus,
    retryCount,
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
    wallTimeSec,
    softWarnings: { timeBudget: softWarnings.timeBudget },
  };
  return { ok: true, review };
}

function collectSoftWarnings(
  source: Record<string, unknown>,
  errors: string[],
): ReviewerSoftWarnings | null {
  let complete = true;
  let timeBudget: boolean | null = null;
  if (!("timeBudget" in source)) {
    errors.push("missing field: softWarnings.timeBudget");
    complete = false;
  } else if (typeof source.timeBudget !== "boolean") {
    errors.push(`softWarnings.timeBudget must be a boolean (got ${String(source.timeBudget)})`);
    complete = false;
  } else {
    timeBudget = source.timeBudget;
  }
  for (const key of Object.keys(source)) {
    if (!SOFT_WARNINGS_KNOWN_KEYS.has(key)) {
      errors.push(`unknown field: softWarnings.${key}`);
      complete = false;
    }
  }
  if (!complete || timeBudget === null) return null;
  return { timeBudget };
}
