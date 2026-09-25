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
  scores: {
    informationArchitecture: "exceptional",
    navigationFlow: "exceptional",
    usability: "exceptional",
    functionality: "exceptional",
  },
  proseCritique: "x".repeat(1500),
  layoutAntiPatternsDetected: [],
  designMdViolations: [],
  pivotDirective: "continue",
  evidenceRefs: [
    { kind: "screenshot", path: "iter-00/home.png" },
    { kind: "html", path: "iter-00/home.html" },
  ],
  ...overrides,
});

describe("shouldStop — convergence (TC-3.4.x)", () => {
  it("returns null when no iters", () => {
    expect(shouldStop([])).toBeNull();
  });

  // TC-3.4.1
  it("returns converged when all four axes are exceptional and blockers are empty", () => {
    const iter = baseIter({ blockingFindings: [] });
    expect(shouldStop([iter])).toBe("converged");
  });

  // TC-3.4.2
  it("returns null when a finding is open", () => {
    const iter = baseIter({ blockingFindings: ["home: no way back"] });
    expect(shouldStop([iter])).toBeNull();
  });

  // AC-0001-0120-02 behavior is exercised here; acceptance coverage belongs to integration.
  it.each(["informationArchitecture", "navigationFlow", "usability", "functionality"] as const)(
    "does not converge when %s is only strong",
    (axis) => {
      const scores = { ...baseIter().scores, [axis]: "strong" as const };
      const iter = baseIter({ blockingFindings: [], scores });
      expect(iterationConverged(iter)).toBe(false);
      expect(shouldStop([iter])).toBeNull();
    },
  );

  it("does not converge when a score axis is absent", () => {
    const iter = { ...baseIter({ blockingFindings: [] }), scores: { usability: "exceptional" } };
    expect(iterationConverged(iter)).toBe(false);
  });

  // TC-3.4.3
  it("returns null when layoutAntiPatternsDetected is non-empty (other conditions met)", () => {
    const iter = baseIter({
      blockingFindings: [],
      layoutAntiPatternsDetected: ["lap-008-no-back-affordance"],
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
      lap: ["lap-008-no-back-affordance"],
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
      lap: ["lap-008-no-back-affordance"],
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
      lap: ["lap-008-no-back-affordance"],
      dmv: [{ kind: "color" as const, found: "#abcdef" }],
    },
    {
      label: "all three trip-wires",
      blockingFindings: ["home: the empty state is not represented"],
      lap: ["lap-008-no-back-affordance"],
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

  // QFAI:EX-0001-0127-01
  it("shouldStop boundary at index === 9", () => {
    expect(shouldStop([baseIter({ index: 9 })])).toBe("max-iterations");
    expect(shouldStop([baseIter({ index: 8 })])).toBeNull();
  });

  // QFAI:EX-0001-0120-04
  it("shouldStop ignores any quantitative pass-rate fields", () => {
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
      blockingFindings: [],
      scores: { ...baseIter().scores, navigationFlow: "strong" },
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

describe("shouldStopAcrossSpecs — UI contract AND convergence", () => {
  const convergedIter = baseIter({ blockingFindings: [] });
  const laggingIter = baseIter({
    blockingFindings: ["home: the empty state is not represented"],
  });

  // QFAI:EX-0001-0120-03
  it("returns null when 2/3 pairs are converged and the 3rd has a finding open", () => {
    const result = shouldStopAcrossSpecs([
      { uiContractId: "CON-UI-0007", screen: "dashboard", latestIteration: convergedIter },
      { uiContractId: "CON-UI-0007", screen: "detail", latestIteration: convergedIter },
      { uiContractId: "CON-UI-0011", screen: "list", latestIteration: laggingIter },
    ]);
    expect(result.stopReason).toBeNull();
  });

  // QFAI:EX-0001-0120-03
  it("returns converged when all 3 pairs are converged", () => {
    const result = shouldStopAcrossSpecs([
      { uiContractId: "CON-UI-0007", screen: "dashboard", latestIteration: convergedIter },
      { uiContractId: "CON-UI-0007", screen: "detail", latestIteration: convergedIter },
      { uiContractId: "CON-UI-0011", screen: "list", latestIteration: convergedIter },
    ]);
    expect(result.stopReason).toBe("converged");
    expect(result.laggingUiContracts).toEqual([]);
  });

  // QFAI:EX-0001-0120-04
  it("names every lagging UI contract when convergence is not achieved", () => {
    const result = shouldStopAcrossSpecs([
      { uiContractId: "CON-UI-0007", screen: "dashboard", latestIteration: convergedIter },
      { uiContractId: "CON-UI-0011", screen: "list", latestIteration: laggingIter },
      { uiContractId: "CON-UI-0013", screen: "page", latestIteration: laggingIter },
    ]);
    expect(result.stopReason).toBeNull();
    expect(result.laggingUiContracts).toEqual(["CON-UI-0011", "CON-UI-0013"]);
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
      evidenceRefs: [
        { kind: "screenshot", path: "iter-00/x.png" },
        { kind: "html", path: "iter-00/x.html" },
      ],
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
      layoutAntiPatternsDetected: ["lap-008-no-back-affordance"],
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
  // QFAI:EX-0001-0127-02
  it("MAX_ITERATIONS === 10 and MAX_ITERATION_INDEX === 9", () => {
    expect(MAX_ITERATIONS).toBe(10);
    expect(MAX_ITERATION_INDEX).toBe(9);
  });
});
