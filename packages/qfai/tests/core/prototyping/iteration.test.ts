import { describe, expect, it } from "vitest";
import {
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  allFourAxesExceptional,
  isOrdinalScore,
  isPivotDirective,
  iterationDir,
  iterationHtmlPath,
  iterationReviewPath,
  iterationScreenshotPath,
  shouldStop,
  shouldStopAcrossSpecs,
  type Iteration,
} from "../../../src/core/prototyping/iteration.js";

const baseIter = (overrides: Partial<Iteration> = {}): Iteration => ({
  index: 0,
  commitSha: "a".repeat(40),
  scores: {
    informationArchitecture: "acceptable",
    navigationFlow: "acceptable",
    usability: "acceptable",
    functionality: "acceptable",
  },
  proseCritique: "x".repeat(1500),
  layoutAntiPatternsDetected: [],
  designMdViolations: [],
  pivotDirective: "continue",
  evidenceRefs: {
    screenshot: ".qfai/evidence/prototyping/iter-00/home.png",
    html: ".qfai/evidence/prototyping/iter-00/home.html",
  },
  ...overrides,
});

const allExceptional: Iteration["scores"] = {
  informationArchitecture: "exceptional",
  navigationFlow: "exceptional",
  usability: "exceptional",
  functionality: "exceptional",
};

