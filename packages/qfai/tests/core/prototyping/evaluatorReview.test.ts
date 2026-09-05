import { describe, expect, it } from "vitest";
import {
  FEEL_FIELDS,
  FEEL_FIELD_MAX_WORDS,
  ORDINAL_AXES,
  PROSE_CRITIQUE_MAX_WORDS,
  PROSE_CRITIQUE_MIN_WORDS,
  REVIEWER_TIME_BUDGET_SEC,
  buildEvaluatorReview,
  countWords,
  parseEvaluatorReview,
  type BuildEvaluatorReviewInput,
  type FeelField,
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
  it("FEEL_FIELD_MAX_WORDS is 200", () => {
    expect(FEEL_FIELD_MAX_WORDS).toBe(200);
  });
  it("FEEL_FIELDS lists the 6 *Feel keys in fixed order", () => {
    expect([...FEEL_FIELDS]).toEqual([
      "operability",
      "transitionFeel",
      "crossScreenContinuity",
      "userStoryFeel",
      "acceptanceCriteriaFeel",
      "menuReachabilityFeel",
    ]);
  });
});

// -------------------------------------------------------------------------
// Reviewer-driven per-spec / per-screen payload schema
// -------------------------------------------------------------------------

const BASE_IMPRESSIONS: Record<FeelField, string> = {
  operability: "Buttons and inputs respond predictably across the primary flows.",
  transitionFeel: "Screen transitions stay smooth without visible jank.",
  crossScreenContinuity: "Navigation preserves selected state when moving across screens.",
  userStoryFeel: "Each user story is reachable from the home screen in two taps.",
  acceptanceCriteriaFeel: "Acceptance criteria map cleanly to visible UI affordances.",
  menuReachabilityFeel: "All primary menu entries are reachable from the topbar.",
};

const baseReviewerPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  specId: "spec-0012",
  screenId: "home",
  cycle: 0,
  sessionStatus: "ok",
  retryCount: 0,
  ordinalAxes: {
    informationArchitecture: "acceptable",
    navigationFlow: "acceptable",
    usability: "acceptable",
    functionality: "acceptable",
  },
  impressions: { ...BASE_IMPRESSIONS },
  layoutAntiPatternsDetected: [],
  designMdViolations: [],
  wallTimeSec: 12.5,
  softWarnings: { timeBudget: false },
  ...overrides,
});

// QFAI:SPEC-0012:TC-0012-0364
describe("parseEvaluatorReview — full payload acceptance (TC-0012-0364)", () => {
  it("accepts a payload with nested ordinalAxes + impressions and the top-level discriminators", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        layoutAntiPatternsDetected: ["lap-001-saas-dashboard"],
        designMdViolations: [{ kind: "color", found: "#FF00FF" }],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.specId).toBe("spec-0012");
    expect(result.review.screenId).toBe("home");
    expect(result.review.sessionStatus).toBe("ok");
    expect(result.review.ordinalAxes.informationArchitecture).toBe("acceptable");
    expect(result.review.ordinalAxes.navigationFlow).toBe("acceptable");
    expect(result.review.ordinalAxes.usability).toBe("acceptable");
    expect(result.review.ordinalAxes.functionality).toBe("acceptable");
    expect(result.review.impressions.operability.length).toBeGreaterThan(0);
    expect(result.review.impressions.transitionFeel.length).toBeGreaterThan(0);
    expect(result.review.impressions.crossScreenContinuity.length).toBeGreaterThan(0);
    expect(result.review.impressions.userStoryFeel.length).toBeGreaterThan(0);
    expect(result.review.impressions.acceptanceCriteriaFeel.length).toBeGreaterThan(0);
    expect(result.review.impressions.menuReachabilityFeel.length).toBeGreaterThan(0);
    expect(result.review.layoutAntiPatternsDetected).toEqual(["lap-001-saas-dashboard"]);
    expect(result.review.designMdViolations).toEqual([{ kind: "color", found: "#FF00FF" }]);
  });
});

