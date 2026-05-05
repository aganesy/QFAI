/**
 * Prototyping evidence validator.
 *
 * Validates `.qfai/evidence/prototyping/prototyping.json` for the
 * single-thread iteration loop.
 *
 * Error codes:
 *   QFAI-PROT-001  prototyping.json missing or unparseable
 *   QFAI-PROT-002  iteration field shape and score/prose invariants
 *   QFAI-PROT-003  iterations[] must contain at least iter-00
 *   QFAI-PROT-004  iterations[i].index must equal i (contiguous from 0)
 *   QFAI-PROT-005  stopReason consistency:
 *                    stopReason="max-iterations" requires last iter.index===14
 *                    stopReason="axes-exceptional" requires latest iter to
 *                      have all 4 axes exceptional,
 *                      layoutAntiPatternsDetected=[] AND
 *                      designMdViolations=[]
 *   QFAI-PROT-006  iterations.length exceeds MAX_ITERATIONS (15)
 *   QFAI-PROT-007  acceptedIterationIndex must equal iterations.length - 1
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";
import { resolvePrimaryPrototypingSpec } from "../prototyping/specResolution.js";
import {
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  isOrdinalScore,
  isPivotDirective,
} from "../prototyping/iteration.js";

const PROTO_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";
const MIN_PROSE_CRITIQUE_WORDS = 200;
const MAX_PROSE_CRITIQUE_WORDS = 500;

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

function isViolationArray(
  value: unknown,
): value is ReadonlyArray<{ kind: string; found: string }> {
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
          `iterations[${i}].proseCritique must be a non-empty 200-500 word string.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidence.proseCritique",
        ),
      );
    } else {
      const wordCount = countWords(it.proseCritique);
      if (wordCount < MIN_PROSE_CRITIQUE_WORDS || wordCount > MAX_PROSE_CRITIQUE_WORDS) {
        issues.push(
          issue(
            "QFAI-PROT-002",
            `iterations[${i}].proseCritique must be 200-500 words (got ${wordCount}).`,
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
    for (const axis of [
      "informationArchitecture",
      "navigationFlow",
      "usability",
      "functionality",
    ] as const) {
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
        'stopReason field is required: set null while running, "axes-exceptional" or "max-iterations" once stopped.',
        "error",
        PROTO_JSON_REL,
        "prototypingEvidence.stopReasonRequired",
      ),
    );
  } else if (
    stopReason !== null &&
    stopReason !== "axes-exceptional" &&
    stopReason !== "max-iterations"
  ) {
    issues.push(
      issue(
        "QFAI-PROT-005",
        `stopReason must be null | "axes-exceptional" | "max-iterations" (got ${JSON.stringify(stopReason)}).`,
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

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length;
}
