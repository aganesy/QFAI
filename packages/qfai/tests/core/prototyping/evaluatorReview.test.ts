import { describe, expect, it } from "vitest";
import {
  ORDINAL_AXES,
  PROSE_CRITIQUE_MAX_WORDS,
  PROSE_CRITIQUE_MIN_WORDS,
  buildEvaluatorReview,
  countWords,
  type BuildEvaluatorReviewInput,
  type OrdinalAxis,
} from "../../../src/core/prototyping/evaluatorReview.js";
import type { OrdinalScore } from "../../../src/core/prototyping/iteration.js";

const ORDINAL_SCORE_VALUES: OrdinalScore[] = ["weak", "acceptable", "strong", "exceptional"];

const baseInput = (
  overrides: Partial<BuildEvaluatorReviewInput> = {},
): BuildEvaluatorReviewInput => ({
  iterIndex: 0,
  reviewerId: "product-surface-reviewer",
  scores: {
    informationArchitecture: "acceptable",
    navigationFlow: "acceptable",
    usability: "acceptable",
    functionality: "acceptable",
  },
  proseCritique: Array(250).fill("word").join(" "),
  layoutAntiPatternsDetected: [],
  designMdViolations: [],
  pivotDirective: "continue",
  evidenceRefs: {
    screenshot: ".qfai/evidence/prototyping/iter-00/home.png",
    html: ".qfai/evidence/prototyping/iter-00/home.html",
  },
  ...overrides,
});

describe("ORDINAL_AXES (rename)", () => {
  it("exposes the 4 new UX axes in fixed order", () => {
    expect([...ORDINAL_AXES]).toEqual([
      "informationArchitecture",
      "navigationFlow",
      "usability",
      "functionality",
    ]);
  });
});

describe("buildEvaluatorReview — 4 new axes (TC-3.1.1..7)", () => {
  // TC-3.1.1
  it("accepts a Review with all 4 new axes set to strong", () => {
    const review = buildEvaluatorReview(
      baseInput({
        scores: {
          informationArchitecture: "strong",
          navigationFlow: "strong",
          usability: "strong",
          functionality: "strong",
        },
      }),
    );
    expect(review.scores.informationArchitecture).toBe("strong");
    expect(review.scores.navigationFlow).toBe("strong");
    expect(review.scores.usability).toBe("strong");
    expect(review.scores.functionality).toBe("strong");
    expect(review.layoutAntiPatternsDetected).toEqual([]);
    expect(review.designMdViolations).toEqual([]);
  });

  // TC-3.1.2
  it("rejects the legacy axis name 'originality' (no informationArchitecture key)", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          scores: {
            originality: "strong",
            navigationFlow: "acceptable",
            usability: "acceptable",
            functionality: "acceptable",
          } as unknown as BuildEvaluatorReviewInput["scores"],
        }),
      ),
    ).toThrow(/scores\.informationArchitecture/);
  });

  // TC-3.1.3
  it.each(["designQuality", "craft"])(
    "rejects the legacy axis name '%s' (missing new axis raises required error)",
    (legacy) => {
      const scores: Record<string, OrdinalScore> = {
        informationArchitecture: "acceptable",
        navigationFlow: "acceptable",
        usability: "acceptable",
        functionality: "acceptable",
      };
      // Drop one canonical axis and add the legacy axis name in its place.
      // The first missing-axis check that fires references one of the canonical axes.
      delete scores.informationArchitecture;
      scores[legacy] = "strong";
      expect(() =>
        buildEvaluatorReview(
          baseInput({
            scores: scores as unknown as BuildEvaluatorReviewInput["scores"],
          }),
        ),
      ).toThrow(/scores\.informationArchitecture/);
    },
  );

  // TC-3.1.4
  it.each([["medium"], ["great"], [""], [null], [undefined], [5]])(
    "rejects invalid score value %p on each axis",
    (invalid) => {
      for (const axis of ORDINAL_AXES) {
        const scores: Record<OrdinalAxis, OrdinalScore> = {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        };
        (scores as Record<string, unknown>)[axis] = invalid;
        expect(() =>
          buildEvaluatorReview(
            baseInput({
              scores: scores as unknown as BuildEvaluatorReviewInput["scores"],
            }),
          ),
        ).toThrow(new RegExp(`scores\\.${axis}`));
      }
    },
  );

  // TC-3.1.5
  it("accepts each ordinal score on each of the 4 axes (cartesian)", () => {
    for (const axis of ORDINAL_AXES) {
      for (const score of ORDINAL_SCORE_VALUES) {
        const scores: Record<OrdinalAxis, OrdinalScore> = {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        };
        scores[axis] = score;
        expect(() => buildEvaluatorReview(baseInput({ scores }))).not.toThrow();
      }
    }
  });

  // TC-3.1.6
  it.each(["informationArchitecture", "navigationFlow", "usability", "functionality"])(
    "rejects when axis '%s' key is missing",
    (axis) => {
      const scores: Record<string, OrdinalScore> = {
        informationArchitecture: "acceptable",
        navigationFlow: "acceptable",
        usability: "acceptable",
        functionality: "acceptable",
      };
      Reflect.deleteProperty(scores, axis);
      expect(() =>
        buildEvaluatorReview(
          baseInput({
            scores: scores as unknown as BuildEvaluatorReviewInput["scores"],
          }),
        ),
      ).toThrow(new RegExp(`scores\\.${axis}`));
    },
  );

  // TC-3.1.7
  it("accepts mixed cross-axis scores", () => {
    const review = buildEvaluatorReview(
      baseInput({
        scores: {
          informationArchitecture: "weak",
          navigationFlow: "strong",
          usability: "acceptable",
          functionality: "exceptional",
        },
      }),
    );
    expect(review.scores.informationArchitecture).toBe("weak");
    expect(review.scores.functionality).toBe("exceptional");
  });
});

