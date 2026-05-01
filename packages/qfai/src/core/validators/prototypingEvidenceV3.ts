/**
 * Prototyping evidence validator (v2.0 — spec-0017 P7).
 *
 * Validates `.qfai/evidence/prototyping/prototyping.json` (v3.0 schema)
 * for the v2.0 single-thread evolution loop. Replaces the legacy
 * round/funnel/polish/branch validator stubbed in P2.
 *
 * Error codes use the `QFAI-PROT2-NNN` prefix (physically separated
 * from v1.x `QFAI-PROT-NNN` to prevent code reuse drift):
 *
 *   QFAI-PROT2-001  prototyping.json missing or unparseable
 *   QFAI-PROT2-002  schemaVersion must be "3.0"
 *                     iteration field shape and score/prose invariants
 *   QFAI-PROT2-003  iterations[] must contain at least iter-00
 *   QFAI-PROT2-004  iterations[i].index must equal i (contiguous from 0)
 *   QFAI-PROT2-005  stopReason consistency:
 *                     stopReason="max-iterations" requires last iter.index===14
 *                     stopReason="axes-exceptional" requires latest iter to
 *                       have all 4 axes exceptional and slopPatternsDetected=[]
 *   QFAI-PROT2-006  iterations.length exceeds MAX_ITERATIONS (15)
 *   QFAI-PROT2-007  acceptedIterationIndex must equal iterations.length - 1
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

function hasExceptionalStopShape(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.scores) || !isStringArray(value.slopPatternsDetected)) {
    return false;
  }
  return (
    value.scores.designQuality === "exceptional" &&
    value.scores.originality === "exceptional" &&
    value.scores.craft === "exceptional" &&
    value.scores.functionality === "exceptional" &&
    value.slopPatternsDetected.length === 0
  );
}

export async function validatePrototypingEvidenceV3(
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
            "QFAI-PROT2-001",
            "prototyping.json is missing for the primary UI-bearing prototyping spec.",
            "error",
            PROTO_JSON_REL,
            "prototypingEvidenceV3.missing",
          ),
        );
      }
      return issues;
    }
    issues.push(
      issue(
        "QFAI-PROT2-001",
        "prototyping.json is unparseable.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.parse",
      ),
    );
    return issues;
  }

  if (!isRecord(parsed)) {
    issues.push(
      issue(
        "QFAI-PROT2-001",
        "prototyping.json must be a JSON object.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.shape",
      ),
    );
    return issues;
  }

  const r = parsed;

  if (r.schemaVersion !== "3.0") {
    issues.push(
      issue(
        "QFAI-PROT2-002",
        `prototyping.json schemaVersion must be "3.0" (got ${JSON.stringify(r.schemaVersion)}).`,
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.schemaVersion",
      ),
    );
  }

  if (!isStringArray(r.specsCovered)) {
    issues.push(
      issue(
        "QFAI-PROT2-002",
        "prototyping.json specsCovered[] must be a string array.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.specsCovered",
      ),
    );
  }

  const iterations = Array.isArray(r.iterations) ? (r.iterations as unknown[]) : null;
  if (iterations === null) {
    issues.push(
      issue(
        "QFAI-PROT2-003",
        "prototyping.json iterations[] must be an array (and contain at least iter-00).",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.iterations",
      ),
    );
    return issues;
  }
  if (iterations.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT2-003",
        "prototyping.json iterations[] must contain at least iter-00.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.iterations",
      ),
    );
    return issues;
  }
  if (iterations.length > MAX_ITERATIONS) {
    issues.push(
      issue(
        "QFAI-PROT2-006",
        `iterations.length (${iterations.length}) exceeds MAX_ITERATIONS (${MAX_ITERATIONS}).`,
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.iterations.length",
      ),
    );
  }

  // Per-iter shape + index contiguity
  for (let i = 0; i < iterations.length; i += 1) {
    const it = iterations[i];
    if (!isRecord(it)) {
      issues.push(
        issue(
          "QFAI-PROT2-002",
          `iterations[${i}] must be an object.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.iterShape",
        ),
      );
      continue;
    }
    if (it.index !== i) {
      issues.push(
        issue(
          "QFAI-PROT2-004",
          `iterations[${i}].index must be ${i} (got ${JSON.stringify(it.index)}).`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.indexContiguity",
        ),
      );
    }
    if (typeof it.commitSha !== "string" || it.commitSha.length === 0) {
      issues.push(
        issue(
          "QFAI-PROT2-002",
          `iterations[${i}].commitSha must be a non-empty string.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.commitSha",
        ),
      );
    }
    if (typeof it.proseCritique !== "string" || it.proseCritique.trim().length === 0) {
      issues.push(
        issue(
          "QFAI-PROT2-002",
          `iterations[${i}].proseCritique must be a non-empty 200-500 word string.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.proseCritique",
        ),
      );
    } else {
      const wordCount = countWords(it.proseCritique);
      if (wordCount < MIN_PROSE_CRITIQUE_WORDS || wordCount > MAX_PROSE_CRITIQUE_WORDS) {
        issues.push(
          issue(
            "QFAI-PROT2-002",
            `iterations[${i}].proseCritique must be 200-500 words (got ${wordCount}).`,
            "error",
            PROTO_JSON_REL,
            "prototypingEvidenceV3.proseCritique.wordCount",
          ),
        );
      }
    }
    if (!isRecord(it.scores)) {
      issues.push(
        issue(
          "QFAI-PROT2-002",
          `iterations[${i}].scores must be an object.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.scores",
        ),
      );
      continue;
    }
    for (const axis of ["designQuality", "originality", "craft", "functionality"] as const) {
      if (!isOrdinalScore(it.scores[axis])) {
        issues.push(
          issue(
            "QFAI-PROT2-002",
            `iterations[${i}].scores.${axis} must be one of weak|acceptable|strong|exceptional (got ${JSON.stringify(it.scores[axis])}).`,
            "error",
            PROTO_JSON_REL,
            `prototypingEvidenceV3.scores.${axis}`,
          ),
        );
      }
    }
    if (!isPivotDirective(it.pivotDirective)) {
      issues.push(
        issue(
          "QFAI-PROT2-002",
          `iterations[${i}].pivotDirective must be one of continue|refine|pivot.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.pivotDirective",
        ),
      );
    }
    if (!isStringArray(it.slopPatternsDetected)) {
      issues.push(
        issue(
          "QFAI-PROT2-002",
          `iterations[${i}].slopPatternsDetected must be a string array.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.slopPatternsDetected",
        ),
      );
    } else if (
      it.slopPatternsDetected.length > 0 &&
      (it.scores.originality === "strong" || it.scores.originality === "exceptional")
    ) {
      issues.push(
        issue(
          "QFAI-PROT2-002",
          `iterations[${i}].scores.originality must be weak|acceptable when slopPatternsDetected[] is non-empty.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.scores.originality.slopCap",
        ),
      );
    }
  }

  // acceptedIterationIndex must equal iterations.length - 1 (no best-of-history)
  if (typeof r.acceptedIterationIndex !== "number") {
    issues.push(
      issue(
        "QFAI-PROT2-007",
        "acceptedIterationIndex must be a number.",
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.acceptedIterationIndex",
      ),
    );
  } else if (r.acceptedIterationIndex !== iterations.length - 1) {
    issues.push(
      issue(
        "QFAI-PROT2-007",
        `acceptedIterationIndex (${r.acceptedIterationIndex}) must equal iterations.length - 1 (${iterations.length - 1}). v2.0 has no best-of-history; latest iter is always accepted.`,
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.acceptedIterationIndex",
      ),
    );
  }

  // stopReason consistency
  const stopReason = r.stopReason;
  if (stopReason !== null && stopReason !== "axes-exceptional" && stopReason !== "max-iterations") {
    issues.push(
      issue(
        "QFAI-PROT2-005",
        `stopReason must be null | "axes-exceptional" | "max-iterations" (got ${JSON.stringify(stopReason)}).`,
        "error",
        PROTO_JSON_REL,
        "prototypingEvidenceV3.stopReason",
      ),
    );
  }
  const last = iterations[iterations.length - 1];
  if (stopReason === "max-iterations") {
    if (!isRecord(last) || last.index !== MAX_ITERATION_INDEX) {
      issues.push(
        issue(
          "QFAI-PROT2-005",
          `stopReason="max-iterations" requires last iter.index === ${MAX_ITERATION_INDEX}.`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.stopReasonConsistency",
        ),
      );
    }
  }
  if (stopReason === "axes-exceptional" && last) {
    if (!hasExceptionalStopShape(last)) {
      issues.push(
        issue(
          "QFAI-PROT2-005",
          `stopReason="axes-exceptional" requires the latest iter to have all 4 axes exceptional and slopPatternsDetected=[].`,
          "error",
          PROTO_JSON_REL,
          "prototypingEvidenceV3.stopReasonConsistency",
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
