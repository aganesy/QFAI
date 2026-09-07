/**
 * Move (never delete) stale review packs from `.qfai/review/<ts>/` to
 * `.qfai/review/_archive/<ts>/`. Used by `qfai doctor --clean` and by
 * the autoremediate orchestrator.
 *
 * Idempotent: re-running on an already-archived pack is a no-op
 * because the top-level pack is no longer present after the first
 * move. The `_archive/` subdirectory is intentionally skipped while
 * enumerating top-level packs.
 */

import { mkdir, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";

import { moveWouldLeaveVersionControl } from "./archiveVisibility.js";
import { isReviewPackArchiveEligible, REVIEW_STALE_TTL_DAYS_DEFAULT } from "./staleTtl.js";

const REVIEW_PACK_DIR_RE = /^review-(\d{17})$/iu;
const ARCHIVE_SUBDIR = "_archive";

export type CleanReviewPacksOptions = {
  /** Calendar-day TTL. Defaults to `REVIEW_STALE_TTL_DAYS_DEFAULT` (14). */
  readonly ttlDays?: number;
  /** Clock reference for the eligibility decision. Defaults to `Date.now()`. */
  readonly nowMs?: number;
  /** When true, return the plan without performing any filesystem move. */
  readonly dryRun?: boolean;
};

export type CleanReviewPackEntry = {
  readonly packName: string;
  readonly fromPath: string;
  readonly toPath: string;
  readonly mtimeMs: number;
};

export type CleanReviewPacksResult = {
  readonly archived: readonly CleanReviewPackEntry[];
  readonly skippedInTtl: readonly CleanReviewPackEntry[];
  /**
   * Eligible packs left in place because the archive destination is git-ignored
   * and the pack is tracked. Moving them would delete committed review evidence
   * from the repository on the next commit, which is not what "archive" means.
   */
  readonly skippedWouldUntrack: readonly CleanReviewPackEntry[];
  readonly reviewRoot: string;
  readonly archiveDir: string;
  readonly ttlDays: number;
};

async function listEntries(reviewRoot: string): Promise<
  {
    name: string;
    abs: string;
    mtimeMs: number;
  }[]
> {
  let names: string[];
  try {
    names = await readdir(reviewRoot);
  } catch {
    return [];
  }
  const results: { name: string; abs: string; mtimeMs: number }[] = [];
  for (const name of names) {
    if (name === ARCHIVE_SUBDIR) continue;
    if (!REVIEW_PACK_DIR_RE.test(name)) continue;
    const abs = path.join(reviewRoot, name);
    try {
      const stats = await stat(abs);
      if (!stats.isDirectory()) continue;
      results.push({ name, abs, mtimeMs: stats.mtimeMs });
    } catch {
      continue;
    }
  }
  return results;
}

export async function cleanStaleReviewPacks(
  root: string,
  options: CleanReviewPacksOptions = {},
): Promise<CleanReviewPacksResult> {
  const reviewRoot = path.join(root, ".qfai", "review");
  const archiveDir = path.join(reviewRoot, ARCHIVE_SUBDIR);
  const ttlDays = options.ttlDays ?? REVIEW_STALE_TTL_DAYS_DEFAULT;
  const nowMs = options.nowMs ?? Date.now();

  const archived: CleanReviewPackEntry[] = [];
  const skipped: CleanReviewPackEntry[] = [];
  const wouldUntrack: CleanReviewPackEntry[] = [];

  const entries = await listEntries(reviewRoot);
  for (const entry of entries) {
    const eligible = isReviewPackArchiveEligible(entry.mtimeMs, ttlDays, nowMs);
    const toPath = path.join(archiveDir, entry.name);
    const record: CleanReviewPackEntry = {
      packName: entry.name,
      fromPath: entry.abs,
      toPath,
      mtimeMs: entry.mtimeMs,
    };
    if (!eligible) {
      skipped.push(record);
      continue;
    }
    // Asked before the plan is recorded, so `--dry-run` previews the refusal
    // rather than promising a move the real run will decline.
    if (moveWouldLeaveVersionControl(root, entry.abs, toPath)) {
      wouldUntrack.push(record);
      continue;
    }
    archived.push(record);
    if (options.dryRun) {
      continue;
    }
    try {
      await mkdir(archiveDir, { recursive: true });
      await rename(entry.abs, toPath);
    } catch (error) {
      // Surface as throw so the caller can decide. We do NOT swallow:
      // the doctor command catches and converts to a finding.
      throw new Error(
        `failed to archive review pack ${entry.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    archived,
    skippedInTtl: skipped,
    skippedWouldUntrack: wouldUntrack,
    reviewRoot,
    archiveDir,
    ttlDays,
  };
}