describe("buildEvaluatorReview — IA cap on layoutAntiPatternsDetected (TC-3.1.8..15)", () => {
  // TC-3.1.8
  it("does not cap when layoutAntiPatternsDetected is empty (IA=exceptional allowed)", () => {
    const review = buildEvaluatorReview(
      baseInput({
        scores: {
          informationArchitecture: "exceptional",
          navigationFlow: "exceptional",
          usability: "exceptional",
          functionality: "exceptional",
        },
        layoutAntiPatternsDetected: [],
      }),
    );
    expect(review.scores.informationArchitecture).toBe("exceptional");
  });

  // TC-3.1.9
  it("rejects IA=strong when a layout anti-pattern is detected", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          scores: {
            informationArchitecture: "strong",
            navigationFlow: "acceptable",
            usability: "acceptable",
            functionality: "acceptable",
          },
          layoutAntiPatternsDetected: ["lap-001-saas-dashboard"],
        }),
      ),
    ).toThrow(/informationArchitecture.*acceptable/);
  });

  // TC-3.1.10
  it("rejects IA=exceptional when a layout anti-pattern is detected", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          scores: {
            informationArchitecture: "exceptional",
            navigationFlow: "exceptional",
            usability: "exceptional",
            functionality: "exceptional",
          },
          layoutAntiPatternsDetected: ["lap-002-card-grid-sidebar"],
        }),
      ),
    ).toThrow(/informationArchitecture/);
  });

  // TC-3.1.11
  it("allows IA=acceptable with non-empty layoutAntiPatternsDetected", () => {
    const review = buildEvaluatorReview(
      baseInput({
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "exceptional",
          usability: "exceptional",
          functionality: "exceptional",
        },
        layoutAntiPatternsDetected: ["lap-001-saas-dashboard"],
      }),
    );
    expect(review.layoutAntiPatternsDetected).toEqual(["lap-001-saas-dashboard"]);
  });

  // TC-3.1.12
  it("allows IA=weak with non-empty layoutAntiPatternsDetected", () => {
    const review = buildEvaluatorReview(
      baseInput({
        scores: {
          informationArchitecture: "weak",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        },
        layoutAntiPatternsDetected: ["lap-004-bento-grid"],
      }),
    );
    expect(review.scores.informationArchitecture).toBe("weak");
  });

  // TC-3.1.13
  it("does not cap other axes — only informationArchitecture is bounded", () => {
    const review = buildEvaluatorReview(
      baseInput({
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "exceptional",
          usability: "exceptional",
          functionality: "exceptional",
        },
        layoutAntiPatternsDetected: ["lap-001-saas-dashboard"],
      }),
    );
    expect(review.scores.navigationFlow).toBe("exceptional");
    expect(review.scores.usability).toBe("exceptional");
    expect(review.scores.functionality).toBe("exceptional");
  });

  // TC-3.1.14
  it("cap is purely a function of layoutAntiPatternsDetected presence", () => {
    const okInput = baseInput({
      scores: {
        informationArchitecture: "strong",
        navigationFlow: "acceptable",
        usability: "acceptable",
        functionality: "acceptable",
      },
      layoutAntiPatternsDetected: [],
    });
    expect(() => buildEvaluatorReview(okInput)).not.toThrow();
    const badInput = { ...okInput, layoutAntiPatternsDetected: ["lap-001-saas-dashboard"] };
    expect(() => buildEvaluatorReview(badInput)).toThrow(/informationArchitecture/);
  });

  // TC-3.1.15
  it("error message lists multiple lap ids when more than one is present", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          scores: {
            informationArchitecture: "strong",
            navigationFlow: "acceptable",
            usability: "acceptable",
            functionality: "acceptable",
          },
          layoutAntiPatternsDetected: ["lap-001-saas-dashboard", "lap-004-bento-grid"],
        }),
      ),
    ).toThrow(
      /lap-001-saas-dashboard.*lap-004-bento-grid|lap-004-bento-grid.*lap-001-saas-dashboard/,
    );
  });
});

