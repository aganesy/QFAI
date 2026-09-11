/**
 * countWords / validateProseCritiqueBand boundary matrix.
 *
 * QFAI-PROT-002 is a cap with no floor, so both former lower boundaries
 * are kept as cases and pass: a critique that reports one finding and
 * stops is complete, and the rule that rejected it taught a reviewer to
 * pad instead.
 *
 *   - English: 199 pass / 200 pass / 500 pass / 501 fail
 *   - CJK: 599 pass / 600 pass / 2500 pass / 2501 fail
 *
 * Each row asserts the result of `validateProseCritiqueBand` against
 * a synthesised fixture sized to exactly that boundary.
 */

import { describe, expect, it } from "vitest";

import { validateProseCritiqueBand } from "../../../../../src/core/prototyping/evaluatorReview.js";

function englishOfNWords(n: number): string {
  return Array.from({ length: n }, () => "lorem").join(" ");
}

function cjkOfNChars(n: number): string {
  return "あ".repeat(n);
}

describe("English boundary — 199 / 200 / 500 / 501 words", () => {
  it.each([
    { count: 199, expected: true },
    { count: 200, expected: true },
    { count: 500, expected: true },
    { count: 501, expected: false },
  ])("$count words → ok=$expected", ({ count, expected }) => {
    const result = validateProseCritiqueBand(englishOfNWords(count));
    expect(result.ok).toBe(expected);
  });
});

describe("CJK boundary — 599 / 600 / 2500 / 2501 chars", () => {
  it.each([
    { count: 599, expected: true },
    { count: 600, expected: true },
    { count: 2500, expected: true },
    { count: 2501, expected: false },
  ])("$count CJK chars → ok=$expected", ({ count, expected }) => {
    const result = validateProseCritiqueBand(cjkOfNChars(count));
    expect(result.ok).toBe(expected);
  });
});

describe("the shortest critique there is", () => {
  // The case the cap exists to permit, and the one a floor rejected.
  it("accepts a single sentence", () => {
    expect(validateProseCritiqueBand("The empty state is missing.").ok).toBe(true);
  });

  // Emptiness is still refused, by the callers rather than here: both
  // `validatePrototypingEvidence` paths check for a non-empty string
  // before reaching this function. A cap has nothing to say about zero.
  it("has no opinion on an empty string", () => {
    expect(validateProseCritiqueBand("").ok).toBe(true);
  });
});
