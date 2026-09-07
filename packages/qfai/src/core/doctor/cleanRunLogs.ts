/**
 * Prune stale `qfai validate` run logs from `<outDir>/run-<17 digits>/`.
 * Used by `qfai doctor --clean` and by the autoremediate orchestrator.
 *
 * Every `qfai validate` allocates a fresh run-log directory and never
 * removes it, so an actively validated project accumulates one
 * directory per invocation for as long as it lives. The directory is
 * covered by the managed gitignore block, which is exactly why no
 * checkout, `git clean` or CI step ever bounds it.
 *
 * Unlike review packs — which are human evidence and are therefore
 * moved, never deleted — run logs are machine-regenerable derived
 * output, so the stale ones are removed outright. That is the only
 * shape that actually reclaims the space and de-noises a recursive
 * grep over the report directory. Three guards keep the removal from
 * being blind:
 *
 *   1. a calendar-day TTL, so only long-cold runs are candidates,
 *   2. a keep-latest floor of at least one run, so the newest runs
 *      survive regardless of age, and
 *   3. an explicit exclusion of every run `validate.log` refers to (its
 *      `run_log:` path and its `run_id:` line), so the shipped Hard Gate
 *      evidence can never be left pointing at a directory this pruner
 *      removed.
 *
 * A failed removal never aborts the pass: the outcome of every candidate
 * is collected so the caller can report what was already deleted before
 * the failure, and exit non-zero on the failures.
 *
 * (1) and (2) are configurable (`report.staleTtlDays` /
 * `report.keepLatestRuns`), and `report.staleTtlDays: 0` opts a project
 * out entirely for the case where run logs are treated as audit
 * evidence. `report.keepLatestRuns: 0` is NOT an opt-out of (2): it is
 * clamped to one, because a zero floor would make the pointer in
 * `validate.log` — which is neither rewritten nor removed here —
 * danglable, and `staleTtlDays: 0` already expresses "keep everything".
 *
 * Idempotent: a second run finds nothing left to remove.
 */

import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import type { Issue } from "../types.js";
import { findOutDirCoOwners } from "./outDirCollisions.js";
import {
  isStaleByTtl,
  RUN_LOG_KEEP_LATEST_DEFAULT,
  RUN_LOG_KEEP_LATEST_MIN,
  RUN_LOG_STALE_TTL_DAYS_DEFAULT,
} from "./staleTtl.js";

/** Run ids are `run-<17-digit local timestamp>`. */
const RUN_LOG_DIR_RE = /^run-\d{17}$/u;

/**
 * `- run_log: <path>` as written by `writeValidateRunLog`.
 *
 * The capture runs to end of line rather than stopping at the first
 * space: `relativeReportDir` is a path under the project root, and a
 * root or an `outDir` containing a space is perfectly legal. A `\S+`
 * capture silently failed to match those lines, which made the pointer
 * read as absent and let the prune delete the very run the shipped Hard
 * Gate evidence names.
 */
const RUN_LOG_POINTER_RE = /^-\s*run_log:\s*(.+?)\s*$/mu;

/** `- run_id: run-<17 digits>` from the same `validate.log`. */
const RUN_LOG_RUN_ID_RE = /^-\s*run_id:\s*(run-\d{17})\s*$/mu;

export type CleanRunLogsOptions = {
  /** Calendar-day TTL. Defaults to `RUN_LOG_STALE_TTL_DAYS_DEFAULT` (14). */
  readonly ttlDays?: number;
  /**
   * Newest runs always retained. Defaults to
   * `RUN_LOG_KEEP_LATEST_DEFAULT` (5); values below
   * `RUN_LOG_KEEP_LATEST_MIN` (1) are clamped up to it.
   */
  readonly keepLatest?: number;
  /** Clock reference for the eligibility decision. Defaults to `Date.now()`. */
  readonly nowMs?: number;
  /** When true, return the plan without removing anything. */
  readonly dryRun?: boolean;
};

