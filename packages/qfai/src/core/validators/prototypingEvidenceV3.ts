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
import {
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  isOrdinalScore,
  isPivotDirective,
  type Iteration,
} from "../prototyping/iteration.js";

const PROTO_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export async function validatePrototypingEvidenceV3(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const protoJsonAbs = path.join(root, PROTO_JSON_REL);

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(protoJsonAbs, "utf-8"));
  } catch {
    // Note: spec-0017 makes prototyping.json optional outside of an active
    // run (you can have a repo with no prototyping run yet). Only emit the
    // missing-file error when the file is referenced elsewhere; keep the
    // unparseable case as a hard error so corrupted JSON is caught.
    try {
      // re-read to distinguish missing vs unparseable
      await readFile(protoJsonAbs, "utf-8");
    } catch {
      // missing — silent
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
  const last = iterations[iterations.length - 1] as Iteration | undefined;
  if (stopReason === "max-iterations") {
    if (!last || last.index !== MAX_ITERATION_INDEX) {
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
    const allEx =
      last.scores.designQuality === "exceptional" &&
      last.scores.originality === "exceptional" &&
      last.scores.craft === "exceptional" &&
      last.scores.functionality === "exceptional" &&
      Array.isArray(last.slopPatternsDetected) &&
      last.slopPatternsDetected.length === 0;
    if (!allEx) {
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
