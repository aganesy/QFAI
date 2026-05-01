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
    designQuality: "acceptable",
    originality: "acceptable",
    craft: "acceptable",
    functionality: "acceptable",
  },
  proseCritique: "x".repeat(1500),
  slopPatternsDetected: [],
  pivotDirective: "continue",
  evidenceRefs: {
    screenshot: ".qfai/evidence/prototyping/iter-00/home.png",
    html: ".qfai/evidence/prototyping/iter-00/home.html",
  },
  ...overrides,
});

// QFAI:SPEC-0017:TC-0017-0001
describe("shouldStop", () => {
  it("returns null when no iters", () => {
    expect(shouldStop([])).toBeNull();
  });

  // QFAI:SPEC-0017:TC-0017-0002
  it("returns axes-exceptional when all 4 exceptional and no slop", () => {
    const iter = baseIter({
      scores: {
        designQuality: "exceptional",
        originality: "exceptional",
        craft: "exceptional",
        functionality: "exceptional",
      },
    });
    expect(shouldStop([iter])).toBe("axes-exceptional");
  });

  // QFAI:SPEC-0017:TC-0017-0003
  it("does NOT return axes-exceptional if slop is detected", () => {
    const iter = baseIter({
      scores: {
        designQuality: "exceptional",
        originality: "acceptable", // capped due to slop (anti-slop rule)
        craft: "exceptional",
        functionality: "exceptional",
      },
      slopPatternsDetected: ["slop-001-shadcn-zinc"],
    });
    expect(shouldStop([iter])).toBeNull();
  });

  // QFAI:SPEC-0017:TC-0017-0004
  it("returns max-iterations at index 14 even if scores are weak", () => {
    const iter = baseIter({ index: MAX_ITERATION_INDEX });
    expect(shouldStop([iter])).toBe("max-iterations");
  });

  it("returns null at index 13 with non-exceptional scores", () => {
    const iter = baseIter({ index: 13 });
    expect(shouldStop([iter])).toBeNull();
  });

  it("max-iterations takes priority over weak scores at last index", () => {
    const iter = baseIter({
      index: MAX_ITERATION_INDEX,
      scores: {
        designQuality: "weak",
        originality: "weak",
        craft: "weak",
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
  it("requires all 4 axes exceptional", () => {
    const iter = baseIter({
      scores: {
        designQuality: "exceptional",
        originality: "exceptional",
        craft: "exceptional",
        functionality: "strong", // not exceptional
      },
    });
    expect(allFourAxesExceptional(iter)).toBe(false);
  });

  it("requires zero slop patterns", () => {
    const iter = baseIter({
      scores: {
        designQuality: "exceptional",
        originality: "exceptional",
        craft: "exceptional",
        functionality: "exceptional",
      },
      slopPatternsDetected: ["slop-007-bento-grid"],
    });
    expect(allFourAxesExceptional(iter)).toBe(false);
  });

  it("returns false for malformed iteration-like values", () => {
    expect(allFourAxesExceptional({ index: 0, scores: null })).toBe(false);
  });
});

// QFAI:SPEC-0017:TC-0017-0005
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
