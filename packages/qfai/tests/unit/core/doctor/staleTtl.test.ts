// QFAI:AC-0003-0008-04
//
// Unit-level boundary check for the run-log TTL helper behind
// `doctor --clean`.

import { describe, expect, it } from "vitest";

import { isStaleByTtl } from "../../../../src/core/doctor/staleTtl.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("isStaleByTtl — report.staleTtlDays boundary semantics", () => {
  it("default 14 days keeps a 10-day-old run", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 10 * DAY_MS;
    expect(isStaleByTtl(mtime, 14, now)).toBe(false);
  });

  it("config override 7 days flags the same 10-day-old run as stale", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 10 * DAY_MS;
    expect(isStaleByTtl(mtime, 7, now)).toBe(true);
  });

  it("exactly TTL-old is not yet stale (strict greater-than boundary)", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 14 * DAY_MS;
    expect(isStaleByTtl(mtime, 14, now)).toBe(false);
  });

  it("one millisecond past TTL is stale", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 14 * DAY_MS - 1;
    expect(isStaleByTtl(mtime, 14, now)).toBe(true);
  });

  it("future mtime (clock skew) is not stale", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now + DAY_MS;
    expect(isStaleByTtl(mtime, 14, now)).toBe(false);
  });

  it("non-positive ttlDays never marks a run stale", () => {
    const now = Date.UTC(2026, 4, 28);
    const mtime = now - 100 * DAY_MS;
    expect(isStaleByTtl(mtime, 0, now)).toBe(false);
    expect(isStaleByTtl(mtime, -1, now)).toBe(false);
  });
});
