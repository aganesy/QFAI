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
 * Scan scope: the scaffold directories under `<config.paths.testsDir>`, each
 * globbed with every basename shape the writer's dialects emit.
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
import { SCAFFOLD_PLACEHOLDER_GLOBS } from "../atdd/scaffoldDialect.js";
import { atddTestKindDirs, collectTcLevels, isOutsideAtddObligation } from "../atddTraceability.js";
import {
  listValidateCycleKeys,
  recordValidateCycle,
  resetValidateCycle,
  resolveEscalateThreshold,
  shouldEscalate,
} from "../atdd/scaffoldEscalation.js";
import { hasErrnoCode } from "../fs/errno.js";
import { collectSpecEntries } from "../specLayout.js";
import { normalizeSpecId, type SpecScope } from "../specScope.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

/**
 * Matches the per-TC `TODO: implement assertion for <TC-ID>`
 * comment that `qfai atdd scaffold` emits inside each skeleton.
 * Captures the TC-ID so the validator finding can name it and so
 * the escalation counter can advance per-TC (not per-file).
 *
 * Both line-comment prefixes the scaffold dialects use are accepted (`//` for
 * vitest, `#` for pytest) — an anchored `//` would have made a Python skeleton
 * invisible here, which is the same "the writer emitted it, no gate reads it"
 * failure the dialect selection removes.
 */
