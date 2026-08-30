/**
 * `normalizeNewlines` unit: what the fold does and does NOT touch.
 *
 * The module documents a deliberate omission — a lone `\r` is left alone, so
 * that callers comparing file content never have a byte silently rewritten
 * for them. Nothing asserted that omission, which means a "while I'm here"
 * widening to `/\r\n?/g` would have gone through green. These are the
 * decision's oracle; the drift suites depend on the basis, not on this shape.
 */

import { describe, expect, it } from "vitest";

import { normalizeNewlines } from "../../../src/shared/text.js";

describe("normalizeNewlines", () => {
  it("collapses CRLF to LF so a CRLF and an LF copy of one file compare equal", () => {
    expect(normalizeNewlines("a\r\nb\r\n")).toBe("a\nb\n");
    expect(normalizeNewlines("a\r\nb")).toBe(normalizeNewlines("a\nb"));
  });

  it("leaves a lone CR untouched, including one adjacent to a real CRLF", () => {
    // The documented decision. A `/\r\n?/g` widening would return "a\nb".
    expect(normalizeNewlines("a\rb")).toBe("a\rb");
    // `\r\r\n`: the trailing pair is a CRLF, the leading `\r` is not.
    expect(normalizeNewlines("a\r\r\nb")).toBe("a\r\nb");
    // A trailing lone CR has no LF to pair with and must survive.
    expect(normalizeNewlines("a\r")).toBe("a\r");
  });

  it("returns already-LF text and empty text unchanged", () => {
    expect(normalizeNewlines("a\nb\n")).toBe("a\nb\n");
    expect(normalizeNewlines("")).toBe("");
  });

  it("is idempotent, so digesting normalized text twice is the same basis", () => {
    const once = normalizeNewlines("a\r\nb\rc\n");
    expect(normalizeNewlines(once)).toBe(once);
  });
});
