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
 *   3. an explicit exclusion of the run `validate.log`'s `run_log:`
 *      line names, so the shipped Hard Gate evidence can never be left
 *      pointing at a directory this pruner removed.
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

/** Run ids are `run-<17-digit local timestamp>`; lexical order is chronological. */
const RUN_LOG_DIR_RE = /^run-\d{17}$/u;

/** `- run_log: <path>` as written by `writeValidateRunLog`. */
const RUN_LOG_POINTER_RE = /^-\s*run_log:\s*(\S+)\s*$/mu;

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
};

export type CleanRunLogsResult = {
  readonly removed: readonly CleanRunLogEntry[];
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
  return { blocked: false };
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
      results.push({ runId: name, dirPath, mtimeMs: stats.mtimeMs });
    } catch {
      continue;
    }
  }
  return results.sort((a, b) => b.runId.localeCompare(a.runId));
}

/**
 * Run id named by `<reportRoot>/validate.log`'s `run_log:` line, or
 * `null` when the file is absent, unreadable or does not carry a
 * pointer. Nothing in this module rewrites `validate.log`, so whatever
 * it names has to survive the prune.
 */
async function readPointerRunId(reportRoot: string): Promise<string | null> {
  let contents: string;
  try {
    contents = await readFile(path.join(reportRoot, "validate.log"), "utf-8");
  } catch {
    return null;
  }
  const pointer = RUN_LOG_POINTER_RE.exec(contents)?.[1];
  if (pointer === undefined) {
    return null;
  }
  const runId = path.basename(pointer.replace(/[/\\]+$/u, ""));
  return RUN_LOG_DIR_RE.test(runId) ? runId : null;
}

function normalizeKeepLatest(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return RUN_LOG_KEEP_LATEST_DEFAULT;
  }
  return Math.max(RUN_LOG_KEEP_LATEST_MIN, Math.floor(value));
}

async function removeRunLog(entry: CleanRunLogEntry): Promise<void> {
  try {
    await rm(entry.dirPath, { recursive: true, force: true });
  } catch (error) {
    // Surface as throw so the caller can decide. We do NOT swallow:
    // the doctor command catches and converts to a finding.
    throw new Error(
      `failed to prune run log ${entry.runId}: ${error instanceof Error ? error.message : String(error)}`,
    );
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
  const pointerRunId = await readPointerRunId(reportRoot);
  const retainedLatest = entries.slice(0, keepLatest);
  const candidates = entries.slice(keepLatest);

  const removed: CleanRunLogEntry[] = [];
  const skippedInTtl: CleanRunLogEntry[] = [];
  const retainedPointer: CleanRunLogEntry[] = [];
  for (const entry of candidates) {
    if (entry.runId === pointerRunId) {
      retainedPointer.push(entry);
      continue;
    }
    if (!isStaleByTtl(entry.mtimeMs, ttlDays, nowMs)) {
      skippedInTtl.push(entry);
      continue;
    }
    removed.push(entry);
    if (options.dryRun) {
      continue;
    }
    await removeRunLog(entry);
  }

  return {
    removed,
    skippedInTtl,
    retainedLatest,
    retainedPointer,
    reportRoot,
    ttlDays,
    keepLatest,
  };
}
