/**
 * primarySpecId canonical-error message contract
 * (spec-0012 Phase 4 / REQ-0012-0069 / TC-0012-0451).
 *
 * Unparseable input emits the exact literal:
 *   `primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received <input>`
 */

import { describe, expect, it } from "vitest";

import { parsePrimarySpecId } from "../../../../src/core/prototyping/primarySpecIdParse.js";

describe("parsePrimarySpecId: canonical error message", () => {
  it('rejects "abc" with the literal error string', () => {
    const r = parsePrimarySpecId("abc");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected reject");
    expect(r.error).toBe(
      'primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received abc',
    );
  });

  it('rejects "10000" (>9999) with the same error class', () => {
    const r = parsePrimarySpecId("10000");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected reject");
    expect(r.error).toBe(
      'primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received 10000',
    );
  });

  it("rejects 0 (non-positive)", () => {
    const r = parsePrimarySpecId(0);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected reject");
    expect(r.error).toBe(
      'primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received 0',
    );
  });

  it("rejects negative numbers", () => {
    const r = parsePrimarySpecId(-1);
    expect(r.ok).toBe(false);
  });

  it("rejects null / undefined / non-string-non-number", () => {
    expect(parsePrimarySpecId(null).ok).toBe(false);
    expect(parsePrimarySpecId(undefined).ok).toBe(false);
    expect(parsePrimarySpecId({}).ok).toBe(false);
    expect(parsePrimarySpecId([]).ok).toBe(false);
  });
});
