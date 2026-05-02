import { describe, expect, it } from "vitest";
import {
  PROSE_CRITIQUE_MAX_WORDS,
  PROSE_CRITIQUE_MIN_WORDS,
  buildEvaluatorReview,
  countWords,
  type BuildEvaluatorReviewInput,
} from "../../../src/core/prototyping/evaluatorReview.js";

const baseInput = (
  overrides: Partial<BuildEvaluatorReviewInput> = {},
): BuildEvaluatorReviewInput => ({
  iterIndex: 0,
  reviewerId: "product-surface-reviewer",
  scores: {
    designQuality: "acceptable",
    originality: "acceptable",
    craft: "acceptable",
    functionality: "acceptable",
  },
  proseCritique: Array(250).fill("word").join(" "),
  slopPatternsDetected: [],
  pivotDirective: "continue",
  evidenceRefs: {
    screenshot: ".qfai/evidence/prototyping/iter-00/home.png",
    html: ".qfai/evidence/prototyping/iter-00/home.html",
  },
  ...overrides,
});

describe("buildEvaluatorReview", () => {
  it("returns a review when input is valid", () => {
    const review = buildEvaluatorReview(baseInput());
    expect(review.iterIndex).toBe(0);
    expect(review.scores.designQuality).toBe("acceptable");
  });

  // QFAI:SPEC-0017:TC-0017-0006
  it("rejects prose with fewer than 200 words", () => {
    expect(() =>
      buildEvaluatorReview(baseInput({ proseCritique: Array(100).fill("word").join(" ") })),
    ).toThrow(/proseCritique must be 200..500 words/);
  });

  it("rejects prose with more than 500 words", () => {
    expect(() =>
      buildEvaluatorReview(baseInput({ proseCritique: Array(600).fill("word").join(" ") })),
    ).toThrow(/proseCritique must be 200..500 words/);
  });

  // QFAI:SPEC-0017:TC-0017-0007
  it("rejects originality=strong while slop is present (anti-slop cap)", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          scores: {
            designQuality: "acceptable",
            originality: "strong",
            craft: "acceptable",
            functionality: "acceptable",
          },
          slopPatternsDetected: ["slop-001-shadcn-zinc"],
        }),
      ),
    ).toThrow(/originality cannot be strong or exceptional/);
  });

  it("rejects originality=exceptional while slop is present", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          scores: {
            designQuality: "exceptional",
            originality: "exceptional",
            craft: "exceptional",
            functionality: "exceptional",
          },
          slopPatternsDetected: ["slop-002-saas-dashboard"],
        }),
      ),
    ).toThrow(/originality cannot be strong or exceptional/);
  });

  it("allows originality=acceptable while slop is present", () => {
    const review = buildEvaluatorReview(
      baseInput({
        scores: {
          designQuality: "exceptional",
          originality: "acceptable",
          craft: "exceptional",
          functionality: "exceptional",
        },
        slopPatternsDetected: ["slop-001-shadcn-zinc"],
      }),
    );
    expect(review.scores.originality).toBe("acceptable");
    expect(review.slopPatternsDetected).toEqual(["slop-001-shadcn-zinc"]);
  });

  // QFAI:SPEC-0017:TC-0017-0021
  it("rejects scores objects missing any of the 4 axes (via type guard)", () => {
    expect(() =>
      buildEvaluatorReview(
        // intentionally cast to bypass TS for the runtime check
        baseInput({
          scores: {
            designQuality: "acceptable",
            originality: "acceptable",
            craft: "acceptable",
            functionality: "not-a-level" as unknown as "acceptable",
          },
        }),
      ),
    ).toThrow(/scores.functionality must be one of/);
  });

  // QFAI:SPEC-0017:TC-0017-0022
  it("rejects pivotDirective values not in {continue, refine, pivot}", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          pivotDirective: "stop" as unknown as "continue",
        }),
      ),
    ).toThrow(/pivotDirective must be one of continue|refine|pivot/);
  });

  it("rejects empty reviewerId", () => {
    expect(() => buildEvaluatorReview(baseInput({ reviewerId: "" }))).toThrow(
      /reviewerId must be a non-empty string/,
    );
  });

  it("rejects negative iterIndex", () => {
    expect(() => buildEvaluatorReview(baseInput({ iterIndex: -1 }))).toThrow(
      /iterIndex must be a non-negative integer/,
    );
  });

  it("rejects empty evidenceRefs.screenshot", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          evidenceRefs: {
            screenshot: "",
            html: ".qfai/evidence/prototyping/iter-00/home.html",
          },
        }),
      ),
    ).toThrow(/evidenceRefs.screenshot must be a non-empty string/);
  });
});

describe("countWords", () => {
  it("returns 0 for empty / whitespace", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });

  it("counts whitespace-separated tokens", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("a  b  c")).toBe(3);
  });

  it("collapses multiple whitespace types", () => {
    expect(countWords("foo\nbar\tbaz")).toBe(3);
  });
});

describe("constants", () => {
  it("PROSE_CRITIQUE_MIN_WORDS is 200", () => {
    expect(PROSE_CRITIQUE_MIN_WORDS).toBe(200);
  });
  it("PROSE_CRITIQUE_MAX_WORDS is 500", () => {
    expect(PROSE_CRITIQUE_MAX_WORDS).toBe(500);
  });
});
