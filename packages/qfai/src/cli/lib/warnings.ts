import type { Issue, ValidationProfile, ValidationResult } from "../../core/types.js";

import { warn } from "./logger.js";

export const TRUNCATED_SCAN_CODE = "QFAI-SCAN-001";

// `matchedFileCount` is assigned after the collector already stopped at the
// cap, so it equals `limit` by construction whenever `truncated` is true.
// Reporting it would only ever read "collected N files (limit N)", so the
// message states the cap and what it costs instead.
function truncatedScanMessage(
  scan: ValidationResult["traceability"]["testFiles"],
  context: string,
): string {
  return (
    `${context}: test-file scan stopped at the ${scan.limit}-file cap; ` +
    "traceability/ATDD coverage in this run is computed over a partial file set"
  );
}

export function warnIfTruncated(
  scan: ValidationResult["traceability"]["testFiles"],
  context: string,
): void {
  if (!scan.truncated) {
    return;
  }
  warn(`[warn] ${truncatedScanMessage(scan, context)}`);
}

/**
 * A truncated scan makes every coverage number in the run a claim about an
 * arbitrary prefix of the repository, so it has to be a finding — the stdout
 * echo alone is unreachable from `--fail-on` / `--strict`, the GitHub
 * annotation stream and the run-log. `doctor` already grades the same
 * condition as a warning.
 */
export function buildTruncatedScanIssue(
  scan: ValidationResult["traceability"]["testFiles"],
  context: string,
): Issue | null {
  if (!scan.truncated) {
    return null;
  }
  return {
    code: TRUNCATED_SCAN_CODE,
    severity: "warning",
    category: "canonical",
    message: truncatedScanMessage(scan, context),
    rule: "validate.testFileScanTruncated",
    suggested_action:
      "Narrow testFileGlobs or add exclude globs so the scan fits under the " +
      `${scan.limit}-file cap, then re-run before treating this run's coverage as complete.`,
  };
}

/**
 * Append the truncation finding to an already-assembled result, skipping the
 * append when the code is present (a `report --in` run reads a `validate.json`
 * that already carries it).
 */
export function withTruncatedScanIssue(
  result: ValidationResult,
  context: string,
): ValidationResult {
  const issue = buildTruncatedScanIssue(result.traceability.testFiles, context);
  if (!issue || result.issues.some((existing) => existing.code === issue.code)) {
    return result;
  }
  return {
    ...result,
    issues: [...result.issues, issue],
    counts: { ...result.counts, warning: result.counts.warning + 1 },
  };
}

/**
 * An unwrapped libuv error's errno detail, or `null` when the error is not one.
 *
 * The discriminator is `code` AND `syscall` both being present. That is what
 * separates a filesystem fault from a deliberate refusal: libuv sets both on
 * every error it raises, and an `Error` thrown by this codebase to say "this
 * project is not in a state I can certify" has neither. An error already
 * wrapped with a message naming its path — `cli/lib/fs.ts` does this — also has
 * neither, and passes through unchanged, which is right: it has already said
 * what {@link describeIncompleteRun} would add.
 */
function libuvDetail(error: unknown): { code: string; syscall: string; path?: string } | null {
  const errno = error as NodeJS.ErrnoException | null;
  if (typeof errno?.code !== "string" || typeof errno.syscall !== "string") {
    return null;
  }
  return {
    code: errno.code,
    syscall: errno.syscall,
    ...(typeof errno.path === "string" ? { path: errno.path } : {}),
  };
}

/**
 * The same attribution {@link buildIncompleteRunIssue} gives `validate`, for a
 * command that has no verdict artifact to degrade into.
 *
 * `validate` can answer a filesystem fault with a finding because #1112 wrapped
 * `validateProject`; `init`, `certify`, `iterate` and the rest have no
 * `validate.json` to write, so their answer has to be the refusal itself. What
 * they were producing was the raw libuv message — `EPERM: operation not
 * permitted, stat '...'` — which names the errno and the path but not the
 * command, and does not say that the run is UNDETERMINED rather than clean.
 * That single unattributed line is the complaint #1104 opens with.
 *
 * Returns `null` for anything that is not an unwrapped libuv error, so the
 * caller rethrows a deliberate refusal untouched.
 */
export function describeIncompleteRun(error: unknown, context: string): Error | null {
  const detail = libuvDetail(error);
  if (detail === null) return null;
  const at = detail.path === undefined ? "" : ` (${detail.path})`;
  return new Error(
    `${context}: could not finish — ${detail.syscall} failed with ${detail.code}` +
      `${at}. This run is NOT a clean result; it is no result at all.\n` +
      "Check the path reported above. On a Windows git worktree, .claude/skills/* are FILE " +
      "symlinks pointing at directories and stat answers EPERM for every one of them — " +
      "re-run `npx qfai init` inside the worktree in that case.",
    { cause: error },
  );
}

