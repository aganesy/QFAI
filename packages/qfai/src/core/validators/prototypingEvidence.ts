/**
 * Prototyping evidence validator.
 *
 * Validates `.qfai/evidence/prototyping/prototyping.json` for the
 * single-thread iteration loop.
 *
 * Error codes:
 *   QFAI-PROT-001  prototyping.json missing or unparseable
 *   QFAI-PROT-002  iteration field shape and score/prose invariants, plus
 *                  the reviewer-deliverable gate on `iter-NN/review.json`
 *                  (presence, schema, and agreement with the mirrored
 *                  `iterations[N]`) — see `validateReviewArtifacts`
 *   QFAI-PROT-003  iterations[] must contain at least iter-00
 *   QFAI-PROT-004  iterations[i].index must equal i (contiguous from 0)
 *   QFAI-PROT-005  stopReason consistency:
 *                    stopReason="max-iterations" requires last iter.index===9
 *                    stopReason="axes-exceptional" requires latest iter to
 *                      have all 4 axes exceptional,
 *                      layoutAntiPatternsDetected=[] AND
 *                      designMdViolations=[]
 *   QFAI-PROT-006  iterations.length exceeds MAX_ITERATIONS (10)
 *   QFAI-PROT-007  acceptedIterationIndex must equal iterations.length - 1
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";
import { resolvePrimaryPrototypingSpec } from "../prototyping/specResolution.js";
import {
  EVIDENCE_REF_KINDS,
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  SEED_REVIEWER_ID,
  isOrdinalScore,
  isPivotDirective,
  isStopReason,
  iterationDir,
  iterationReviewPath,
} from "../prototyping/iteration.js";

import { validateProseCritiqueBand } from "../prototyping/evaluatorReview.js";
import { PROTOTYPING_JSON_REL } from "../prototyping/paths.js";
import { loadLayoutAntiPatterns } from "./layoutAntiPatterns.js";
import { SAFE_SCREEN_ID_PATTERN } from "./uiEvidenceArtifacts.js";

const PROTO_JSON_REL = PROTOTYPING_JSON_REL;

/**
 * The four ordinal UX axes, in the order the reviewer contract lists
 * them. Read by both the mirror shape loop and the `review.json` pass
 * so an axis cannot be checked on one surface and skipped on the other.
 */
const ORDINAL_AXIS_NAMES = [
  "informationArchitecture",
  "navigationFlow",
  "usability",
  "functionality",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

const DESIGN_MD_VIOLATION_KINDS: ReadonlySet<string> = new Set([
  "color",
  "font",
  "radius",
  "shadow",
]);

function isViolationArray(value: unknown): value is ReadonlyArray<{ kind: string; found: string }> {
  if (!Array.isArray(value)) return false;
  for (const entry of value) {
    if (!isRecord(entry)) return false;
    if (typeof entry.kind !== "string" || !DESIGN_MD_VIOLATION_KINDS.has(entry.kind)) {
      return false;
    }
    if (typeof entry.found !== "string") return false;
  }
  return true;
}

function hasExceptionalStopShape(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.scores)) return false;
  if (!isStringArray(value.layoutAntiPatternsDetected)) return false;
  if (!Array.isArray(value.designMdViolations)) return false;
  return (
    value.scores.informationArchitecture === "exceptional" &&
    value.scores.navigationFlow === "exceptional" &&
    value.scores.usability === "exceptional" &&
    value.scores.functionality === "exceptional" &&
    value.layoutAntiPatternsDetected.length === 0 &&
    value.designMdViolations.length === 0
  );
}