export type CleanRunLogEntry = {
  readonly runId: string;
  readonly dirPath: string;
  readonly mtimeMs: number;
  /**
   * `run.json#started_at` in epoch milliseconds, or `null` when the file
   * is missing, unparseable or carries no usable timestamp. Used to
   * order the keep-latest window by real time; see `compareByRecency`.
   */
  readonly startedAtMs: number | null;
};

/** A candidate whose removal was attempted and failed. */
export type CleanRunLogFailure = {
  readonly entry: CleanRunLogEntry;
  readonly reason: string;
};

export type CleanRunLogsResult = {
  readonly removed: readonly CleanRunLogEntry[];
  /**
   * Candidates whose `rm` failed (`EACCES`, `EBUSY`, an I/O error).
   * Non-empty means the prune was partial: `removed` still lists what
   * WAS irreversibly deleted before the failure, which is exactly what
   * a caller that aborts on the first throw could no longer report.
   */
  readonly failed: readonly CleanRunLogFailure[];
  readonly skippedInTtl: readonly CleanRunLogEntry[];
  readonly retainedLatest: readonly CleanRunLogEntry[];
  /**
   * Runs kept because `validate.log` still points at them even though
   * they fell outside the keep-latest window. Normally empty: the
   * pointer names the newest run, which (2) already retains.
   */
  readonly retainedPointer: readonly CleanRunLogEntry[];
  readonly reportRoot: string;
  readonly ttlDays: number;
  readonly keepLatest: number;
};

/** Why an irreversible run-log prune must not start. */
export type RunLogPrunePrecheck =
  | { readonly blocked: false }
  | { readonly blocked: true; readonly reason: string };

/**
 * Preconditions for the irreversible half of `doctor --clean`.
 *
 * Two of them, both of which make the prune act on settings that are
 * not the ones the operator believes are in force:
 *
 *   1. the config did not load cleanly. A mistyped
 *      `report.staleTtlDays: "0"` is dropped during normalization and
 *      the default 14-day TTL silently takes its place; a YAML syntax
 *      error falls all the way back to `defaultConfig`, so even
 *      `paths.outDir` is then someone else's guess. The diagnostic pass
 *      reports those issues, but it runs AFTER the clean phase, so the
 *      abort has to happen here.
 *   2. another project in the same monorepo resolves `paths.outDir` to
 *      the same absolute directory. The retention settings read here
 *      belong to `root` alone, and the `output.outDirCollision`
 *      diagnostic — again — only speaks up after the deletion.
 *
 * A failing collision scan blocks as well: not being able to prove the
 * directory is exclusively owned is not evidence that it is.
 */
export async function precheckRunLogPrune(
  root: string,
  config: QfaiConfig,
  configIssues: readonly Issue[],
): Promise<RunLogPrunePrecheck> {
  if (configIssues.length > 0) {
    return {
      blocked: true,
      reason: `config has ${configIssues.length} unresolved issue(s); run 'npx qfai doctor' and fix them first`,
    };
  }
  const reportRoot = resolvePath(root, config, "outDir");
  let coOwners: string[];
  try {
    coOwners = await findOutDirCoOwners(root, reportRoot);
  } catch (error) {
    return {
      blocked: true,
      reason: `outDir ownership scan failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (coOwners.length > 0) {
    return {
      blocked: true,
      reason: `outDir is shared with ${coOwners.length} other project root(s) (${coOwners.join(", ")}); resolve the collision before pruning`,
    };
  }
  // 3. `validate.log` exists but cannot be read. The run it names has to
  //    survive the prune, and an unreadable pointer cannot say which run
  //    that is. `readPointerRunIds` throws for exactly that case, so probing
  //    it here turns the abort into a reported reason instead of a stack
  //    trace — and keeps the refusal ahead of the first `rm`.
  try {
    await readPointerRunIds(reportRoot);
  } catch (error) {
    return {
      blocked: true,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  return { blocked: false };
}

/**
 * `run.json#started_at` for one run directory, in epoch milliseconds.
 *
 * `null` for every failure mode — absent file, unreadable file, invalid
 * JSON, missing or unparseable field — because a run whose real start
 * time cannot be established must fall back to the ordering keys that
 * are always available rather than be dropped from the listing.
 */
function hasStartedAt(value: unknown): value is { started_at: unknown } {
  return typeof value === "object" && value !== null && "started_at" in value;
}

async function readStartedAtMs(dirPath: string): Promise<number | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(dirPath, "run.json"), "utf-8"));
    if (!hasStartedAt(parsed) || typeof parsed.started_at !== "string") {
      return null;
    }
    const startedAtMs = Date.parse(parsed.started_at);
    return Number.isFinite(startedAtMs) ? startedAtMs : null;
  } catch {
    // Absent, unreadable or invalid JSON: the caller falls back to the
    // ordering keys that are always available.
    return null;
  }
}

