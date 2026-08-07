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
import { hasErrnoCode } from "../fs/errno.js";
import type { SpecScope } from "../specScope.js";
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

/**
 * `spec-NNNN` -> `NNNN`, for comparing a scaffold path's spec id against a
 * `--spec` scope (which holds bare numbers).
 */
function scaffoldSpecNumber(specId: string): string | null {
  return /^spec-(\d{3,4})$/.exec(specId)?.[1] ?? null;
}

export async function validateScaffoldPlaceholder(
  root: string,
  config: QfaiConfig,
  options: { specScope?: SpecScope } = {},
): Promise<Issue[]> {
  const issues: Issue[] = [];
  // Honor `config.paths.testsDir`; default `tests` covers the
  // legacy `tests/atdd/<spec-id>/<TC>.test.*` layout. The atdd
  // subdirectory is fixed by the scaffold contract; only the
  // parent is configurable.
  const testsDir = resolvePath(root, config, "testsDir");
  // The scaffold writes to `<testsDir>/integration/` so its output is visible
  // to `QFAI-ATDD-112`. `atdd/` is still scanned: projects scaffolded before
  // that change have skeletons there, and dropping the directory would stop
  // reporting placeholders that are still on disk.
  const scaffoldDirs = [path.join(testsDir, "integration"), path.join(testsDir, "atdd")];
  /** Repo-relative specs root, for attributing a finding to its spec directory. */
  const specsRelative = path
    .relative(root, resolvePath(root, config, "specsDir"))
    .replace(/\\/g, "/");
  const threshold = resolveEscalateThreshold(config.atdd?.scaffoldEscalateCycles);
  // Glob for any test extension the project uses. fast-glob
  // returns absolute paths when the pattern is absolute.
  const globPatterns = scaffoldDirs.map((dir) =>
    path.posix.join(dir.replace(/\\/g, "/"), "**/*.test.{ts,tsx,mts,js,mjs,jsx,cts,cjs}"),
  );
  // De-duplicated: an unusual `testsDir` could make two patterns resolve to the
  // same file, and counting it twice would double one skeleton's escalation.
  const files = Array.from(
    new Set((await fg(globPatterns, { dot: false, absolute: true })).map((f) => path.resolve(f))),
  );
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
    // Resolved against whichever scaffold root actually contains the file.
    const owningDir = scaffoldDirs.find((dir) => path.resolve(file).startsWith(path.resolve(dir)));
    const specId = owningDir ? extractSpecIdFromScaffoldPath(owningDir, file) : null;
    // Scope decides before the counter, not after the finding. Filtering the
    // emitted issue downstream still let a `--spec 0002` run advance
    // spec-0001's escalation counter on every pass — three scoped gates and
    // spec-0001 hit the default threshold without ever being validated, so its
    // next run opened at `error`. Two concurrent per-spec runs also
    // read-modify-write the same `.qfai/state.json`, and only the specs each
    // run owns should be in that write at all.
    //
    // `specId === null` is a non-canonical layout the scan cannot attribute;
    // it stays in every scope, matching `isFindingInSpecScope`'s treatment of
    // an unattributed finding. The counter is already skipped for those.
    if (specId !== null && options.specScope !== undefined) {
      const number = scaffoldSpecNumber(specId);
      if (number !== null && !options.specScope.has(number)) {
        continue;
      }
    }
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
        } catch (err) {
          // Fail-soft: a state-write failure for this TC leaves the
          // counter unread. We don't set counterAvailable=true so the
          // progress note degrades to "counter unavailable" rather
          // than silently displaying "0/N" (which would mislead the
          // operator into thinking they have a full grace window
          // when the placeholder may have persisted for many cycles).
          // Observability: log the failure class to stderr so a
          // programming bug (TypeError / RangeError) is not silently
          // swallowed alongside the expected ENOENT/EACCES/ENOSPC
          // class. Codex r3338412192.
          logFailSoft("recordValidateCycle", specId, tcId, err);
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
    // Message split: `progressNote` carries the live counter (may
    // exceed threshold once escalation has fired and the placeholder
    // remains across further passes), `escalationNote` describes the
    // threshold boundary. Pre-fix the error note said "after N
    // cycles" alongside a `(5/3 ...)` progress note which read as
    // "did this happen at 3 or at 5?" — codex r3338411701.
    // Pluralization: `scaffoldEscalateCycles: 1` is a supported
    // operator setting (`shouldEscalate` fires at `threshold >= 1`),
    // so use singular "cycle" when threshold === 1 — codex
    // r3338479241.
    const cycleWord = threshold === 1 ? "cycle" : "cycles";
    const verbAreReached = threshold === 1 ? "is reached" : "are reached";
    const escalationNote = escalated
      ? `escalated to error (threshold ${threshold} \`qfai validate\` ${cycleWord} reached)`
      : `current severity warning; escalates to error when ${threshold} \`qfai validate\` ${cycleWord} ${verbAreReached} with the placeholder unremoved (configurable via qfai.config.yaml#atdd.scaffoldEscalateCycles; 0 disables)`;
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
        // The skeleton's spec is in its path, so this finding can be attributed
        // and `--spec` can scope it. Without it, `owningSpecNumber` returns
        // `null` for `tests/integration/spec-0001/...` — a repo-level path —
        // and `isPathInSpecScope` keeps the finding under every scope, so a
        // sibling spec's unfilled skeleton failed this spec's scoped gate.
        // `file` stays the test path: that is what the operator has to edit.
        specId === null ? undefined : { relatedFiles: [path.posix.join(specsRelative, specId)] },
      ),
    );
  }
  // Reset stale validate-cycle counters: any (spec, TC) that was
  // tracked previously but did NOT appear as an unfilled placeholder
  // this pass has either been filled or removed. Resetting preserves
  // the spec's "consecutive cycles" semantics — a future regression
  // starts counting from zero again, not from the leftover N.
  // Fail-soft on read errors (no list = nothing to reset). Errors
  // are logged via `logFailSoft` so programming bugs aren't silently
  // swallowed (codex r3338412192).
  try {
    const tracked = await listValidateCycleKeys(root);
    for (const { specId, tcId } of tracked) {
      // A scoped run did not scan the other specs, so it cannot conclude their
      // placeholders were filled — resetting them would discard a real count
      // the same way advancing them would invent one.
      if (options.specScope !== undefined) {
        const number = scaffoldSpecNumber(specId);
        if (number !== null && !options.specScope.has(number)) {
          continue;
        }
      }
      if (!observedKeys.has(`${specId}:${tcId}`)) {
        try {
          await resetValidateCycle(root, specId, tcId);
        } catch (err) {
          logFailSoft("resetValidateCycle", specId, tcId, err);
        }
      }
    }
  } catch (err) {
    logFailSoft("listValidateCycleKeys", null, null, err);
  }
  return issues;
}

/**
 * Log a fail-soft failure to stderr with the error class so an
 * operator (or CI scrubber) can correlate counter drift with the
 * underlying cause. Keeps the validator's "never crash on auxiliary
 * bookkeeping" contract while restoring observability — the prior
 * bare `catch {}` form would swallow a TypeError just as silently as
 * an expected ENOSPC.
 */
function logFailSoft(
  operation: string,
  specId: string | null,
  tcId: string | null,
  err: unknown,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const cls = err instanceof Error ? err.constructor.name : typeof err;
  const target = specId !== null && tcId !== null ? ` for ${specId}:${tcId}` : "";
  // Preserve the pre-refactor "no empty-paren tail" behavior: empty-
  // string `code` is suppressed (Node fs errors never produce one,
  // but keeping this explicit means the bare-as refactor is exactly
  // behavior-equivalent — codex r3338522010 / r3338522975).
  const codeStr = hasErrnoCode(err) && err.code.length > 0 ? ` (${err.code})` : "";
  process.stderr.write(
    `qfai validate [D-SCAFFOLD-PLACEHOLDER]: ${operation} fail-soft${target} — ${cls}${codeStr}: ${message}\n`,
  );
}