export async function validatePrototypingEvidence(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const protoJsonAbs = path.join(root, PROTO_JSON_REL);

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(protoJsonAbs, "utf-8"));
  } catch {
    try {
      // re-read to distinguish missing vs unparseable
      await readFile(protoJsonAbs, "utf-8");
    } catch {
      if (await resolvePrimaryPrototypingSpec(root, config)) {
        issues.push(
          issue(
            "QFAI-PROT-001",
            "prototyping.json is missing for the primary UI-bearing prototyping spec.",
            "error",
            PROTO_JSON_REL,
            "prototypingEvidence.missing",
          ),
        );
      }
      return issues;
    }
    issues.push(
      issue(
        "QFAI-PROT-001",
        "prototyping.json is unparseable.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.parse",
      ),
    );
    return issues;
  }

  if (!isRecord(parsed)) {
    issues.push(
      issue(
        "QFAI-PROT-001",
        "prototyping.json must be a JSON object.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.shape",
      ),
    );
    return issues;
  }

  const r = parsed;

  if (!isStringArray(r.specsCovered)) {
    issues.push(
      issue(
        "QFAI-PROT-002",
        "prototyping.json specsCovered[] must be a string array.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.specsCovered",
      ),
    );
  }

  const iterations = Array.isArray(r.iterations) ? (r.iterations as unknown[]) : null;
  if (iterations === null) {
    issues.push(
      issue(
        "QFAI-PROT-003",
        "prototyping.json iterations[] must be an array (and contain at least iter-00).",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.iterations",
      ),
    );
    return issues;
  }
  if (iterations.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-003",
        "prototyping.json iterations[] must contain at least iter-00.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.iterations",
      ),
    );
    return issues;
  }
  if (iterations.length > MAX_ITERATIONS) {
    issues.push(
      issue(
        "QFAI-PROT-006",
        `iterations.length (${iterations.length}) exceeds MAX_ITERATIONS (${MAX_ITERATIONS}).`,
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.iterations.length",
      ),
    );
  }

  // Per-iter shape + index contiguity
  for (let i = 0; i < iterations.length; i += 1) {
    const it = iterations[i];
    if (!isRecord(it)) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}] must be an object.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.iterShape",
        ),
      );
      continue;
    }
    if (it.index !== i) {
      issues.push(
        issue(
          "QFAI-PROT-004",
          `iterations[${i}].index must be ${i} (got ${JSON.stringify(it.index)}).`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.indexContiguity",
        ),
      );
    }
    if (typeof it.commitSha !== "string" || it.commitSha.length === 0) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}].commitSha must be a non-empty string.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.commitSha",
        ),
      );
    }
    if (typeof it.proseCritique !== "string" || it.proseCritique.trim().length === 0) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}].proseCritique must be a non-empty 200-500 English word (or 600-2500 Japanese/Chinese character) string.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.proseCritique",
        ),
      );
    } else {
      const band = validateProseCritiqueBand(it.proseCritique);
      if (!band.ok) {
        issues.push(
          issue(
            "QFAI-PROT-002",
            `iterations[${i}].proseCritique must be 200-500 English words or 600-2500 Japanese/Chinese characters (${band.error}).`,
            "error",
            PROTO_JSON_REL,
            "prototypingEvidence.proseCritique.wordCount",
          ),
        );
      }
    }
    if (!isRecord(it.scores)) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}].scores must be an object.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.scores",
        ),
      );
      continue;
    }
    for (const axis of ORDINAL_AXIS_NAMES) {
      if (!isOrdinalScore(it.scores[axis])) {
        issues.push(
          issue(
            "QFAI-PROT-002",
            `iterations[${i}].scores.${axis} must be one of weak|acceptable|strong|exceptional (got ${JSON.stringify(it.scores[axis])}).`,
            "error",
            PROTO_JSON_REL,
            `prototypingEvidence.scores.${axis}`,
          ),
        );
      }
    }
    if (!isPivotDirective(it.pivotDirective)) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}].pivotDirective must be one of continue|refine|pivot.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.pivotDirective",
        ),
      );
    }
    if (!isStringArray(it.layoutAntiPatternsDetected)) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}].layoutAntiPatternsDetected must be a string array.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.layoutAntiPatternsDetected",
        ),
      );
    } else if (
      it.layoutAntiPatternsDetected.length > 0 &&
      (it.scores.informationArchitecture === "strong" ||
        it.scores.informationArchitecture === "exceptional")
    ) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}].scores.informationArchitecture must be weak|acceptable when layoutAntiPatternsDetected[] is non-empty.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.scores.informationArchitecture.layoutAntiPatternCap",
        ),
      );
    }
    if (!isViolationArray(it.designMdViolations)) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}].designMdViolations must be an array of {kind, found} records with kind in color|font|radius|shadow.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.designMdViolations",
        ),
      );
    }
  }

  issues.push(...(await validateReviewArtifacts(root, iterations)));

  // acceptedIterationIndex must equal iterations.length - 1 (no best-of-history)
  if (typeof r.acceptedIterationIndex !== "number") {
    issues.push(
      issue(
        "QFAI-PROT-007",
        "acceptedIterationIndex must be a number.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.acceptedIterationIndex",
      ),
    );
  } else if (r.acceptedIterationIndex !== iterations.length - 1) {
    issues.push(
      issue(
        "QFAI-PROT-007",
        `acceptedIterationIndex (${r.acceptedIterationIndex}) must equal iterations.length - 1 (${iterations.length - 1}); the latest iteration is always accepted.`,
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.acceptedIterationIndex",
      ),
    );
  }

  // stopReason consistency. Distinguish three cases (PR #206 review LWrk):
  //   1. Missing field entirely → required field error with actionable
  //      message ("add stopReason: null/...").
  //   2. Field present but value out of enum → value error with the raw
  //      JSON-rendered value so the user sees the literal that failed.
  //   3. Field present with valid value → silent.
  const stopReasonPresent = "stopReason" in r;
  const stopReason = stopReasonPresent ? r.stopReason : undefined;
  if (!stopReasonPresent) {
    issues.push(
      issue(
        "QFAI-PROT-005",
        'stopReason field is required: set null while running, "axes-exceptional" | "max-iterations" | "license-verify-fail" | "input-error" once stopped.',
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.stopReasonRequired",
      ),
    );
  } else if (stopReason !== null && !isStopReason(stopReason)) {
    issues.push(
      issue(
        "QFAI-PROT-005",
        `stopReason must be null | "axes-exceptional" | "max-iterations" | "license-verify-fail" | "input-error" (got ${JSON.stringify(stopReason)}).`,
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.stopReason",
      ),
    );
  }
  const last = iterations[iterations.length - 1];
  if (stopReason === "max-iterations") {
    if (!isRecord(last) || last.index !== MAX_ITERATION_INDEX) {
      issues.push(
        issue(
          "QFAI-PROT-005",
          `stopReason="max-iterations" requires last iter.index === ${MAX_ITERATION_INDEX}.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.stopReasonConsistency",
        ),
      );
    }
  }
  if (stopReason === "axes-exceptional" && last) {
    if (!hasExceptionalStopShape(last)) {
      issues.push(
        issue(
          "QFAI-PROT-005",
          `stopReason="axes-exceptional" requires the latest iter to have all 4 axes exceptional, layoutAntiPatternsDetected=[] AND designMdViolations=[].`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.stopReasonConsistency",
        ),
      );
    }
  }

  return issues;
}

/**
 * Reviewer-deliverable gate: `iter-NN/review.json`.
 *
 * `prototyping.json#iterations[]` is a MIRROR. The reviewer writes
 * `iter-NN/review.json`; the orchestrator transcribes it into
 * `iterations[N]`. Only the transcription was validated, so everything
 * on the reviewer's side of that step was unchecked: a `review.json`
 * could name an anti-pattern code no registry declares, carry an
 * out-of-enum score, disagree with the mirror, or be deleted outright,
 * and `validate` still returned `error=0`. The gate meant to prove the
 * reviewer ran could not tell whether the reviewer ran.
 *
 * Three obligations, all reported as `QFAI-PROT-002` — the code the
 * skill already documents for this gate, and one this module already
 * owns. `ruleCodeUniqueness` allows a code exactly one owning module,
 * so the checks live here rather than in a sibling validator.
 *
 *   1. presence — a reviewed iteration has a parseable `review.json`;
 *   2. schema   — its payload matches the reviewer contract in
 *                 `references/reviewer-prompt.md`, enums included, with
 *                 `layoutAntiPatternsDetected[]` checked against the
 *                 `lap-*` registry instead of accepted as any string;
 *   3. mirror   — the transcribed `iterations[N]` agrees with it.
 *
 * (3) is the one neither surface could catch alone: a transcription
 * that drops, reorders or paraphrases a field leaves two internally
 * consistent files that disagree with each other, and each passes its
 * own checks.
 *
 * The cycle-0 seed is exempt from all three. It carries
 * `reviewerId === SEED_REVIEWER_ID` and exists precisely because no
 * reviewer has run yet, so demanding a reviewer artifact from it would
 * fail every project in the window between `iterate` and the first
 * review. The exemption is a positive claim, not a default: an
 * iteration that omits `reviewerId`, or names any other reviewer, owes
 * the full set.
 */
async function validateReviewArtifacts(
  root: string,
  iterations: readonly unknown[],
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const knownLapIds = loadKnownLapIds();
  for (let i = 0; i < iterations.length; i += 1) {
    const mirror = iterations[i];
    // A non-object iteration is already reported by the shape loop; a
    // second finding on the same record would only add noise.
    if (!isRecord(mirror)) continue;
    if (mirror.reviewerId === SEED_REVIEWER_ID) continue;
    const rel = iterationReviewPath(i);
    let raw: string;
    try {
      raw = await readFile(path.join(root, rel), "utf-8");
    } catch {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `iterations[${i}] records a review but ${rel} is missing. The reviewer writes that file and iterations[${i}] mirrors it; a mirror with no reviewer artifact behind it cannot be checked. Re-run the reviewer for ${iterationDir(i)}, or drop the iteration.`,
          "error",
          rel,
          "prototypingEvidence.review.missing",
        ),
      );
      continue;
    }
    let review: unknown;
    try {
      review = JSON.parse(raw);
    } catch {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `${rel} is unparseable JSON.`,
          "error",
          rel,
          "prototypingEvidence.review.parse",
        ),
      );
      continue;
    }
    if (!isRecord(review)) {
      issues.push(
        issue(
          "QFAI-PROT-002",
          `${rel} must be a JSON object.`,
          "error",
          rel,
          "prototypingEvidence.review.shape",
        ),
      );
      continue;
    }
    issues.push(...reviewSchemaIssues(i, rel, review, knownLapIds));
    issues.push(...mirrorAgreementIssues(i, rel, review, mirror));
  }
  return issues;
}

