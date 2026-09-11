import { describe, expect, it } from "vitest";
import {
  MAX_ITERATIONS,
  MAX_ITERATION_INDEX,
  iterationConverged,
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
  blockingFindings: ["home: the empty state is not represented"],
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

describe("shouldStop — convergence (TC-3.4.x)", () => {
  it("returns null when no iters", () => {
    expect(shouldStop([])).toBeNull();
  });

  // TC-3.4.1
  it("returns converged when all three arrays are empty", () => {
    const iter = baseIter({ blockingFindings: [] });
    expect(shouldStop([iter])).toBe("converged");
  });

  // TC-3.4.2
  it("returns null when a finding is open", () => {
    const iter = baseIter({ blockingFindings: ["home: no way back"] });
    expect(shouldStop([iter])).toBeNull();
  });

  // TC-3.4.3
  it("returns null when layoutAntiPatternsDetected is non-empty (other conditions met)", () => {
    const iter = baseIter({
      blockingFindings: [],
      layoutAntiPatternsDetected: ["lap-006-overcrowded-sidebar"],
    });
    expect(shouldStop([iter])).toBeNull();
  });

  // TC-3.4.4
  it("returns null when designMdViolations is non-empty (other conditions met)", () => {
    const iter = baseIter({
      blockingFindings: [],
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
    const converged = baseIter({ index: 1, blockingFindings: [] });
    expect(shouldStop([nonConverged, converged])).toBe("converged");
  });

  // TC-3.4.7
  it.each([
    {
      label: "a blocking finding",
      blockingFindings: ["home: the empty state is not represented"],
      lap: [] as string[],
      dmv: [] as Array<{ kind: "color"; found: string }>,
    },
    {
      label: "lap non-empty",
      blockingFindings: [],
      lap: ["lap-006-overcrowded-sidebar"],
      dmv: [],
    },
    {
      label: "dmv non-empty",
      blockingFindings: [],
      lap: [],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
    {
      label: "a blocking finding + lap",
      blockingFindings: ["home: the empty state is not represented"],
      lap: ["lap-006-overcrowded-sidebar"],
      dmv: [],
    },
    {
      label: "a blocking finding + dmv",
      blockingFindings: ["home: the empty state is not represented"],
      lap: [],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
    {
      label: "lap + dmv",
      blockingFindings: [],
      lap: ["lap-006-overcrowded-sidebar"],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
    {
      label: "all three trip-wires",
      blockingFindings: ["home: the empty state is not represented"],
      lap: ["lap-006-overcrowded-sidebar"],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
  ])("returns null for trip-wire combination: $label", ({ blockingFindings, lap, dmv }) => {
    const iter = baseIter({
      blockingFindings,
      layoutAntiPatternsDetected: lap,
      designMdViolations: dmv,
    });
    expect(shouldStop([iter])).toBeNull();
  });

  it("max-iterations takes priority over an open finding at the last index", () => {
    const iter = baseIter({
      index: MAX_ITERATION_INDEX,
      blockingFindings: ["home: the empty state is not represented"],
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
    //   1. With nothing open, shouldStop
    //      returns "converged" regardless of the extra numeric
    //      fields (even when set to values that, under a hypothetical
    //      pass-rate gate, would block convergence).
    //   2. With weak/partial axes (other conditions met), shouldStop
    //      returns null regardless of the extra numeric fields (even
    //      when set to values that would pass a hypothetical gate).
    // Mutating these fields across runs must not flip the decision.
    const convergedIter = baseIter({ blockingFindings: [] });
    const convergedLowPassRate: Iteration & {
      acPassPercent: number;
      transitionPassPercent: number;
    } = {
      ...convergedIter,
      acPassPercent: 0.0,
      transitionPassPercent: 0.0,
    };
    const convergedHighPassRate: Iteration & {
      acPassPercent: number;
      transitionPassPercent: number;
    } = {
      ...convergedIter,
      acPassPercent: 1.0,
      transitionPassPercent: 1.0,
    };
    expect(shouldStop([convergedLowPassRate])).toBe("converged");
    expect(shouldStop([convergedHighPassRate])).toBe("converged");

    const weakIter = baseIter({
      blockingFindings: ["home: the empty state is not represented"],
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
  const convergedIter = baseIter({ blockingFindings: [] });
  const laggingIter = baseIter({
    blockingFindings: ["home: the empty state is not represented"],
  });

  // QFAI:SPEC-0012:TC-0012-0367
  it("returns null when 2/3 pairs are converged and the 3rd has a finding open (TC-0012-0367, TDD-0376)", () => {
    const result = shouldStopAcrossSpecs([
      { specId: "spec-0007", screen: "dashboard", latestIteration: convergedIter },
      { specId: "spec-0007", screen: "detail", latestIteration: convergedIter },
      { specId: "spec-0011", screen: "list", latestIteration: laggingIter },
    ]);
    expect(result.stopReason).toBeNull();
  });

  // QFAI:SPEC-0012:TC-0012-0367
  it("returns converged when all 3 pairs are converged (TC-0012-0367, TDD-0376)", () => {
    const result = shouldStopAcrossSpecs([
      { specId: "spec-0007", screen: "dashboard", latestIteration: convergedIter },
      { specId: "spec-0007", screen: "detail", latestIteration: convergedIter },
      { specId: "spec-0011", screen: "list", latestIteration: convergedIter },
    ]);
    expect(result.stopReason).toBe("converged");
    expect(result.laggingSpecs).toEqual([]);
  });

  // QFAI:SPEC-0012:TC-0012-0368
  it("names every lagging spec in laggingSpecs[] when convergence not achieved (TC-0012-0368, TDD-0377)", () => {
    const result = shouldStopAcrossSpecs([
      { specId: "spec-0007", screen: "dashboard", latestIteration: convergedIter },
      { specId: "spec-0011", screen: "list", latestIteration: laggingIter },
      { specId: "spec-0013", screen: "page", latestIteration: laggingIter },
    ]);
    expect(result.stopReason).toBeNull();
    expect(result.laggingSpecs).toEqual(["spec-0011", "spec-0013"]);
  });
});

describe("iterationConverged", () => {
  // TC-3.4.8
  it("returns false when the record carries no blockingFindings", () => {
    const withoutFindings = {
      index: 0,
      commitSha: "a".repeat(40),
      proseCritique: "x".repeat(1500),
      layoutAntiPatternsDetected: [],
      designMdViolations: [],
      pivotDirective: "continue",
      evidenceRefs: { screenshot: "x.png", html: "x.html" },
    };
    expect(iterationConverged(withoutFindings)).toBe(false);
  });

  // TC-3.4.9
  it("returns true for the canonical new-shape converged iteration", () => {
    const iter = baseIter({ blockingFindings: [] });
    expect(iterationConverged(iter)).toBe(true);
  });

  it("requires designMdViolations to be empty", () => {
    const iter = baseIter({
      blockingFindings: [],
      designMdViolations: [{ kind: "color", found: "#abcdef" }],
    });
    expect(iterationConverged(iter)).toBe(false);
  });

  it("requires layoutAntiPatternsDetected to be empty", () => {
    const iter = baseIter({
      blockingFindings: [],
      layoutAntiPatternsDetected: ["lap-006-overcrowded-sidebar"],
    });
    expect(iterationConverged(iter)).toBe(false);
  });

  it("returns false for malformed iteration-like values", () => {
    expect(iterationConverged({ index: 0, blockingFindings: null })).toBe(false);
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