export const INCOMPLETE_RUN_CODE = "QFAI-SCAN-002";

/**
 * The verdict for a run that could not finish.
 *
 * `runValidate` awaited `validateProject` with no `try`, so an fs error from
 * any validator reached `cli/index.ts` as a single stderr line: no `counts:`,
 * no `run-log:`, no `validate.json`. Every shipped skill pipes validate through
 * `| tail`, so that line was all an agent saw where a gate verdict belonged.
 *
 * Same argument as {@link buildTruncatedScanIssue} above, one step further. An
 * incomplete scan is a claim about part of the repository; an incomplete RUN is
 * no claim at all, and it has to be reachable from `--fail-on`, the annotation
 * stream and the run-log rather than from stderr.
 *
 * **`error`, with no promotion window, deliberately.** P7 ships a new code
 * behind a window, and `sunsetLedger.test.ts` enforces that a registered entry
 * DECIDES the severity through `newRuleSeverity` — so registering this one
 * would make it a `warning` until the promotion. A `warning` exits 0 under the
 * default `--fail-on error`, which would turn a crash into a pass: strictly
 * worse than the bare stderr line this replaces, which at least exited 1. The
 * window also has no backlog to absorb, because the condition crashes the run
 * today and no project is passing in this state. Same shape as
 * {@link TRUNCATED_SCAN_CODE} above, which likewise fixes its own severity.
 * That P7 cannot express "an error from day one" is a gap in the policy rather
 * than a property of this finding: filed as #1111. The reason nothing currently
 * asks the question is that the registry's extractor cannot see either scan
 * code — #1110 — so this severity should become a decision rather than an
 * omission when that is fixed.
 *
 * The errno and the path go in the message because that is what makes the cause
 * actionable — a Windows `git worktree` writes `.claude/skills/*` as FILE
 * symlinks to directories and `stat` answers `EPERM` for every one of them, and
 * "operation not permitted" alone named neither the syscall nor the entry.
 */
export function buildIncompleteRunIssue(error: unknown, context: string): Issue {
  const errno = error as NodeJS.ErrnoException | null;
  const code = typeof errno?.code === "string" ? errno.code : "unknown";
  const at = typeof errno?.path === "string" ? ` (${errno.path})` : "";
  const detail = error instanceof Error ? error.message : String(error);
  return {
    code: INCOMPLETE_RUN_CODE,
    severity: "error",
    category: "canonical",
    message:
      `${context}: validation could not run to completion — ${code}${at}. ` +
      `This run is NOT a clean result; it is no result at all: ${detail}`,
    rule: "validate.runIncomplete",
    ...(typeof errno?.path === "string" ? { file: errno.path } : {}),
    suggested_action:
      "Check the path reported above. On a Windows git worktree, .claude/skills/* are FILE " +
      "symlinks pointing at directories and stat answers EPERM for every one of them — " +
      "re-run `qfai init` inside the worktree in that case.",
  };
}

/**
 * A result shell for a run that produced none.
 *
 * Every count is zero except the one finding, and coverage is zeroed rather
 * than omitted, so `validate.json` is well-formed for its readers and cannot be
 * mistaken for a clean run: the `error` count is non-zero and the finding says
 * why.
 *
 * The counts are DERIVED from the issue's severity, not written beside it. An
 * earlier revision hardcoded `error: 1`, and a mutation that turned the finding
 * into a `warning` left the counts saying `error: 1` with no error-severity
 * issue in the list — a `validate.json` its readers would find inconsistent,
 * and a run that failed for a reason the output no longer showed.
 */
export function incompleteRunResult(
  toolVersion: string,
  issue: Issue,
  profile?: ValidationProfile,
): ValidationResult {
  return {
    toolVersion,
    ...(profile ? { profile } : {}),
    issues: [issue],
    counts: {
      info: issue.severity === "info" ? 1 : 0,
      warning: issue.severity === "warning" ? 1 : 0,
      error: issue.severity === "error" ? 1 : 0,
    },
    traceability: {
      sc: { total: 0, covered: 0, missing: 0, missingIds: [], refs: {} },
      testFiles: {
        globs: [],
        excludeGlobs: [],
        matchedFileCount: 0,
        truncated: false,
        limit: 0,
      },
    },
  };
}