/**
 * The declared `lap-*` ids, or `undefined` when the registry cannot be
 * read.
 *
 * `loadLayoutAntiPatterns` throws when its JSON is missing or
 * unparseable and documents fail-soft as the caller's job. Failing soft
 * here means dropping the unknown-code obligation: an install that
 * cannot see its own registry must not turn every id in a valid
 * `review.json` into an error, which is the inversion an empty-set
 * fallback would produce.
 */
function loadKnownLapIds(): ReadonlySet<string> | undefined {
  try {
    return new Set(loadLayoutAntiPatterns().map((pattern) => pattern.id));
  } catch {
    return undefined;
  }
}

/** Emit one `QFAI-PROT-002` finding about the review under inspection. */
type ReportReviewIssue = (message: string, source: string) => void;

function reviewSchemaIssues(
  index: number,
  rel: string,
  review: Record<string, unknown>,
  knownLapIds: ReadonlySet<string> | undefined,
): Issue[] {
  const issues: Issue[] = [];
  const report: ReportReviewIssue = (message, source) => {
    issues.push(issue("QFAI-PROT-002", `${rel} ${message}`, "error", rel, source));
  };

  if (review.iterIndex !== index) {
    report(
      `iterIndex must be ${index} (got ${JSON.stringify(review.iterIndex)}); this is the review for ${iterationDir(index)}.`,
      "prototypingEvidence.review.iterIndex",
    );
  }
  if (typeof review.reviewerId !== "string" || review.reviewerId.trim().length === 0) {
    report("reviewerId must be a non-empty string.", "prototypingEvidence.review.reviewerId");
  }
  reportReviewScores(review.scores, report);
  reportReviewProse(review.proseCritique, report);
  reportReviewAntiPatterns(review.layoutAntiPatternsDetected, knownLapIds, report);
  if (!isViolationArray(review.designMdViolations)) {
    report(
      "designMdViolations must be an array of {kind, found} records with kind in color|font|radius|shadow.",
      "prototypingEvidence.review.designMdViolations",
    );
  }
  if (!isPivotDirective(review.pivotDirective)) {
    report(
      `pivotDirective must be one of continue|refine|pivot (got ${JSON.stringify(review.pivotDirective)}).`,
      "prototypingEvidence.review.pivotDirective",
    );
  }
  reportReviewEvidenceRefs(review.evidenceRefs, report);
  return issues;
}

