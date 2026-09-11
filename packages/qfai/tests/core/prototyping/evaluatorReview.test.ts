import { describe, expect, it } from "vitest";
import {
  FEEL_FIELDS,
  FEEL_FIELD_MAX_WORDS,
  PROSE_CRITIQUE_MAX_CJK_CHARS,
  PROSE_CRITIQUE_MAX_WORDS,
  REVIEWER_TIME_BUDGET_SEC,
  buildEvaluatorReview,
  countWords,
  parseEvaluatorReview,
  type BuildEvaluatorReviewInput,
  type FeelField,
} from "../../../src/core/prototyping/evaluatorReview.js";

const baseInput = (
  overrides: Partial<BuildEvaluatorReviewInput> = {},
): BuildEvaluatorReviewInput => ({
  iterIndex: 0,
  reviewerId: "product-surface-reviewer",
  blockingFindings: ["home: the empty state is not represented"],
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

describe("buildEvaluatorReview — blockingFindings (TC-3.1.1..7)", () => {
  // TC-3.1.1
  it("accepts a review carrying findings and preserves them", () => {
    const review = buildEvaluatorReview(
      baseInput({
        blockingFindings: ["home: the empty state is not represented"],
      }),
    );
    expect(review.blockingFindings).toEqual(["home: the empty state is not represented"]);
    expect(review.layoutAntiPatternsDetected).toEqual([]);
    expect(review.designMdViolations).toEqual([]);
  });

  // TC-3.1.2 — the converged shape. Nothing open is the expected end of the
  // loop, so it has to be constructible.
  it("accepts a review with no findings", () => {
    const review = buildEvaluatorReview(baseInput({ blockingFindings: [] }));
    expect(review.blockingFindings).toEqual([]);
  });

  // TC-3.1.3
  it("preserves the order the reviewer wrote", () => {
    const findings = ["home: no way back", "settings: the error state is unreachable"];
    const review = buildEvaluatorReview(baseInput({ blockingFindings: findings }));
    expect(review.blockingFindings).toEqual(findings);
  });

  // TC-3.1.4
  it("copies the array instead of aliasing the caller's", () => {
    const findings = ["home: no way back"];
    const review = buildEvaluatorReview(baseInput({ blockingFindings: findings }));
    findings.push("mutated after the fact");
    expect(review.blockingFindings).toEqual(["home: no way back"]);
  });

  // TC-3.1.5
  it.each([["no"], [null], [undefined], [5], [{}]])("rejects a non-array %p", (invalid) => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          blockingFindings: invalid as unknown as BuildEvaluatorReviewInput["blockingFindings"],
        }),
      ),
    ).toThrow(/blockingFindings/);
  });

  // TC-3.1.6
  it.each([[""], ["   "], [null], [undefined], [5]])(
    "rejects %p as an entry — a finding with no text names nothing",
    (invalid) => {
      expect(() =>
        buildEvaluatorReview(
          baseInput({
            blockingFindings: [invalid] as unknown as BuildEvaluatorReviewInput["blockingFindings"],
          }),
        ),
      ).toThrow(/blockingFindings\[0\]/);
    },
  );

  // TC-3.1.7
  it("names the offending index when a later entry is empty", () => {
    expect(() =>
      buildEvaluatorReview(
        baseInput({
          blockingFindings: [
            "home: no way back",
            "",
          ] as unknown as BuildEvaluatorReviewInput["blockingFindings"],
        }),
      ),
    ).toThrow(/blockingFindings\[1\]/);
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
  it("a designMdViolation does not become a blocking finding on its own", () => {
    const review = buildEvaluatorReview(
      baseInput({
        blockingFindings: [],
        layoutAntiPatternsDetected: [],
        designMdViolations: [{ kind: "color", found: "#000" }],
      }),
    );
    expect(review.blockingFindings).toEqual([]);
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

  // TC-3.1.22 — the rule has no lower boundary. A critique reporting one
  // finding is complete, and rejecting it only taught a reviewer to pad.
  it("accepts prose with 199 words", () => {
    const review = buildEvaluatorReview(
      baseInput({ proseCritique: Array(199).fill("word").join(" ") }),
    );
    expect(countWords(review.proseCritique)).toBe(199);
  });

  // TC-3.1.23
  it("rejects prose with 501 words (upper boundary)", () => {
    expect(() =>
      buildEvaluatorReview(baseInput({ proseCritique: Array(501).fill("word").join(" ") })),
    ).toThrow(/proseCritique 501 words over the 500-word cap/);
  });

  // The constructor used to carry its own English-only copy of the rule,
  // so a Japanese critique the on-disk validator accepted threw here.
  // Both now call the same function.
  it("accepts a Japanese critique the on-disk validator accepts", () => {
    const review = buildEvaluatorReview(baseInput({ proseCritique: "あ".repeat(800) }));
    expect(review.proseCritique).toHaveLength(800);
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
  it("PROSE_CRITIQUE_MAX_WORDS is 500", () => {
    expect(PROSE_CRITIQUE_MAX_WORDS).toBe(500);
  });
  it("PROSE_CRITIQUE_MAX_CJK_CHARS is 2500", () => {
    expect(PROSE_CRITIQUE_MAX_CJK_CHARS).toBe(2500);
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
  blockingFindings: ["home: the empty state is not represented"],
  impressions: { ...BASE_IMPRESSIONS },
  layoutAntiPatternsDetected: [],
  designMdViolations: [],
  wallTimeSec: 12.5,
  softWarnings: { timeBudget: false },
  ...overrides,
});

// QFAI:SPEC-0012:TC-0012-0364
describe("parseEvaluatorReview — full payload acceptance (TC-0012-0364)", () => {
  it("accepts a payload with blockingFindings, impressions and the top-level discriminators", () => {
    const result = parseEvaluatorReview(
      baseReviewerPayload({
        layoutAntiPatternsDetected: ["lap-006-overcrowded-sidebar"],
        designMdViolations: [{ kind: "color", found: "#FF00FF" }],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.specId).toBe("spec-0012");
    expect(result.review.screenId).toBe("home");
    expect(result.review.sessionStatus).toBe("ok");
    expect(result.review.blockingFindings).toEqual(["home: the empty state is not represented"]);
    expect(result.review.impressions.operability.length).toBeGreaterThan(0);
    expect(result.review.impressions.transitionFeel.length).toBeGreaterThan(0);
    expect(result.review.impressions.crossScreenContinuity.length).toBeGreaterThan(0);
    expect(result.review.impressions.userStoryFeel.length).toBeGreaterThan(0);
    expect(result.review.impressions.acceptanceCriteriaFeel.length).toBeGreaterThan(0);
    expect(result.review.impressions.menuReachabilityFeel.length).toBeGreaterThan(0);
    expect(result.review.layoutAntiPatternsDetected).toEqual(["lap-006-overcrowded-sidebar"]);
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

  it("rejects when blockingFindings is missing", () => {
    const payload = baseReviewerPayload();
    Reflect.deleteProperty(payload, "blockingFindings");
    const result = parseEvaluatorReview(payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("missing field: blockingFindings");
  });

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

  it("rejects when blockingFindings is not an array", () => {
    const result = parseEvaluatorReview(baseReviewerPayload({ blockingFindings: "nope" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("blockingFindings must be an array of strings");
  });

  it("rejects a blockingFindings entry that is not a string", () => {
    const result = parseEvaluatorReview(baseReviewerPayload({ blockingFindings: [5] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /blockingFindings\[0\]/.test(e))).toBe(true);
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

// QFAI:SPEC-0012:TC-0012-0387 — aligns with
// the CLI contract §Review payload SSOT (`.qfai/contracts/cli/qfai-prototyping.md`
// L161-200). The legacy flat `timeBudgetSoftWarning?: string` field is
// replaced by the SSOT-compliant required `softWarnings.timeBudget: boolean`
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

// The CLI contract §Review payload SSOT requires
// 11 top-level fields. Verify the new required fields are validated.
// QFAI:SPEC-0012:TC-0012-0417 — closed-schema validation of the new
// required fields from CHG-002 (cycle / retryCount / wallTimeSec
// / softWarnings), including the upper-bound regression
// (`cycle > MAX_ITERATION_INDEX`) that closes the closed-schema gap.
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

  // The CLI contract pins `cycle: 0..MAX_ITERATION_INDEX` (currently 0..9);
  // the parser must reject `cycle > 9` so reviewer-emitted payloads cannot
  // bypass the closed-schema contract via the upper-bound gap.
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
