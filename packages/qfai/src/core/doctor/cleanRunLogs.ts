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
 * grep over the report directory. Two guards keep the removal from
 * being blind:
 *
 *   1. a calendar-day TTL, so only long-cold runs are candidates, and
 *   2. a keep-latest floor, so the newest N runs survive regardless of
 *      age and `validate.log`'s `run_log:` pointer can never dangle.
 *
 * Both are configurable (`report.staleTtlDays` / `report.keepLatestRuns`),
 * and `report.staleTtlDays: 0` opts a project out entirely for the case
 * where run logs are treated as audit evidence.
 *
 * Idempotent: a second run finds nothing left to remove.
 */

import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import {
  isStaleByTtl,
  RUN_LOG_KEEP_LATEST_DEFAULT,
  RUN_LOG_STALE_TTL_DAYS_DEFAULT,
} from "./staleTtl.js";

/** Run ids are `run-<17-digit local timestamp>`; lexical order is chronological. */
const RUN_LOG_DIR_RE = /^run-\d{17}$/u;

export type CleanRunLogsOptions = {
  /** Calendar-day TTL. Defaults to `RUN_LOG_STALE_TTL_DAYS_DEFAULT` (14). */
  readonly ttlDays?: number;
  /** Newest runs always retained. Defaults to `RUN_LOG_KEEP_LATEST_DEFAULT` (5). */
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
  readonly reportRoot: string;
  readonly ttlDays: number;
  readonly keepLatest: number;
};

/**
 * Enumerate `run-*` directories under `reportRoot`, newest first.
 * A missing or unreadable report directory yields an empty list: the
 * caller is a cleanup pass and has nothing to say about a project that
 * has never run `qfai validate`.
 */
async function listRunLogDirs(reportRoot: string): Promise<CleanRunLogEntry[]> {
  let names: string[];
  try {
    names = await readdir(reportRoot);
  } catch {
    return [];
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

function normalizeKeepLatest(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return RUN_LOG_KEEP_LATEST_DEFAULT;
  }
  return Math.floor(value);
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
  const retainedLatest = entries.slice(0, keepLatest);
  const candidates = entries.slice(keepLatest);

  const removed: CleanRunLogEntry[] = [];
  const skippedInTtl: CleanRunLogEntry[] = [];
  for (const entry of candidates) {
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

  return { removed, skippedInTtl, retainedLatest, reportRoot, ttlDays, keepLatest };
}