function reportReviewScores(scores: unknown, report: ReportReviewIssue): void {
  if (!isRecord(scores)) {
    report("scores must be an object.", "prototypingEvidence.review.scores");
    return;
  }
  for (const axis of ORDINAL_AXIS_NAMES) {
    if (!isOrdinalScore(scores[axis])) {
      report(
        `scores.${axis} must be one of weak|acceptable|strong|exceptional (got ${JSON.stringify(scores[axis])}).`,
        `prototypingEvidence.review.scores.${axis}`,
      );
    }
  }
}

function reportReviewProse(proseCritique: unknown, report: ReportReviewIssue): void {
  if (typeof proseCritique !== "string" || proseCritique.trim().length === 0) {
    report(
      "proseCritique must be a non-empty 200-500 English word (or 600-2500 Japanese/Chinese character) string.",
      "prototypingEvidence.review.proseCritique",
    );
    return;
  }
  const band = validateProseCritiqueBand(proseCritique);
  if (!band.ok) {
    report(
      `proseCritique must be 200-500 English words or 600-2500 Japanese/Chinese characters (${band.error}).`,
      "prototypingEvidence.review.proseCritique.wordCount",
    );
  }
}

function reportReviewAntiPatterns(
  detected: unknown,
  knownLapIds: ReadonlySet<string> | undefined,
  report: ReportReviewIssue,
): void {
  if (!isStringArray(detected)) {
    report(
      "layoutAntiPatternsDetected must be a string array.",
      "prototypingEvidence.review.layoutAntiPatternsDetected",
    );
    return;
  }
  if (knownLapIds === undefined) return;
  for (const id of detected) {
    if (!knownLapIds.has(id)) {
      report(
        `layoutAntiPatternsDetected contains ${JSON.stringify(id)}, which no lap-* registry entry declares.`,
        "prototypingEvidence.review.layoutAntiPatternsDetected.unknownCode",
      );
    }
  }
}