// QFAI:SPEC-0012:TC-0012-0365
describe("parseEvaluatorReview — rejection with named field path (TC-0012-0365)", () => {
  it.each(FEEL_FIELDS as readonly FeelField[])(
    "rejects when impressions.'%s' is missing",
    (field) => {
      const impressions: Partial<Record<FeelField, string>> = { ...BASE_IMPRESSIONS };
      Reflect.deleteProperty(impressions, field);
      const payload = baseReviewerPayload({ impressions });
      const result = parseEvaluatorReview(payload);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContain(`missing field: impressions.${field}`);
    },
  );

  it.each(ORDINAL_AXES as readonly OrdinalAxis[])(
    "rejects when ordinalAxes.'%s' is missing",
    (axis) => {
      const axes: Partial<Record<OrdinalAxis, "acceptable">> = {
        informationArchitecture: "acceptable",
        navigationFlow: "acceptable",
        usability: "acceptable",
        functionality: "acceptable",
      };
      Reflect.deleteProperty(axes, axis);
      const payload = baseReviewerPayload({ ordinalAxes: axes });
      const result = parseEvaluatorReview(payload);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors).toContain(`missing field: ordinalAxes.${axis}`);
    },
  );

  it("rejects when an unknown top-level key is present", () => {
    const result = parseEvaluatorReview(baseReviewerPayload({ extraneousKey: "nope" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /unknown field: extraneousKey/.test(e))).toBe(true);
  });

  it("rejects when an unknown nested key under impressions is present", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        impressions: { ...BASE_IMPRESSIONS, extraImpression: "nope" },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /unknown field: impressions\.extraImpression/.test(e))).toBe(
      true,
    );
  });

  it("rejects when an unknown nested key under ordinalAxes is present", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        ordinalAxes: {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
          extraAxis: "strong",
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /unknown field: ordinalAxes\.extraAxis/.test(e))).toBe(true);
  });

  it("rejects when input is not a JSON object", () => {
    expect(parseEvaluatorReview(null).ok).toBe(false);
    expect(parseEvaluatorReview("string").ok).toBe(false);
    expect(parseEvaluatorReview([]).ok).toBe(false);
  });

  it("rejects when specId is missing or empty", () => {
    const payload = baseReviewerPayload();
    delete payload.specId;
    const missing = parseEvaluatorReview(payload);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors).toContain("missing field: specId");
    }
    const empty = parseEvaluatorReview(baseReviewerPayload({ specId: "" }));
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.errors.some((e) => /specId must be a non-empty string/.test(e))).toBe(true);
    }
  });

  it("rejects when screenId is missing or empty", () => {
    const payload = baseReviewerPayload();
    delete payload.screenId;
    const missing = parseEvaluatorReview(payload);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors).toContain("missing field: screenId");
    }
    const empty = parseEvaluatorReview(baseReviewerPayload({ screenId: "" }));
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.errors.some((e) => /screenId must be a non-empty string/.test(e))).toBe(true);
    }
  });

  it.each(["ok", "retryExhausted", "launchFailed"] as const)(
    "accepts sessionStatus '%s'",
    (status) => {
      const result = parseEvaluatorReview(baseReviewerPayload({ sessionStatus: status }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.review.sessionStatus).toBe(status);
    },
  );

  it("rejects when sessionStatus is missing or not in the enum", () => {
    const payload = baseReviewerPayload();
    delete payload.sessionStatus;
    const missing = parseEvaluatorReview(payload);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors).toContain("missing field: sessionStatus");
    }
    const bad = parseEvaluatorReview(baseReviewerPayload({ sessionStatus: "pending" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(
        bad.errors.some((e) =>
          /sessionStatus must be one of ok\|retryExhausted\|launchFailed/.test(e),
        ),
      ).toBe(true);
    }
  });

  it("rejects when ordinalAxes is not a record", () => {
    const result = parseEvaluatorReview(baseReviewerPayload({ ordinalAxes: "nope" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("ordinalAxes must be an object");
  });

  it("rejects when impressions is not a record", () => {
    const result = parseEvaluatorReview(baseReviewerPayload({ impressions: [] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("impressions must be an object");
  });
});

// QFAI:SPEC-0012:TC-0012-0366
describe("parseEvaluatorReview — impressions.*Feel word-count bounds (TC-0012-0366)", () => {
  it.each(FEEL_FIELDS as readonly FeelField[])(
    "rejects impressions.'%s' at 201 words (boundary +1)",
    (field) => {
      const overflow = Array(201).fill("word").join(" ");
      const impressions = { ...BASE_IMPRESSIONS, [field]: overflow };
      const result = parseEvaluatorReview(baseReviewerPayload({ impressions }));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(
        result.errors.some(
          (e) => e.includes(`impressions.${field}`) && /exceeds 200 words \(got 201\)/.test(e),
        ),
      ).toBe(true);
    },
  );

  it.each(FEEL_FIELDS as readonly FeelField[])(
    "accepts impressions.'%s' at exactly 200 words (boundary)",
    (field) => {
      const exact = Array(200).fill("word").join(" ");
      const impressions = { ...BASE_IMPRESSIONS, [field]: exact };
      const result = parseEvaluatorReview(baseReviewerPayload({ impressions }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(countWords(result.review.impressions[field])).toBe(200);
    },
  );

  it.each(FEEL_FIELDS as readonly FeelField[])("accepts impressions.'%s' at 1 word", (field) => {
    const impressions = { ...BASE_IMPRESSIONS, [field]: "ok" };
    const result = parseEvaluatorReview(baseReviewerPayload({ impressions }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(countWords(result.review.impressions[field])).toBe(1);
  });
});

// QFAI:SPEC-0012:TC-0012-0384
describe("parseEvaluatorReview — menuReachabilityFeel non-failure (TC-0012-0384)", () => {
  it("accepts a payload describing unreachable entries (no hard-fail)", () => {
    const impressions = {
      ...BASE_IMPRESSIONS,
      menuReachabilityFeel:
        "Settings entry is unreachable from the topbar; account dropdown collapses too early.",
    };
    const result = parseEvaluatorReview(baseReviewerPayload({ impressions }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.impressions.menuReachabilityFeel).toMatch(/unreachable/);
  });
});

// QFAI:SPEC-0012:TC-0012-0387 — replaced in 11th late-review wave to align with
// the CLI contract §Review payload SSOT (`.qfai/contracts/cli/qfai-prototyping.md`
// L161-200). The legacy flat `timeBudgetSoftWarning?: string` field has been
// removed in favor of the SSOT-compliant required `softWarnings.timeBudget: boolean`
// nested form.
describe("parseEvaluatorReview — softWarnings.timeBudget (TC-0012-0387)", () => {
  it("accepts softWarnings.timeBudget = true and surfaces it on the parsed payload", () => {
    // `timeBudget` is derived from `wallTimeSec`, so the over-budget
    // wall time has to come with it.
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        wallTimeSec: REVIEWER_TIME_BUDGET_SEC + 1,
        softWarnings: { timeBudget: true },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.softWarnings.timeBudget).toBe(true);
  });

  it("accepts softWarnings.timeBudget = false and surfaces it on the parsed payload", () => {
    const result = parseEvaluatorReview(baseReviewerPayload());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.softWarnings.timeBudget).toBe(false);
  });

  it("rejects when softWarnings is missing", () => {
    const payload = baseReviewerPayload();
    delete payload.softWarnings;
    const result = parseEvaluatorReview(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("missing field: softWarnings");
  });

  it("rejects when softWarnings is not an object", () => {
    const result = parseEvaluatorReview(baseReviewerPayload({ softWarnings: "nope" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("softWarnings must be an object");
  });

  it("rejects when softWarnings.timeBudget is missing", () => {
    const result = parseEvaluatorReview(baseReviewerPayload({ softWarnings: {} }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("missing field: softWarnings.timeBudget");
  });

  it("rejects when softWarnings.timeBudget is not a boolean", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({ softWarnings: { timeBudget: "true" } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /softWarnings\.timeBudget must be a boolean/.test(e))).toBe(
      true,
    );
  });

  it("rejects unknown nested keys under softWarnings", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({ softWarnings: { timeBudget: false, extraWarn: true } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /unknown field: softWarnings\.extraWarn/.test(e))).toBe(true);
  });

  // The shipped reference declares the payload closed at EVERY level.
  // `designMdViolations[]` elements were the one nested object whose
  // key set was never checked, so `{kind, found, severity}` passed and
  // the unknown data was silently dropped.
  it("rejects unknown keys inside a designMdViolations[] element", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        designMdViolations: [{ kind: "color", found: "#fff", severity: "blocking" }],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.errors.some((e) => /unknown field: designMdViolations\[0\]\.severity/.test(e)),
    ).toBe(true);
  });

  it("still accepts a well-formed designMdViolations[] element", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({ designMdViolations: [{ kind: "color", found: "#fff" }] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.designMdViolations).toEqual([{ kind: "color", found: "#fff" }]);
  });

  it("rejects the legacy flat timeBudgetSoftWarning key (closed-schema regression)", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        timeBudgetSoftWarning: "legacy flat string",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /unknown field: timeBudgetSoftWarning/.test(e))).toBe(true);
  });
});

// 11th late-review wave: the CLI contract §Review payload SSOT requires
// 11 top-level fields. Verify the new required fields are validated.
// QFAI:SPEC-0012:TC-0012-0417 — closed-schema validation of the new
// required fields surfaced by CHG-002 (cycle / retryCount / wallTimeSec
// / softWarnings). Wave-13 added the upper-bound regression
// (`cycle > MAX_ITERATION_INDEX`) to close the closed-schema gap noted
// by codex r3265809796 / r3265811203 / r3265814987.
describe("parseEvaluatorReview — new required fields (cycle / retryCount / wallTimeSec)", () => {
  it("rejects when cycle is missing", () => {
    const payload = baseReviewerPayload();
    delete payload.cycle;
    const result = parseEvaluatorReview(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("missing field: cycle");
  });

  it("rejects when cycle is not a non-negative integer", () => {
    const negative = parseEvaluatorReview(baseReviewerPayload({ cycle: -1 }));
    expect(negative.ok).toBe(false);
    if (!negative.ok) {
      expect(negative.errors.some((e) => /cycle must be a non-negative integer/.test(e))).toBe(
        true,
      );
    }
    const fractional = parseEvaluatorReview(baseReviewerPayload({ cycle: 1.5 }));
    expect(fractional.ok).toBe(false);
    const stringy = parseEvaluatorReview(baseReviewerPayload({ cycle: "0" }));
    expect(stringy.ok).toBe(false);
  });

  // 13th late-review wave: codex r3265814987 / r3265811203 — the CLI contract
  // pins `cycle: 0..MAX_ITERATION_INDEX` (currently 0..9); the parser must
  // reject `cycle > 9` so reviewer-emitted payloads cannot bypass the
  // closed-schema contract via the upper-bound gap.
  it("rejects when cycle exceeds MAX_ITERATION_INDEX (10 / 99 / 100)", () => {
    for (const bad of [10, 99, 100]) {
      const result = parseEvaluatorReview(baseReviewerPayload({ cycle: bad }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => /cycle must be <= 9/.test(e))).toBe(true);
      }
    }
  });

  it("rejects when retryCount is missing", () => {
    const payload = baseReviewerPayload();
    delete payload.retryCount;
    const result = parseEvaluatorReview(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("missing field: retryCount");
  });

  it("rejects when retryCount is not a non-negative integer", () => {
    const result = parseEvaluatorReview(baseReviewerPayload({ retryCount: -2 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /retryCount must be a non-negative integer/.test(e))).toBe(
      true,
    );
  });

  it("rejects when wallTimeSec is missing", () => {
    const payload = baseReviewerPayload();
    delete payload.wallTimeSec;
    const result = parseEvaluatorReview(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("missing field: wallTimeSec");
  });

  it("rejects when wallTimeSec is negative / non-finite / non-numeric", () => {
    const negative = parseEvaluatorReview(baseReviewerPayload({ wallTimeSec: -0.1 }));
    expect(negative.ok).toBe(false);
    const infinite = parseEvaluatorReview(baseReviewerPayload({ wallTimeSec: Infinity }));
    expect(infinite.ok).toBe(false);
    const stringy = parseEvaluatorReview(baseReviewerPayload({ wallTimeSec: "12" }));
    expect(stringy.ok).toBe(false);
  });

  it("accepts a full SSOT-compliant payload with all 11 required fields", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        cycle: 3,
        retryCount: 1,
        // Over the 300 s per-session cap, so `timeBudget: true` is the
        // value the derived rule requires.
        wallTimeSec: 420.7,
        softWarnings: { timeBudget: true },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.cycle).toBe(3);
    expect(result.review.retryCount).toBe(1);
    expect(result.review.wallTimeSec).toBe(420.7);
    expect(result.review.softWarnings.timeBudget).toBe(true);
  });
});

// The shipped reference defines `softWarnings.timeBudget` as
// `wallTimeSec > REVIEWER_TIME_BUDGET_SEC`, not as free-standing state.
// Type-checking the boolean alone let a 301-second session persist
// `timeBudget: false` and carry over-budget evidence through certify
// unflagged.
describe("parseEvaluatorReview — softWarnings.timeBudget is derived from wallTimeSec", () => {
  it("rejects an over-budget session that switched the warning off", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        wallTimeSec: REVIEWER_TIME_BUDGET_SEC + 1,
        softWarnings: { timeBudget: false },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("softWarnings.timeBudget must be true"))).toBe(
      true,
    );
  });

  it("rejects an in-budget session that switched the warning on", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        wallTimeSec: REVIEWER_TIME_BUDGET_SEC,
        softWarnings: { timeBudget: true },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("softWarnings.timeBudget must be false"))).toBe(
      true,
    );
  });

  it("accepts both consistent combinations, with the cap itself in budget", () => {
    const atCap = parseEvaluatorReview(
      baseReviewerPayload({
        wallTimeSec: REVIEWER_TIME_BUDGET_SEC,
        softWarnings: { timeBudget: false },
      }),
    );
    expect(atCap.ok).toBe(true);
    const overCap = parseEvaluatorReview(
      baseReviewerPayload({
        wallTimeSec: REVIEWER_TIME_BUDGET_SEC + 0.5,
        softWarnings: { timeBudget: true },
      }),
    );
    expect(overCap.ok).toBe(true);
  });
});