describe("shouldStop — convergence (TC-3.4.x)", () => {
  it("returns null when no iters", () => {
    expect(shouldStop([])).toBeNull();
  });

  // TC-3.4.1
  it("returns axes-exceptional when all 4 NEW axes exceptional + lap=[] + dmv=[]", () => {
    const iter = baseIter({ scores: allExceptional });
    expect(shouldStop([iter])).toBe("axes-exceptional");
  });

  // TC-3.4.2
  it.each(["informationArchitecture", "navigationFlow", "usability", "functionality"] as const)(
    "returns null when axis '%s' is below exceptional",
    (axis) => {
      const iter = baseIter({ scores: { ...allExceptional, [axis]: "strong" } });
      expect(shouldStop([iter])).toBeNull();
    },
  );

  // TC-3.4.3
  it("returns null when layoutAntiPatternsDetected is non-empty (other conditions met)", () => {
    const iter = baseIter({
      scores: allExceptional,
      layoutAntiPatternsDetected: ["lap-001-saas-dashboard"],
    });
    expect(shouldStop([iter])).toBeNull();
  });

  // TC-3.4.4
  it("returns null when designMdViolations is non-empty (other conditions met)", () => {
    const iter = baseIter({
      scores: allExceptional,
      designMdViolations: [{ kind: "color", found: "#000" }],
    });
    expect(shouldStop([iter])).toBeNull();
  });

  // TC-3.4.5
  it("max-iterations triggers regardless of designMdViolations", () => {
    const iter = baseIter({
      index: MAX_ITERATION_INDEX,
      designMdViolations: [{ kind: "color", found: "#abcdef" }],
    });
    expect(shouldStop([iter])).toBe("max-iterations");
  });

  // TC-3.4.6
  it("only the latest iter is checked across an iterations array", () => {
    const nonConverged = baseIter({ index: 0 });
    const converged = baseIter({ index: 1, scores: allExceptional });
    expect(shouldStop([nonConverged, converged])).toBe("axes-exceptional");
  });

  // TC-3.4.7
  it.each([
    {
      label: "axis weak",
      scores: { ...allExceptional, usability: "weak" as const },
      lap: [] as string[],
      dmv: [] as Array<{ kind: "color"; found: string }>,
    },
    {
      label: "lap non-empty",
      scores: allExceptional,
      lap: ["lap-001-saas-dashboard"],
      dmv: [],
    },
    {
      label: "dmv non-empty",
      scores: allExceptional,
      lap: [],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
    {
      label: "axis weak + lap",
      scores: { ...allExceptional, usability: "weak" as const },
      lap: ["lap-001-saas-dashboard"],
      dmv: [],
    },
    {
      label: "axis weak + dmv",
      scores: { ...allExceptional, usability: "weak" as const },
      lap: [],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
    {
      label: "lap + dmv",
      scores: allExceptional,
      lap: ["lap-001-saas-dashboard"],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
    {
      label: "all three trip-wires",
      scores: { ...allExceptional, usability: "weak" as const },
      lap: ["lap-001-saas-dashboard"],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
  ])("returns null for trip-wire combination: $label", ({ scores, lap, dmv }) => {
    const iter = baseIter({
      scores,
      layoutAntiPatternsDetected: lap,
      designMdViolations: dmv,
    });
    expect(shouldStop([iter])).toBeNull();
  });

  it("max-iterations takes priority over weak scores at last index", () => {
    const iter = baseIter({
      index: MAX_ITERATION_INDEX,
      scores: {
        informationArchitecture: "weak",
        navigationFlow: "weak",
        usability: "weak",
        functionality: "weak",
      },
    });
    expect(shouldStop([iter])).toBe("max-iterations");
  });

  it("returns null instead of throwing when the latest iter is malformed", () => {
    expect(shouldStop([{ index: 1, commitSha: "b".repeat(40) }])).toBeNull();
  });

  // QFAI:SPEC-0012:TC-0012-0357
  it("shouldStop boundary at index === 9 (TC-0012-0357, TDD-0372)", () => {
    expect(shouldStop([baseIter({ index: 9 })])).toBe("max-iterations");
    expect(shouldStop([baseIter({ index: 8 })])).toBeNull();
  });

  // QFAI:SPEC-0012:TC-0012-0369
  it("shouldStop ignores any quantitative pass-rate fields (TC-0012-0369, TDD-0375)", () => {
    // Negative assertion: convergence logic must depend ONLY on the
    // ordinal axes + lap empty + designMdViolations empty. Synthesize an
    // iteration record with fabricated `acPassPercent` /
    // `transitionPassPercent` quantitative fields and confirm the
    // decision is unchanged. Concretely:
    //   1. With all 4 axes exceptional + lap=[] + dmv=[], shouldStop
    //      returns "axes-exceptional" regardless of the extra numeric
    //      fields (even when set to values that, under a hypothetical
    //      pass-rate gate, would block convergence).
    //   2. With weak/partial axes (other conditions met), shouldStop
    //      returns null regardless of the extra numeric fields (even
    //      when set to values that would pass a hypothetical gate).
    // Mutating these fields across runs must not flip the decision.
    const exceptionalIter = baseIter({ scores: allExceptional });
    const exceptionalLowPassRate: Iteration & {
      acPassPercent: number;
      transitionPassPercent: number;
    } = {
      ...exceptionalIter,
      acPassPercent: 0.0,
      transitionPassPercent: 0.0,
    };
    const exceptionalHighPassRate: Iteration & {
      acPassPercent: number;
      transitionPassPercent: number;
    } = {
      ...exceptionalIter,
      acPassPercent: 1.0,
      transitionPassPercent: 1.0,
    };
    expect(shouldStop([exceptionalLowPassRate])).toBe("axes-exceptional");
    expect(shouldStop([exceptionalHighPassRate])).toBe("axes-exceptional");

    const weakIter = baseIter({
      scores: { ...allExceptional, usability: "weak" },
    });
    const weakHighPassRate: Iteration & {
      acPassPercent: number;
      transitionPassPercent: number;
    } = {
      ...weakIter,
      acPassPercent: 1.0,
      transitionPassPercent: 1.0,
    };
    const weakLowPassRate: Iteration & {
      acPassPercent: number;
      transitionPassPercent: number;
    } = {
      ...weakIter,
      acPassPercent: 0.0,
      transitionPassPercent: 0.0,
    };
    expect(shouldStop([weakHighPassRate])).toBeNull();
    expect(shouldStop([weakLowPassRate])).toBeNull();
  });
});

describe("shouldStopAcrossSpecs — multi-spec AND convergence", () => {
  const exceptionalIter = baseIter({ scores: allExceptional });
  const laggingIter = baseIter({
    scores: { ...allExceptional, functionality: "strong" },
  });

  // QFAI:SPEC-0012:TC-0012-0367
  it("returns null when 2/3 pairs are all-exceptional and the 3rd is below on one axis (TC-0012-0367, TDD-0376)", () => {
    const result = shouldStopAcrossSpecs([
      { specId: "spec-0007", screen: "dashboard", latestIteration: exceptionalIter },
      { specId: "spec-0007", screen: "detail", latestIteration: exceptionalIter },
      { specId: "spec-0011", screen: "list", latestIteration: laggingIter },
    ]);
    expect(result.stopReason).toBeNull();
  });

  // QFAI:SPEC-0012:TC-0012-0367
  it("returns axes-exceptional when all 3 pairs are all-exceptional (TC-0012-0367, TDD-0376)", () => {
    const result = shouldStopAcrossSpecs([
      { specId: "spec-0007", screen: "dashboard", latestIteration: exceptionalIter },
      { specId: "spec-0007", screen: "detail", latestIteration: exceptionalIter },
      { specId: "spec-0011", screen: "list", latestIteration: exceptionalIter },
    ]);
    expect(result.stopReason).toBe("axes-exceptional");
    expect(result.laggingSpecs).toEqual([]);
  });

  // QFAI:SPEC-0012:TC-0012-0368
  it("names every lagging spec in laggingSpecs[] when convergence not achieved (TC-0012-0368, TDD-0377)", () => {
    const result = shouldStopAcrossSpecs([
      { specId: "spec-0007", screen: "dashboard", latestIteration: exceptionalIter },
      { specId: "spec-0011", screen: "list", latestIteration: laggingIter },
      { specId: "spec-0013", screen: "page", latestIteration: laggingIter },
    ]);
    expect(result.stopReason).toBeNull();
    expect(result.laggingSpecs).toEqual(["spec-0011", "spec-0013"]);
  });
});

describe("allFourAxesExceptional", () => {
  // TC-3.4.8
  it("returns false for an iteration object built with the OLD axis names", () => {
    const oldShape = {
      index: 0,
      commitSha: "a".repeat(40),
      scores: {
        designQuality: "exceptional",
        originality: "exceptional",
        craft: "exceptional",
        functionality: "exceptional",
      },
      proseCritique: "x".repeat(1500),
      slopPatternsDetected: [],
      pivotDirective: "continue",
      evidenceRefs: {
        screenshot: "x.png",
        html: "x.html",
      },
    };
    expect(allFourAxesExceptional(oldShape)).toBe(false);
  });

  // TC-3.4.9
  it("returns true for the canonical new-shape converged iteration", () => {
    const iter = baseIter({ scores: allExceptional });
    expect(allFourAxesExceptional(iter)).toBe(true);
  });

  it("requires designMdViolations to be empty", () => {
    const iter = baseIter({
      scores: allExceptional,
      designMdViolations: [{ kind: "color", found: "#abcdef" }],
    });
    expect(allFourAxesExceptional(iter)).toBe(false);
  });

  it("requires layoutAntiPatternsDetected to be empty", () => {
    const iter = baseIter({
      scores: allExceptional,
      layoutAntiPatternsDetected: ["lap-001-saas-dashboard"],
    });
    expect(allFourAxesExceptional(iter)).toBe(false);
  });

  it("returns false for malformed iteration-like values", () => {
    expect(allFourAxesExceptional({ index: 0, scores: null })).toBe(false);
  });
});

describe("iteration paths", () => {
  it("zero-pads index", () => {
    expect(iterationDir(0)).toBe(".qfai/evidence/prototyping/iter-00");
    expect(iterationDir(7)).toBe(".qfai/evidence/prototyping/iter-07");
    expect(iterationDir(14)).toBe(".qfai/evidence/prototyping/iter-14");
  });

  it("composes per-screen html path", () => {
    expect(iterationHtmlPath(7, "home")).toBe(".qfai/evidence/prototyping/iter-07/home.html");
  });

  it("composes per-screen screenshot path", () => {
    expect(iterationScreenshotPath(3, "checkout")).toBe(
      ".qfai/evidence/prototyping/iter-03/checkout.png",
    );
  });

  it("composes review path", () => {
    expect(iterationReviewPath(12)).toBe(".qfai/evidence/prototyping/iter-12/review.json");
  });
});

describe("type guards", () => {
  it("isOrdinalScore accepts the 4 levels", () => {
    expect(isOrdinalScore("weak")).toBe(true);
    expect(isOrdinalScore("acceptable")).toBe(true);
    expect(isOrdinalScore("strong")).toBe(true);
    expect(isOrdinalScore("exceptional")).toBe(true);
  });

  it("isOrdinalScore rejects other values", () => {
    expect(isOrdinalScore("ok")).toBe(false);
    expect(isOrdinalScore(85)).toBe(false);
    expect(isOrdinalScore(null)).toBe(false);
  });

  it("isPivotDirective accepts the 3 levels", () => {
    expect(isPivotDirective("continue")).toBe(true);
    expect(isPivotDirective("refine")).toBe(true);
    expect(isPivotDirective("pivot")).toBe(true);
  });

  it("isPivotDirective rejects other values", () => {
    expect(isPivotDirective("stop")).toBe(false);
    expect(isPivotDirective(undefined)).toBe(false);
  });
});

describe("constants", () => {
  // QFAI:SPEC-0012:TC-0012-0359
  it("MAX_ITERATIONS === 10 and MAX_ITERATION_INDEX === 9 (TC-0012-0359, TDD-0371)", () => {
    expect(MAX_ITERATIONS).toBe(10);
    expect(MAX_ITERATION_INDEX).toBe(9);
  });
});