function reportReviewEvidenceRefs(refs: unknown, report: ReportReviewIssue): void {
  if (!isRecord(refs)) {
    report("evidenceRefs must be an object.", "prototypingEvidence.review.evidenceRefs");
    return;
  }
  for (const kind of EVIDENCE_REF_KINDS) {
    const value = refs[kind];
    if (typeof value !== "string" || value.trim().length === 0) {
      report(
        `evidenceRefs.${kind} must be a non-empty repository-relative artifact path.`,
        `prototypingEvidence.review.evidenceRefs.${kind}`,
      );
    }
  }
}

/**
 * Top-level fields the orchestrator transcribes verbatim from
 * `review.json` into `prototyping.json#iterations[N]`.
 *
 * `scores` and `evidenceRefs` are compared leaf by leaf instead (see
 * {@link mirrorAgreementIssues}) so the finding names the exact axis or
 * ref kind that diverged rather than dumping both objects.
 */
const MIRRORED_REVIEW_FIELDS = [
  "proseCritique",
  "pivotDirective",
  "layoutAntiPatternsDetected",
  "designMdViolations",
] as const;

/**
 * A comparable rendering of one mirrored field.
 *
 * Array order is part of the comparison on purpose:
 * `layoutAntiPatternsDetected` and `designMdViolations` are ordered
 * evidence, and a transcription that reorders them no longer mirrors
 * the file it cites. Comparing them as sets would accept exactly the
 * silent rewrite this check exists to find.
 *
 * `designMdViolations` is projected onto its two declared keys in a
 * fixed order first: a transcription that writes `{found, kind}` where
 * the reviewer wrote `{kind, found}` mirrors the record faithfully, and
 * raw `JSON.stringify` would call that a mismatch.
 */