const TODO_MARKER_RE = /(?:\/\/|#)\s*TODO:\s*implement assertion for\s+(TC-\d{4}-\d{4})\b/g;

/**
 * Declared `Level` values whose home is a directory this writer does not emit
 * into. Kept in step with `atddScaffold.ts`'s own set: the command stopped
 * generating these, and this validator has to stop gating the ones it already
 * generated.
 */
const SCAFFOLD_FOREIGN_LEVELS = new Set(["l4", "api", "l5", "e2e"]);

/** The scanned root a `Level` routes to. */
function scaffoldHomeForLevel(level: string | undefined): "api" | "e2e" | "integration" {
  const normalized = (level ?? "").trim().toLowerCase();
  if (normalized === "l4" || normalized === "api") return "api";
  if (normalized === "l5" || normalized === "e2e") return "e2e";
  return "integration";
}

/** The home a scanned root represents; `atdd` is the integration one. */
function scaffoldHomeOf(dirName: string): "api" | "e2e" | "integration" {
  return dirName === "api" || dirName === "e2e" ? dirName : "integration";
}

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
/** Repo-relative POSIX form of an enumerated spec directory. */
function toPosixRelative(root: string, absolute: string | undefined): string {
  return path.relative(root, absolute ?? "").replace(/\\/g, "/");
}

function scaffoldSpecNumber(specId: string): string | null {
  // Normalized the way `resolveSpecScope` normalizes `--spec`: it pads to four
  // digits, and `extractSpecIdFromScaffoldPath` accepts the three-digit
  // `spec-NNN` shape `qfai atdd scaffold` also accepts. Comparing the raw
  // capture made a `tests/integration/spec-001/` skeleton look like a different
  // spec from the `--spec 001` that requested it, so a scoped gate skipped it
  // silently — no finding, no counter, no reset.
  return normalizeSpecId(specId);
}

export async function validateScaffoldPlaceholder(
  root: string,
  config: QfaiConfig,
  options: { specScope?: SpecScope } = {},
): Promise<Issue[]> {
  const issues: Issue[] = [];
  /** `06_Test-Cases.md` levels per spec, read once per spec and memoised. */
  const levelCache = new Map<string, Map<string, string>>();
  const tcLevelsForSpec = async (specId: string): Promise<Map<string, string>> => {
    const cached = levelCache.get(specId);
    if (cached) return cached;
    const specsRoot = resolvePath(root, config, "specsDir");
    const text = await readFile(path.join(specsRoot, specId, "06_Test-Cases.md"), "utf-8").catch(
      () => "",
    );
    const levels = collectTcLevels(text);
    levelCache.set(specId, levels);
    return levels;
  };
  // Honor `config.paths.testsDir`; default `tests` covers the
  // legacy `tests/atdd/<spec-id>/<TC>.test.*` layout. The atdd
  // subdirectory is fixed by the scaffold contract; only the
  // parent is configurable.
  const testsDir = resolvePath(root, config, "testsDir");
  // The scaffold writes to `<testsDir>/integration/` so its output is visible
  // to `QFAI-ATDD-112`. `atdd/` is still scanned: projects scaffolded before
  // that change have skeletons there, and dropping the directory would stop
  // reporting placeholders that are still on disk.
  // `api` and `e2e` are scanned too, though `qfai atdd scaffold` never writes
  // there: `D-SCAFFOLD-FOREIGN-HOME` tells the operator to move an L4/L5
  // skeleton to exactly those directories, and a skeleton that moved without
  // being implemented used to disappear from every gate at once — this scan did
  // not reach it, the ATDD scan counted its annotation as coverage so
  // `QFAI-ATDD-112` and `-123` both cleared, and the generated `it.skip(...)`
  // is not the `*.todo` form `QFAI-TEST-001` matches. Following the remediation
  // literally turned a reported placeholder into a silent one. Only a file
  // carrying the scaffold sentinel is reported, so a hand-written test in those
  // directories is untouched.
  const scaffoldDirs = [
    path.join(testsDir, "integration"),
    path.join(testsDir, "atdd"),
    path.join(testsDir, "api"),
    path.join(testsDir, "e2e"),
  ];
  const threshold = resolveEscalateThreshold(config.atdd?.scaffoldEscalateCycles);
  // Number -> the directory `collectSpecEntries` enumerated. The scaffold's
  // own `spec-NNNN` comes from a *test* directory name, so joining it onto the
  // specs root can name a path that does not exist — a `SPEC-0001/` spec pack
  // is valid on a case-sensitive filesystem and kept verbatim by
  // `listSpecDirs`. Attribution uses the enumerated path.
  const declaredSpecDirs = new Map(
    (await collectSpecEntries(resolvePath(root, config, "specsDir"))).map(
      (entry) => [entry.specNumber, entry.dir] as const,
    ),
  );
  // Through the configured `paths.testsDir`, like the scan and the scaffold
  // writer. A project that relocated it was told to move the test to a
  // literal `tests/api/**` that no validator reads, so following the
  // remediation left `QFAI-ATDD-112` exactly as it was.
  const dirs = atddTestKindDirs(config.paths.testsDir);
  // One glob per scaffold directory per dialect the writer can emit, taken
  // from the writer's own table so the two cannot drift: a hardcoded
  // `**/*.test.{ts,...}` here stopped reporting the pytest skeletons the
  // stack-aware writer emits. fast-glob returns absolute paths when the
  // pattern is absolute.
  const globPatterns = scaffoldDirs.flatMap((dir) =>
    SCAFFOLD_PLACEHOLDER_GLOBS.map((pattern) => path.posix.join(dir.replace(/\\/g, "/"), pattern)),
  );
  // De-duplicated: an unusual `testsDir` could make two patterns resolve to the
  // same file, and counting it twice would double one skeleton's escalation.
  const files = Array.from(
    new Set((await fg(globPatterns, { dot: false, absolute: true })).map((f) => path.resolve(f))),
  );
  // Track every (spec, TC) we observed as placeholder this pass so we
  // can reset stale counters at the end.
  const observedKeys = new Set<string>();
  // One state-write failure disables every later counter write in this
  // pass. `updateState` waits up to its full lock budget before giving
  // up, so retrying per TC turns a single lock held by a concurrent CLI
  // run into one wait PER placeholder — a repo with 100 unfilled
  // skeletons would stall for minutes before continuing fail-soft with
  // exactly the same findings. The other failure classes (read-only FS,
  // ENOSPC, EACCES) do not clear mid-pass either, so nothing is lost by
  // stopping after the first one; the findings still surface, with the
  // "counter unavailable" note.
  let counterWritesDisabled = false;
  // The cycle count already recorded for a (spec, TC) THIS pass. One validate
  // pass is one cycle no matter how many files carry the TC's TODO marker:
  // a skeleton an earlier `qfai atdd scaffold` wrote under a different naming
  // convention sits next to the current one, both are globbed here, and
  // recording per file advanced the counter twice per pass — escalating a
  // placeholder to `error` in half the configured cycles.
  const recordedCycles = new Map<string, number>();
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
    const allTcIds = Array.from(
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
      // A directory naming a spec no pack has — a typo in the directory name,
      // the ordinary mistyped scaffold — is not an out-of-scope sibling. No run
      // would ever report it: `--spec 9999` is rejected by `QFAI-SCOPE-002`, so
      // skipping it here removes the placeholder from every valid scoped gate
      // and its escalation with it. Only a real sibling is skipped.
      if (number !== null && declaredSpecDirs.has(number) && !options.specScope.has(number)) {
        continue;
      }
    }

    // A TC whose declared `Level` is Unit or Component carries no ATDD
    // obligation (`QFAI-ATDD-117`), so an unfilled skeleton for it must not
    // escalate to `error` and block `validate --profile atdd|full`. `qfai atdd
    // scaffold` still generates one — it does not route by `Level` — so the
    // skeleton exists and this is where it stops being a gate.
    const levels = specId === null ? new Map<string, string>() : await tcLevelsForSpec(specId);
    // Which of the scanned roots this file is actually in. `atdd` is the
    // scaffold's own output directory and shares the integration home.
    const actualHome = owningDir === undefined ? null : scaffoldHomeOf(path.basename(owningDir));
    const tcIds: string[] = [];
    const foreignHomeTcIds: string[] = [];
    for (const tcId of allTcIds) {
      const level = levels.get(tcId.toUpperCase());
      if (isOutsideAtddObligation(level)) continue;
      // Foreign is a **placement**, not a `Level`. Once `api` and `e2e` are
      // scanned, an L4 skeleton that followed the remediation into
      // `tests/api/**` is in its declared home — its annotation counts, so what
      // it needs is the ordinary placeholder gate and its escalation. Judging by
      // `Level` alone left it on the non-escalating foreign warning forever,
      // which is the same silence the move used to produce.
      const declaredHome = scaffoldHomeForLevel(level);
      const isForeign =
        SCAFFOLD_FOREIGN_LEVELS.has((level ?? "").trim().toLowerCase()) &&
        (actualHome === null || declaredHome !== actualHome);
      if (isForeign) {
        foreignHomeTcIds.push(tcId);
        continue;
      }
      tcIds.push(tcId);
    }

    // An L4/L5 skeleton that a pre-upgrade `qfai atdd scaffold` already wrote
    // into `<testsDir>/integration/` is a different problem from an unfilled
    // one, and the ordinary finding gives it the wrong instruction. Filling in
    // an assertion there discharges nothing: the TC's declared `Level` routes
    // to the api / e2e directories `paths.testsDir` resolves, so the annotation stays uncounted by
    // `QFAI-ATDD-112` and `QFAI-ATDD-123` keeps rejecting it. The remediation
    // is to move or delete the file, and it does not escalate — escalation
    // exists to pressure an operator into writing the assertion, which is not
    // what this one needs.
    if (foreignHomeTcIds.length > 0) {
      issues.push(
        issue(
          "D-SCAFFOLD-FOREIGN-HOME",
          `Scaffold skeleton in ${relPath} covers TC whose declared Level routes elsewhere (${foreignHomeTcIds.join(", ")}). ` +
            "`qfai atdd scaffold` writes integration skeletons only; an L4/L5 annotation here is uncounted by " +
            "QFAI-ATDD-112 and rejected by QFAI-ATDD-123, so implementing an assertion in this file discharges nothing.",
          "warning",
          relPath,
          "scaffoldPlaceholder.foreignHome",
          foreignHomeTcIds,
          "change",
          `Write the real test in the directory the TC's \`Level\` names (${dirs.api} for L4, ${dirs.e2e} for L5) and delete this skeleton — or re-file the obligation as CON-API-* / US-*, which is what a TC-* at L4/L5 usually means. Moving the skeleton itself discharges nothing: it is still a placeholder, and this rule follows it there.`,
        ),
      );
    }

    if (tcIds.length === 0) {
      continue;
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
        const key = `${specId}:${tcId}`;
        observedKeys.add(key);
        const alreadyRecorded = recordedCycles.get(key);
        if (alreadyRecorded !== undefined) {
          // Same pass, second file: reuse the count instead of advancing it.
          counterAvailable = true;
          if (alreadyRecorded > maxAttempts) {
            maxAttempts = alreadyRecorded;
          }
          continue;
        }
        // A counter write already failed this pass — see
        // `counterWritesDisabled`. The key is still observed above so the
        // reset sweep does not mistake this placeholder for a filled one,
        // and the cache hit above still reports its count: only the write
        // is given up on.
        if (counterWritesDisabled) continue;
        try {
          const next = await recordValidateCycle(root, specId, tcId);
          recordedCycles.set(key, next);
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
          counterWritesDisabled = true;
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
        // Only a spec that exists is named. A nonexistent spec path for a
        // mistyped scaffold directory would give the finding an owner of
        // `9999`, and `isFindingInSpecScope` — which lets attributed owners
        // decide and ignores the unattributed test path — then drops it from
        // every real scope, undoing the repo-wide treatment the scan above
        // preserved for it.
        specId !== null && declaredSpecDirs.has(scaffoldSpecNumber(specId) ?? "")
          ? {
              relatedFiles: [
                toPosixRelative(root, declaredSpecDirs.get(scaffoldSpecNumber(specId) ?? "")),
              ],
            }
          : undefined,
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
        if (number !== null && declaredSpecDirs.has(number) && !options.specScope.has(number)) {
          continue;
        }
      }
      if (!observedKeys.has(`${specId}:${tcId}`)) {
        // Same fail-fast rule as the increment loop: once a state
        // write has failed this pass, the remaining resets would only
        // repeat the same wait per tracked key.
        if (counterWritesDisabled) break;
        try {
          await resetValidateCycle(root, specId, tcId);
        } catch (err) {
          counterWritesDisabled = true;
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