/**
 * Newest run first, by real elapsed time rather than by run id.
 *
 * Run ids are `run-<17-digit LOCAL timestamp>`, so lexical order is only
 * chronological while the local clock moves forward: across a DST
 * autumn fall-back — or any manual clock correction backwards — a run
 * that started later carries the smaller id. Sorting by id there hands
 * the keep-latest slots to the pre-rollback runs and leaves the genuinely
 * newest ones exposed to the TTL, breaking the "the newest
 * `keepLatestRuns` survive" contract exactly when history matters most.
 *
 * `run.json#started_at` is written as a UTC ISO instant and is therefore
 * immune to the offset shift, so it is the primary key. Directory mtime
 * (also an absolute instant, in the same epoch-millisecond unit) stands
 * in for runs whose `run.json` is missing or unparseable, which keeps
 * the ordering total, and the run id remains the final deterministic
 * tiebreaker.
 */
function recencyKey(entry: CleanRunLogEntry): number {
  return entry.startedAtMs ?? entry.mtimeMs;
}

function compareByRecency(a: CleanRunLogEntry, b: CleanRunLogEntry): number {
  const delta = recencyKey(b) - recencyKey(a);
  return delta !== 0 ? delta : b.runId.localeCompare(a.runId);
}

/**
 * Enumerate `run-*` directories under `reportRoot`, newest first.
 *
 * A report directory that does not exist yields an empty list: the
 * caller is a cleanup pass and has nothing to say about a project that
 * has never run `qfai validate`. Any other `readdir` failure (`EACCES`,
 * `ENOTDIR` on an `outDir` that is really a file, an I/O error) is
 * propagated instead — reporting `pruned run logs=0` for a directory
 * that could not even be listed would tell the operator the cleanup
 * succeeded when nothing was examined at all.
 */