function canonicalMirrorValue(field: string, value: unknown): string {
  if (field === "designMdViolations" && isViolationArray(value)) {
    return JSON.stringify(value.map((entry) => [entry.kind, entry.found]));
  }
  return JSON.stringify(value);
}

function mirrorAgreementIssues(
  index: number,
  rel: string,
  review: Record<string, unknown>,
  mirror: Record<string, unknown>,
): Issue[] {
  const issues: Issue[] = [];
  const report = (field: string, reviewValue: unknown, mirrorValue: unknown): void => {
    issues.push(
      issue(
        "QFAI-PROT-002",
        `iterations[${index}].${field} does not mirror ${rel}: prototyping.json has ${JSON.stringify(mirrorValue)}, ${rel} has ${JSON.stringify(reviewValue)}. iterations[] is a transcription of the reviewer's file, so the reviewer's value is the one to keep.`,
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.review.mirrorMismatch",
      ),
    );
  };

  // A field absent from either side is that side's own shape defect and
  // is reported by the pass that owns it. Comparing it here would
  // restate the same gap as a disagreement.
  for (const field of MIRRORED_REVIEW_FIELDS) {
    if (!(field in review) || !(field in mirror)) continue;
    if (canonicalMirrorValue(field, review[field]) !== canonicalMirrorValue(field, mirror[field])) {
      report(field, review[field], mirror[field]);
    }
  }

  const reviewScores = review.scores;
  const mirrorScores = mirror.scores;
  if (isRecord(reviewScores) && isRecord(mirrorScores)) {
    for (const axis of ORDINAL_AXIS_NAMES) {
      if (reviewScores[axis] !== mirrorScores[axis]) {
        report(`scores.${axis}`, reviewScores[axis], mirrorScores[axis]);
      }
    }
  }

  const reviewRefs = review.evidenceRefs;
  const mirrorRefs = mirror.evidenceRefs;
  if (isRecord(reviewRefs) && isRecord(mirrorRefs)) {
    for (const kind of EVIDENCE_REF_KINDS) {
      if (reviewRefs[kind] !== mirrorRefs[kind]) {
        report(`evidenceRefs.${kind}`, reviewRefs[kind], mirrorRefs[kind]);
      }
    }
  }

  return issues;
}

/**
 * Canonical screen-contract id shape, as shipped by
 * `qfai-discussion/templates/uiux/40_screen_contracts.md` (`SCR-001`) and as
 * produced by `contracts/screenContracts.ts#slugifyScreenId`.
 */
const CANONICAL_SCREEN_ID_PATTERN = /^[A-Z]{2,4}-\d{2,4}$/u;

/**
 * True when the id is either the canonical `SCR-001` contract form, or
 * path-safe and free of hyphens.
 *
 * Derived from `SAFE_SCREEN_ID_PATTERN` rather than re-encoded, so the two
 * cannot drift: an id this accepts is always one the evidence-path constraints
 * accept. The one deliberate narrowing is the hyphen. `SAFE_SCREEN_ID_PATTERN`
 * permits it because a hyphen is path-safe, which is all that validator needs;
 * here a bare `home-page` would be ambiguous against the canonical
 * `<PREFIX>-<number>` shape, so a hyphenated id is accepted only when it really
 * is that canonical form.
 *
 * Accepted:   `SCR-001`, `home_page`, `Main.Screen`, `checkout2`
 * Reported:   `home-page`, `Main Screen`, `a/b`, `_leading`
 */
