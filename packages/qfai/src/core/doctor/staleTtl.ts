/**
 * Pure helper for the review-pack TTL archival decision used by
 * `qfai doctor --clean` and the autoremediate orchestrator.
 *
 * A review pack is archive-eligible when its modification time is
 * strictly older than `ttlDays` calendar days from `nowMs`. Equal-age
 * packs (mtime === nowMs - ttlDays * DAY_MS) stay in place so the
 * boundary is observable in tests.
 *
 * Non-positive `ttlDays` is treated as never-archive — the consumer
 * project may opt out of TTL archival without removing the call-site.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function isReviewPackArchiveEligible(
  mtimeMs: number,
  ttlDays: number,
  nowMs: number,
): boolean {
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

export const REVIEW_STALE_TTL_DAYS_DEFAULT = 14;
