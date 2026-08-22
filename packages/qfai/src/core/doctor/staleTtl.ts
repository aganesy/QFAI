/**
 * Pure helpers for the age-based cleanup decisions used by
 * `qfai doctor --clean` and the autoremediate orchestrator.
 *
 * A directory is stale when its modification time is strictly older
 * than `ttlDays` calendar days from `nowMs`. Equal-age entries
 * (mtime === nowMs - ttlDays * DAY_MS) stay in place so the boundary
 * is observable in tests.
 *
 * Non-positive `ttlDays` is treated as never-stale — the consumer
 * project may opt out of TTL cleanup without removing the call-site.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Directory-agnostic age predicate. Both the review-pack archival path
 * and the run-log pruning path share these boundary semantics, so the
 * rule lives here once rather than being restated per cleanup target.
 */
export function isStaleByTtl(mtimeMs: number, ttlDays: number, nowMs: number): boolean {
  if (!Number.isFinite(mtimeMs) || !Number.isFinite(ttlDays) || !Number.isFinite(nowMs)) {
    return false;
  }
  if (ttlDays <= 0) {
    return false;
  }
  const ageMs = nowMs - mtimeMs;
  if (ageMs <= 0) {
    return false;
  }
  return ageMs > ttlDays * DAY_MS;
}

export function isReviewPackArchiveEligible(
  mtimeMs: number,
  ttlDays: number,
  nowMs: number,
): boolean {
  return isStaleByTtl(mtimeMs, ttlDays, nowMs);
}

export const REVIEW_STALE_TTL_DAYS_DEFAULT = 14;

/**
 * Calendar-day TTL applied to `<outDir>/run-*` validate run logs.
 * Matches the review-pack default so operators only learn one number.
 */
export const RUN_LOG_STALE_TTL_DAYS_DEFAULT = 14;

/**
 * Number of newest run logs retained regardless of age. `validate.log`
 * carries a `run_log:` pointer at the newest run directory, so pruning
 * must never be able to reach it.
 */
export const RUN_LOG_KEEP_LATEST_DEFAULT = 5;

/**
 * Floor under `report.keepLatestRuns`. `0` is accepted by the config
 * normalizer as a number, but a zero floor would let a TTL-expired
 * newest run be pruned while `<outDir>/validate.log` still names it —
 * a Hard Gate trail pointing at a directory that no longer exists.
 * Opting out of pruning is expressed with `report.staleTtlDays: 0`.
 */
export const RUN_LOG_KEEP_LATEST_MIN = 1;