function isAcceptedScreenId(id: string): boolean {
  if (CANONICAL_SCREEN_ID_PATTERN.test(id)) {
    return true;
  }
  return SAFE_SCREEN_ID_PATTERN.test(id) && !id.includes("-");
}

/**
 * Screen-id shape validator.
 *
 * Scans every `<contractsDir>/ui/*.yaml` declared in the consumer project and
 * emits `QFAI-PROT-010` for a `screens[].id` that is neither the canonical
 * `SCR-001` form nor a path-safe hyphen-free identifier (`SAFE_SCREEN_ID_PATTERN`
 * without the hyphen — see `isAcceptedScreenId`). Case is not part of the test:
 * `Main.Screen` and `main_screen` are equally accepted.
 *
 * The name still says "casing" because that is what the check used to be. The
 * issue source `prototypingEvidence.screenIdCasing` is what consumers grep,
 * filter and waive on, so it is left alone and the behaviour is stated here
 * instead. The rule code did move — `QFAI-PROT-008` -> `QFAI-PROT-010` — because
 * `prototyping/specIdLinkage.ts` also emits `QFAI-PROT-008`, and one code owned
 * by two modules cannot be grepped, filtered or waived apart at all.
 *
 * This was previously a blanket hyphen ban demanding underscore casing — a
 * convention that appears in no shipped document, that the shipped screen
 * contract template violates by prescribing `SCR-001`, that `slugifyScreenId`
 * violates by emitting hyphens, and that `SAFE_SCREEN_ID_PATTERN` (the
 * canonical screen-id pattern used by the evidence validator in this same
 * profile) explicitly permits. Following qfai's own template guaranteed a
 * blocking failure with no config switch and no migration command.
 *
 * The severity is `warning`, not `error`: no re-casing migration exists, and a
 * project cannot rename frozen contract IDs by hand across a spec pack.
 *
 * Validation is per-file but emits one issue per offending screen id so the
 * operator gets a fan-out list of the exact entries. Empty / non-string ids are
 * ignored here (they are caught by `validateScreenContractSchema` instead).
 */
export async function validateScreenIdCasing(root: string, contractsDir: string): Promise<Issue[]> {
  const fg = (await import("fast-glob")).default;
  const yaml = await import("yaml");
  // Use `path.resolve` (not `path.join`) so an absolute `paths.contractsDir`
  // (e.g. `/tmp/abs/contracts`) is honored as-is. Node's `path.join`
  // concatenates segments without recognizing absolute-path semantics on
  // the second arg, which would produce `${root}/tmp/abs/contracts/ui` and
  // silently scan the wrong directory, dropping every QFAI-PROT-010 hit.
  const uiDir = path.resolve(root, contractsDir, "ui");
  const matches = await fg("**/*.{yaml,yml}", { cwd: uiDir, absolute: true, onlyFiles: true });
  const issues: Issue[] = [];
  for (const filePath of matches.sort()) {
    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = yaml.parse(raw);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;
    const screens = parsed.screens;
    if (!Array.isArray(screens)) continue;
    for (const screen of screens) {
      if (!isRecord(screen)) continue;
      const idRaw = screen.id;
      if (typeof idRaw !== "string") continue;
      const id = idRaw.trim();
      if (id.length === 0) continue;
      if (!isAcceptedScreenId(id)) {
        const rel = path.relative(root, filePath).replace(/\\/g, "/");
        issues.push(
          issue(
            "QFAI-PROT-010",
            `screens[].id "${id}" is neither the canonical \`SCR-001\` form nor a path-safe hyphen-free identifier (letters, digits, \`.\` and \`_\`, starting with a letter or digit). Use the shape shipped in \`40_screen_contracts.md\`, or replace the hyphens, so \`iter-NN/<id>.png\` and the evidence aggregate dirs stay consistent.`,
            "warning",
            rel,
            "prototypingEvidence.screenIdCasing",
          ),
        );
      }
    }
  }
  return issues;
}

// Reviewed 2026-06-01: canonical traceability ledger refreshed; no behavioral changes required this cycle.