async function listRunLogDirs(reportRoot: string): Promise<CleanRunLogEntry[]> {
  let names: string[];
  try {
    names = await readdir(reportRoot);
  } catch (error) {
    if (isEnoent(error)) {
      return [];
    }
    throw new Error(
      `failed to read run log directory ${reportRoot}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const results: CleanRunLogEntry[] = [];
  for (const name of names) {
    if (!RUN_LOG_DIR_RE.test(name)) continue;
    const dirPath = path.join(reportRoot, name);
    try {
      const stats = await stat(dirPath);
      if (!stats.isDirectory()) continue;
      results.push({
        runId: name,
        dirPath,
        mtimeMs: stats.mtimeMs,
        startedAtMs: await readStartedAtMs(dirPath),
      });
    } catch {
      continue;
    }
  }
  return results.sort(compareByRecency);
}

/**
 * Every run id `<reportRoot>/validate.log` refers to — empty when the
 * file is absent, unreadable or carries no usable reference. Nothing in
 * this module rewrites `validate.log`, so whatever it names has to
 * survive the prune.
 *
 * BOTH the `run_log:` path and the `run_id:` line are read, and the
 * union is excluded. They normally agree, so the second is redundant;
 * it is kept because the two fail independently. `run_log:` is a path
 * and can be mangled by anything that reformats the file, while
 * `run_id:` is a bare token — so a log whose path line cannot be turned
 * into a run id still protects its referent, and a hand-truncated
 * `run_id:` line still leaves the path.
 */
async function readPointerRunIds(reportRoot: string): Promise<ReadonlySet<string>> {
  const runIds = new Set<string>();
  let contents: string;
  try {
    contents = await readFile(path.join(reportRoot, "validate.log"), "utf-8");
  } catch (error: unknown) {
    // Only "there is no pointer" is an empty set. An EACCES or a transient
    // I/O error means the pointer exists and could not be read, and treating
    // that as "points at nothing" deletes whatever it names: the window is
    // real, because a fresh validate can fill the keep-latest slots while
    // `validate.log` still refers to an older, now TTL-expired run. Fail
    // closed instead — the caller turns this into a refusal to prune.
    if (!isEnoent(error)) {
      throw new Error(
        `failed to read the validate.log run pointer in ${reportRoot}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return runIds;
  }
  const pointer = RUN_LOG_POINTER_RE.exec(contents)?.[1];
  if (pointer !== undefined) {
    const runId = path.basename(pointer.replace(/[/\\]+$/u, ""));
    if (RUN_LOG_DIR_RE.test(runId)) {
      runIds.add(runId);
    }
  }
  const declaredRunId = RUN_LOG_RUN_ID_RE.exec(contents)?.[1];
  if (declaredRunId !== undefined) {
    runIds.add(declaredRunId);
  }
  return runIds;
}

function normalizeKeepLatest(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return RUN_LOG_KEEP_LATEST_DEFAULT;
  }
  return Math.max(RUN_LOG_KEEP_LATEST_MIN, Math.floor(value));
}

/**
 * Remove one run log; `null` on success, the reason on failure.
 *
 * Deliberately does NOT throw. Removal is irreversible and there are
 * usually several candidates, so a throw on the second one would
 * discard the record of the first — the operator would see only the
 * `EACCES` and never learn which run logs are already gone. The caller
 * accumulates the outcomes instead and reports both lists; the non-zero
 * exit is carried by the failure list, not by an exception.
 */
async function removeRunLog(entry: CleanRunLogEntry): Promise<string | null> {
  try {
    await rm(entry.dirPath, { recursive: true, force: true });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function cleanStaleRunLogs(
  root: string,
  config: QfaiConfig,
  options: CleanRunLogsOptions = {},
): Promise<CleanRunLogsResult> {
  const reportRoot = resolvePath(root, config, "outDir");
  const ttlDays = options.ttlDays ?? RUN_LOG_STALE_TTL_DAYS_DEFAULT;
  const keepLatest = normalizeKeepLatest(options.keepLatest);
  const nowMs = options.nowMs ?? Date.now();

  const entries = await listRunLogDirs(reportRoot);
  const pointerRunIds = await readPointerRunIds(reportRoot);
  const retainedLatest = entries.slice(0, keepLatest);
  const candidates = entries.slice(keepLatest);

  const removed: CleanRunLogEntry[] = [];
  const failed: CleanRunLogFailure[] = [];
  const skippedInTtl: CleanRunLogEntry[] = [];
  const retainedPointer: CleanRunLogEntry[] = [];
  for (const entry of candidates) {
    if (pointerRunIds.has(entry.runId)) {
      retainedPointer.push(entry);
      continue;
    }
    if (!isStaleByTtl(entry.mtimeMs, ttlDays, nowMs)) {
      skippedInTtl.push(entry);
      continue;
    }
    if (options.dryRun) {
      removed.push(entry);
      continue;
    }
    const reason = await removeRunLog(entry);
    if (reason === null) {
      removed.push(entry);
    } else {
      failed.push({ entry, reason });
    }
  }

  return {
    removed,
    failed,
    skippedInTtl,
    retainedLatest,
    retainedPointer,
    reportRoot,
    ttlDays,
    keepLatest,
  };
}
