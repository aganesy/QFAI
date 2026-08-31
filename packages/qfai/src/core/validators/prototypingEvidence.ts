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
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  isOrdinalScore,
  isPivotDirective,
  isStopReason,
} from "../prototyping/iteration.js";

import { validateProseCritiqueBand } from "../prototyping/evaluatorReview.js";
import { PROTOTYPING_JSON_REL } from "../prototyping/paths.js";
import { SAFE_SCREEN_ID_PATTERN } from "./uiEvidenceArtifacts.js";

const PROTO_JSON_REL = PROTOTYPING_JSON_REL;

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
