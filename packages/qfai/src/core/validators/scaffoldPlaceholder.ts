/**
 * `D-SCAFFOLD-PLACEHOLDER` validator.
 *
 * `qfai atdd scaffold` emits one test skeleton per declared Test-Case
 * containing the `SCAFFOLD_PLACEHOLDER_MARKER` sentinel and a per-TC
 * `// TODO: implement assertion for <TC-ID>` line. Until those
 * markers are removed (the file has been authored with a real
 * assertion), `qfai validate --profile atdd|full` surfaces
 * `D-SCAFFOLD-PLACEHOLDER` to make unfilled scaffolds visible.
 *
 * Severity escalation: each `qfai validate` pass that observes the
 * SAME unfilled (spec, TC) placeholder advances a per-(spec, TC)
 * counter in `.qfai/state.json#atdd.scaffoldValidateCycles` — a
 * VALIDATE-ONLY counter that is decoupled from
 * `atdd.scaffoldAttempts` (which is owned by `qfai atdd scaffold`).
 * The two counters stay single-writer so the spec's
 * "consecutive `qfai validate` cycles" contract is preserved: one
 * scaffold invocation does NOT count toward the validate cycle and
 * vice versa. Severity is `warning` while `attempts <
 * scaffoldEscalateCycles` (default 3, configurable via
 * `qfai.config.yaml#atdd.scaffoldEscalateCycles`; threshold 0 means
 * "escalation disabled") and `error` once the threshold is reached.
 *
 * Consecutive-cycle semantics: every pass enumerates the
 * scaffoldValidateCycles map and RESETS entries for (spec, TC) pairs
 * that no longer appear as unfilled placeholders. So an operator who
 * fills the placeholder and only re-runs `qfai validate` (without
 * `qfai atdd scaffold`) still gets a fresh-start counter — stale
 * counters never silently linger and turn a future regression into a
 * 1-cycle escalation.
 *
 * Side-effect contract & fail-soft: this validator is the only one
 * under `core/validators/` that writes persistent state. The write
 * is wrapped in try/catch — if `.qfai/state.json` is read-only, the
 * disk is full, etc., the validator degrades to "warning" (no
 * escalation) and surfaces the finding anyway. validate is never
 * crashed by an auxiliary counter write failure.
 *
 * Scan scope: `<config.paths.testsDir>/atdd/**\/*.test.{ts,tsx,...}`.
 * Spec id is parsed from the path segment immediately after
 * `tests/atdd/` (e.g. `tests/atdd/spec-0008/TC-0008-0001.test.ts`
 * → spec id `spec-0008`). Non-canonical layouts degrade to
 * warning-only (graceful degradation; finding is still surfaced).
 */
import fg from "fast-glob";
import path from "node:path";
import { readFile } from "node:fs/promises";

import { resolvePath, type QfaiConfig } from "../config.js";
import { SCAFFOLD_PLACEHOLDER_MARKER } from "../atdd/scaffold.js";
import {
  listValidateCycleKeys,
  recordValidateCycle,
  resetValidateCycle,
  resolveEscalateThreshold,
  shouldEscalate,
} from "../atdd/scaffoldEscalation.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * Matches the per-TC `// TODO: implement assertion for <TC-ID>`
 * comment that `qfai atdd scaffold` emits inside each skeleton.
 * Captures the TC-ID so the validator finding can name it and so
 * the escalation counter can advance per-TC (not per-file).
 */
const TODO_MARKER_RE = /\/\/\s*TODO:\s*implement assertion for\s+(TC-\d{4}-\d{4})\b/g;

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
  const threshold = resolveEscalateThreshold(config.atdd?.scaffoldEscalateCycles);
  // Glob for any test extension the project uses. fast-glob
  // returns absolute paths when the pattern is absolute.
  const globPattern = path.posix.join(
    atddDir.replace(/\\/g, "/"),
    "**/*.test.{ts,tsx,mts,js,mjs,jsx,cts,cjs}",
  );
  const files = await fg(globPattern, { dot: false, absolute: true });
  // Track every (spec, TC) we observed as placeholder this pass so we
  // can reset stale counters at the end.
  const observedKeys = new Set<string>();
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
    // Advance the validate-only escalation counter PER (spec, TC) —
    // not per file — so a spec-NNNN/TC-NNNN-NNNN that appears in two
    // scaffold files (split assertions) still escalates after the
    // same total validate-cycle count. When the file path does not
    // map to a canonical `tests/atdd/<spec>/...` layout (specId is
    // null), the counter is skipped and the finding stays at
    // warning severity — graceful degradation rather than skipping
    // the file entirely. State-write errors degrade to warning too
    // (fail-soft) so validate never crashes on an auxiliary
    // bookkeeping failure (read-only FS / disk full / etc.).
    let maxAttempts = 0;
    let counterAvailable = false;
    if (specId !== null) {
      for (const tcId of tcIds) {
        observedKeys.add(`${specId}:${tcId}`);
        try {
          const next = await recordValidateCycle(root, specId, tcId);
          counterAvailable = true;
          if (next > maxAttempts) {
            maxAttempts = next;
          }
        } catch {
          // Fail-soft: a state-write failure for this TC leaves the
          // counter unread. We don't set counterAvailable=true so the
          // progress note degrades to "counter unavailable" rather
          // than silently displaying "0/N" (which would mislead the
          // operator into thinking they have a full grace window
          // when the placeholder may have persisted for many cycles).
        }
      }
    }
    const escalated = shouldEscalate(maxAttempts, threshold);
    const severity = escalated ? "error" : "warning";
    // Progress note discipline:
    //   - no specId / threshold disabled → omit entirely (escalation
    //     not applicable to this finding);
    //   - counter recorded → show "N/threshold validate cycles observed"
    //     so the operator can predict the next escalation;
    //   - counter write failed → show "counter unavailable" so the
    //     operator is NOT misled into thinking they have a fresh
    //     grace window when the placeholder may have been there for
    //     many cycles. Codex r3338411383.
    let progressNote = "";
    if (specId !== null && threshold > 0) {
      progressNote = counterAvailable
        ? ` (${maxAttempts}/${threshold} validate cycles observed)`
        : ` (counter unavailable — state write failed; escalation may be inaccurate)`;
    }
    const escalationNote = escalated
      ? `escalated to error after ${threshold} \`qfai validate\` cycles`
      : `current severity warning; escalates to error after ${threshold} \`qfai validate\` cycles with the placeholder unremoved (configurable via qfai.config.yaml#atdd.scaffoldEscalateCycles; 0 disables)`;
    issues.push(
      issue(
        "D-SCAFFOLD-PLACEHOLDER",
        `Scaffold placeholder still present in ${relPath} (TC: ${tcIds.join(", ")})${progressNote}. ` +
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
  // Reset stale validate-cycle counters: any (spec, TC) that was
  // tracked previously but did NOT appear as an unfilled placeholder
  // this pass has either been filled or removed. Resetting preserves
  // the spec's "consecutive cycles" semantics — a future regression
  // starts counting from zero again, not from the leftover N.
  // Fail-soft on read errors (no list = nothing to reset).
  try {
    const tracked = await listValidateCycleKeys(root);
    for (const { specId, tcId } of tracked) {
      if (!observedKeys.has(`${specId}:${tcId}`)) {
        try {
          await resetValidateCycle(root, specId, tcId);
        } catch {
          // Ignore individual reset failures — keeps consecutive
          // semantics best-effort without crashing validate.
        }
      }
    }
  } catch {
    // Ignore: stale-reset is best-effort.
  }
  return issues;
}
