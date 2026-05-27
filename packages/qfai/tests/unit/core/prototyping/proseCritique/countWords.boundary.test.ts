/**
 * countWords / validateProseCritiqueBand boundary matrix.
 *
 * Pin the inclusive boundaries on both sides of QFAI-PROT-002:
 *   - English: 199 fail / 200 pass / 500 pass / 501 fail
 *   - CJK: 599 fail / 600 pass / 2500 pass / 2501 fail
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
    { count: 199, expected: false },
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
    { count: 599, expected: false },
    { count: 600, expected: true },
    { count: 2500, expected: true },
    { count: 2501, expected: false },
  ])("$count CJK chars → ok=$expected", ({ count, expected }) => {
    const result = validateProseCritiqueBand(cjkOfNChars(count));
    expect(result.ok).toBe(expected);
  });
});
