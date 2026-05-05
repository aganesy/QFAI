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
  it.each([
    "informationArchitecture",
    "navigationFlow",
    "usability",
    "functionality",
  ] as const)("returns null when axis '%s' is below exceptional", (axis) => {
    const iter = baseIter({ scores: { ...allExceptional, [axis]: "strong" } });
    expect(shouldStop([iter])).toBeNull();
  });

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
  it("MAX_ITERATIONS is 15", () => {
    expect(MAX_ITERATIONS).toBe(15);
  });

  it("MAX_ITERATION_INDEX is 14", () => {
    expect(MAX_ITERATION_INDEX).toBe(14);
  });
});
