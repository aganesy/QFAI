/**
 * primarySpecId SHOULD-normalisation contract
 * (spec-0012 Phase 4 / REQ-0012-0069 / TC-0012-0452).
 *
 * `1 / '1' / '01' / '0001'` all normalise to `"0001"`. The CLI then
 * prefixes `spec-` itself when resolving against `<root>/.qfai/specs/`.
 *
 * Rejects: `10000` (>9999), `0` (non-positive).
 */

import { describe, expect, it } from "vitest";

import { parsePrimarySpecId } from "../../../../src/core/prototyping/primarySpecIdParse.js";

describe("parsePrimarySpecId: SHOULD-normalise integer-coercible inputs", () => {
  it("normalises numeric 1 → '0001'", () => {
    const r = parsePrimarySpecId(1);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.normalised).toBe("0001");
  });

  it("normalises string '1' → '0001'", () => {
    const r = parsePrimarySpecId("1");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.normalised).toBe("0001");
  });

  it("normalises string '01' → '0001'", () => {
    const r = parsePrimarySpecId("01");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.normalised).toBe("0001");
  });

  it("normalises canonical '0001' → '0001' (identity)", () => {
    const r = parsePrimarySpecId("0001");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.normalised).toBe("0001");
  });

  it("accepts upper bound '9999'", () => {
    const r = parsePrimarySpecId("9999");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.normalised).toBe("9999");
  });

  it("rejects 10000 (above upper bound)", () => {
    const r = parsePrimarySpecId(10000);
    expect(r.ok).toBe(false);
  });

  it("rejects 0 (non-positive)", () => {
    const r = parsePrimarySpecId(0);
    expect(r.ok).toBe(false);
  });

  it("rejects negative integers", () => {
    const r = parsePrimarySpecId(-12);
    expect(r.ok).toBe(false);
  });

  it("rejects non-digit strings ('abc', '12a')", () => {
    expect(parsePrimarySpecId("abc").ok).toBe(false);
    expect(parsePrimarySpecId("12a").ok).toBe(false);
  });

  it("normalises three-digit string '12' → '0012'", () => {
    const r = parsePrimarySpecId("12");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.normalised).toBe("0012");
  });
});