describe("buildEvaluatorReview — designMdViolations field (TC-3.1.16..20)", () => {
  // TC-3.1.16
  it("accepts a non-empty designMdViolations array and preserves it", () => {
    const review = buildEvaluatorReview(
      baseInput({
        designMdViolations: [{ kind: "color", found: "#000000" }],
      }),
    );
    expect(review.designMdViolations).toEqual([{ kind: "color", found: "#000000" }]);
  });

  // TC-3.1.17
  it("rejects non-array designMdViolations", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          designMdViolations: "no" as unknown as BuildEvaluatorReviewInput["designMdViolations"],
        }),
      ),
    ).toThrow(/designMdViolations/);
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          designMdViolations: null as unknown as BuildEvaluatorReviewInput["designMdViolations"],
        }),
      ),
    ).toThrow(/designMdViolations/);
  });

  // TC-3.1.18
  it("rejects malformed designMdViolations entry (invalid kind)", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          designMdViolations: [
            { kind: "rainbow", found: "x" },
          ] as unknown as BuildEvaluatorReviewInput["designMdViolations"],
        }),
      ),
    ).toThrow(/designMdViolations\[0\]\.kind/);
  });

  // TC-3.1.19
  it("accepts empty designMdViolations array", () => {
    const review = buildEvaluatorReview(baseInput({ designMdViolations: [] }));
    expect(review.designMdViolations).toEqual([]);
  });

  // TC-3.1.20
  it("designMdViolations does NOT cap any axis (no error when IA=exceptional + dmv non-empty)", () => {
    const review = buildEvaluatorReview(
      baseInput({
        scores: {
          informationArchitecture: "exceptional",
          navigationFlow: "exceptional",
          usability: "exceptional",
          functionality: "exceptional",
        },
        layoutAntiPatternsDetected: [],
        designMdViolations: [{ kind: "color", found: "#000" }],
      }),
    );
    expect(review.scores.informationArchitecture).toBe("exceptional");
    expect(review.designMdViolations).toEqual([{ kind: "color", found: "#000" }]);
  });
});

describe("buildEvaluatorReview — prose word-count gate (TC-3.1.21..25)", () => {
  // TC-3.1.21
  it("accepts prose with 300 words", () => {
    const review = buildEvaluatorReview(
      baseInput({ proseCritique: Array(300).fill("word").join(" ") }),
    );
    expect(review.proseCritique.split(/\s+/).length).toBe(300);
  });

  // TC-3.1.22
  it("rejects prose with 199 words (lower boundary)", () => {
    expect(() =>
      buildEvaluatorReview(baseInput({ proseCritique: Array(199).fill("word").join(" ") })),
    ).toThrow(/proseCritique must be 200..500 words/);
  });

  // TC-3.1.23
  it("rejects prose with 501 words (upper boundary)", () => {
    expect(() =>
      buildEvaluatorReview(baseInput({ proseCritique: Array(501).fill("word").join(" ") })),
    ).toThrow(/proseCritique must be 200..500 words/);
  });

  // TC-3.1.24
  it("accepts prose with exactly 200 words", () => {
    const review = buildEvaluatorReview(
      baseInput({ proseCritique: Array(200).fill("word").join(" ") }),
    );
    expect(countWords(review.proseCritique)).toBe(200);
  });

  // TC-3.1.25
  it("accepts prose with exactly 500 words", () => {
    const review = buildEvaluatorReview(
      baseInput({ proseCritique: Array(500).fill("word").join(" ") }),
    );
    expect(countWords(review.proseCritique)).toBe(500);
  });
});

describe("countWords helper", () => {
  it("returns 0 for empty / whitespace-only input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });

  it("counts whitespace-separated tokens", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("a  b  c")).toBe(3);
    expect(countWords("foo\nbar\tbaz")).toBe(3);
  });
});

describe("buildEvaluatorReview — auxiliary input checks", () => {
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
    ).toThrow(/evidenceRefs\.screenshot/);
  });

  it("rejects pivotDirective values not in the enum", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          pivotDirective: "stop" as unknown as BuildEvaluatorReviewInput["pivotDirective"],
        }),
      ),
    ).toThrow(/pivotDirective must be one of continue\|refine\|pivot/);
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
