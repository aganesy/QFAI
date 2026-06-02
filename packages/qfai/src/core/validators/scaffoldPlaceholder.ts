/**
 * `D-SCAFFOLD-PLACEHOLDER` validator (BR-0008-0008 / BR-0008-0009).
 *
 * `qfai atdd scaffold` emits one test skeleton per declared Test-Case
 * containing the `SCAFFOLD_PLACEHOLDER_MARKER` sentinel and a per-TC
 * `// TODO: implement assertion for <TC-ID>` line. Until those
 * markers are removed (the file has been authored with a real
 * assertion), `qfai validate --profile atdd|full` surfaces
 * `D-SCAFFOLD-PLACEHOLDER` to make unfilled scaffolds visible.
 *
 * Severity escalation per BR-0008-0009 / AC-0008-0011: each validate
 * pass that observes the SAME unfilled (spec, TC) placeholder
 * advances a per-(spec, TC) counter in `.qfai/state.json#atdd.
 * scaffoldAttempts` (the existing SSOT used by `scaffoldEscalation.ts`).
 * Severity is `warning` while `attempts < scaffoldEscalateCycles`
 * (default 3, configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`)
 * and `error` once the threshold is reached, per the spec:
 *
 *   > escalates from warning to error on the 3rd cycle (configurable
 *   > via qfai.config.yaml#atdd.scaffoldEscalateCycles).
 *
 * The validator does NOT reset the counter when progress is observed
 * — that's the `qfai atdd scaffold` side's responsibility via
 * `resetScaffoldAttempt`. Validate's contract is "report current
 * state and advance the cycle counter"; scaffold's contract is
 * "reset on progress observed".
 *
 * Scan scope: `<config.paths.testsDir>/atdd/**\/*.test.{ts,tsx,...}`.
 * Spec id is parsed from the path segment immediately after
 * `tests/atdd/` (e.g. `tests/atdd/spec-0008/TC-0008-0001.test.ts`
 * → spec id `spec-0008`).
 */
import fg from "fast-glob";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { resolvePath, type QfaiConfig } from "../config.js";
import { SCAFFOLD_PLACEHOLDER_MARKER } from "../atdd/scaffold.js";
import { recordScaffoldAttempt, shouldEscalate } from "../atdd/scaffoldEscalation.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * Matches the per-TC `// TODO: implement assertion for <TC-ID>`
 * comment that `qfai atdd scaffold` emits inside each skeleton.
 * Captures the TC-ID so the validator finding can name it and so
 * the escalation counter can advance per-TC (not per-file).
 */
const TODO_MARKER_RE = /\/\/\s*TODO:\s*implement assertion for\s+(TC-\d{4}-\d{4})\b/g;

/** Default escalation threshold (configurable via qfai.config.yaml#atdd.scaffoldEscalateCycles). */
const DEFAULT_SCAFFOLD_ESCALATE_CYCLES = 3;

/**
 * Extract the spec id from an atdd-scaffold file path of the shape
 * `<testsRoot>/atdd/<spec-id>/<TC>.test.*`. Returns `null` when the
 * path does not match the canonical layout — the caller falls back
 * to emitting a warning without escalation (graceful degradation
 * rather than dropping the finding entirely).
 */
function extractSpecIdFromScaffoldPath(testsAtddDir: string, filePath: string): string | null {
  const rel = path.relative(testsAtddDir, filePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  const firstSegment = rel.split(/[\\/]/u)[0];
  if (typeof firstSegment !== "string" || firstSegment.length === 0) {
    return null;
  }
  // Accept `spec-NNNN` and `spec-NNN` shapes (mirrors the
  // `validateSpecId` regex in atddScaffold.ts).
  if (!/^spec-\d{3,4}$/.test(firstSegment)) {
    return null;
  }
  return firstSegment;
}

export async function validateScaffoldPlaceholder(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  // Honor `config.paths.testsDir`; default `tests` covers the
  // legacy `tests/atdd/<spec-id>/<TC>.test.*` layout. The atdd
  // subdirectory is fixed by the scaffold contract; only the
  // parent is configurable.
  const testsDir = resolvePath(root, config, "testsDir");
  const atddDir = path.join(testsDir, "atdd");
  const threshold =
    typeof config.atdd?.scaffoldEscalateCycles === "number" &&
    Number.isFinite(config.atdd.scaffoldEscalateCycles) &&
    Number.isInteger(config.atdd.scaffoldEscalateCycles) &&
    config.atdd.scaffoldEscalateCycles > 0
      ? config.atdd.scaffoldEscalateCycles
      : DEFAULT_SCAFFOLD_ESCALATE_CYCLES;
  // Glob for any test extension the project uses. fast-glob
  // returns absolute paths when the pattern is absolute.
  const globPattern = path.posix.join(
    atddDir.replace(/\\/g, "/"),
    "**/*.test.{ts,tsx,mts,js,mjs,jsx,cts,cjs}",
  );
  const files = await fg(globPattern, { dot: false, absolute: true });
  for (const file of files) {
    let body: string;
    try {
      body = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    // A file is "still placeholder" when it contains BOTH the
    // sentinel AND the per-TC TODO marker. Mirrors the
    // `isStillPlaceholder` logic in `core/atdd/scaffold.ts` so the
    // emit-side and validate-side agree on the same definition.
    if (!body.includes(SCAFFOLD_PLACEHOLDER_MARKER)) {
      continue;
    }
    const matches = Array.from(body.matchAll(TODO_MARKER_RE));
    if (matches.length === 0) {
      continue;
    }
    const tcIds = Array.from(
      new Set(matches.map((m) => m[1]).filter((id): id is string => typeof id === "string")),
    );
    const relPath = path.relative(root, file).replace(/\\/g, "/");
    const specId = extractSpecIdFromScaffoldPath(atddDir, file);
    // Advance the escalation counter PER (spec, TC) — not per file
    // — so a spec-NNNN/TC-NNNN-NNNN that appears in two scaffold
    // files (split assertions) still escalates after the same
    // total validate-cycle count. When the file path does not
    // map to a canonical `tests/atdd/<spec>/...` layout (specId is
    // null), the counter is skipped and the finding stays at
    // warning severity — graceful degradation rather than
    // skipping the file entirely.
    let escalated = false;
    if (specId !== null) {
      let maxAttempts = 0;
      for (const tcId of tcIds) {
        const next = await recordScaffoldAttempt(root, specId, tcId);
        if (next > maxAttempts) {
          maxAttempts = next;
        }
      }
      escalated = shouldEscalate(maxAttempts, threshold);
    }
    const severity = escalated ? "error" : "warning";
    const escalationNote = escalated
      ? `escalated to error after >= ${threshold} consecutive \`qfai validate\` cycles (per the scaffold-escalation contract)`
      : `current severity warning; escalates to error after ${threshold} consecutive \`qfai validate\` cycles with the placeholder unremoved (BR-0008-0009 default; configurable via qfai.config.yaml#atdd.scaffoldEscalateCycles)`;
    issues.push(
      issue(
        "D-SCAFFOLD-PLACEHOLDER",
        `Scaffold placeholder still present in ${relPath} (TC: ${tcIds.join(", ")}). ` +
          "Replace the `// TODO: implement assertion for <TC-ID>` block " +
          `with a real assertion to clear this finding. ${escalationNote}.`,
        severity,
        relPath,
        "scaffoldPlaceholder.unfilled",
        tcIds,
        "change",
        `Implement an assertion for ${tcIds.join(", ")} in ${relPath}, then re-run validate.`,
      ),
    );
  }
  return issues;
}
