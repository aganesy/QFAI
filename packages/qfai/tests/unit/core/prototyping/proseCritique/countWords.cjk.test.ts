/**
 * countWords CJK + OR-fallback band coverage.
 *
 * The QFAI-PROT-002 band MUST accept:
 *   - English: 200..500 words (whitespace-separated)
 *   - CJK: 600..2500 characters (no-whitespace Japanese/Chinese)
 *
 * Implementation uses `Intl.Segmenter('ja', { granularity: 'word' })`
 * for CJK segmentation. When the global is absent, an OR-fallback
 * diagnostic is emitted (Node >= 16 guarantees the global; fallback
 * path documented for forward-compat hardening).
 *
 * Out-of-band error text MUST name:
 *   (a) the count form measured (`characters` for CJK, `words` for EN),
 *   (b) the band used (`600..2500` or `200..500`),
 *   (c) the actual measured count.
 */

import { describe, expect, it } from "vitest";

import {
  validateProseCritiqueBand,
  type ProseCritiqueValidationResult,
} from "../../../../../src/core/prototyping/evaluatorReview.js";

function repeatChars(ch: string, count: number): string {
  return ch.repeat(count);
}

function buildEnglishWords(count: number): string {
  // Each "lorem" word separated by a single space — exact whitespace
  // split count equals `count`.
  return Array.from({ length: count }, () => "lorem").join(" ");
}

describe("countWords / validateProseCritiqueBand — Japanese-only fixture (1200 chars)", () => {
  it("passes when proseCritique is 1200 Japanese characters with no whitespace", () => {
    const text = repeatChars("あ", 1200);
    const result: ProseCritiqueValidationResult = validateProseCritiqueBand(text);
    expect(result.ok).toBe(true);
    expect(result.measuredCharacters).toBe(1200);
    expect(result.measuredWords).toBeLessThan(200);
  });
});

describe("countWords / validateProseCritiqueBand — English fixture (350 words)", () => {
  it("passes when proseCritique is 350 English whitespace-separated words", () => {
    const text = buildEnglishWords(350);
    const result = validateProseCritiqueBand(text);
    expect(result.ok).toBe(true);
    expect(result.measuredWords).toBe(350);
  });
});

describe("countWords / validateProseCritiqueBand — out-of-band Japanese (3000 chars)", () => {
  it("rejects with error text naming count form (characters), band (600..2500), and actual count (3000)", () => {
    const text = repeatChars("あ", 3000);
    const result = validateProseCritiqueBand(text);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected ok=false");
    expect(result.error).toContain("characters");
    expect(result.error).toContain("600..2500");
    expect(result.error).toContain("3000");
  });
});
