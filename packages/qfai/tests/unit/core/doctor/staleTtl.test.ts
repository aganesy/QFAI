// QFAI:SPEC-0006:TC-0006-0023
//
// Unit-level boundary check for the review-pack TTL helper. The helper
// `isReviewPackArchiveEligible(mtimeMs, ttlDays, nowMs)` powers the
// `doctor --clean` archival decision and any callers that mirror the
// same TTL semantics.

import { describe, expect, it } from "vitest";

import { isReviewPackArchiveEligible } from "../../../../src/core/doctor/staleTtl.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("isReviewPackArchiveEligible — review.staleTtlDays boundary semantics", () => {
  it("default 14 days leaves a 10-day-old pack in place", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 10 * DAY_MS;
    expect(isReviewPackArchiveEligible(mtime, 14, now)).toBe(false);
  });

  it("config override 7 days flags the same 10-day-old pack as archive-eligible", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 10 * DAY_MS;
    expect(isReviewPackArchiveEligible(mtime, 7, now)).toBe(true);
  });

  it("exactly TTL-old is not yet eligible (strict greater-than boundary)", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 14 * DAY_MS;
    expect(isReviewPackArchiveEligible(mtime, 14, now)).toBe(false);
  });

  it("one millisecond past TTL is eligible", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 14 * DAY_MS - 1;
    expect(isReviewPackArchiveEligible(mtime, 14, now)).toBe(true);
  });

  it("future mtime (clock skew) is not eligible", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now + DAY_MS;
    expect(isReviewPackArchiveEligible(mtime, 14, now)).toBe(false);
  });

  it("non-positive ttlDays falls back to never-archive (defensive)", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 100 * DAY_MS;
    expect(isReviewPackArchiveEligible(mtime, 0, now)).toBe(false);
    expect(isReviewPackArchiveEligible(mtime, -1, now)).toBe(false);
  });
});
