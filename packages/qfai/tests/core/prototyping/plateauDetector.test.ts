import { describe, expect, it } from "vitest";

import { detectBreakthrough } from "../../../src/core/prototyping/plateauDetector.js";

const breakthrough = {
  minIterationsBeforeBranch: 2,
  maxDiffLines: 40,
  branchCount: 2,
};

describe("detectBreakthrough", () => {
  it("空の scoringTrace では already-converged ではなく no-snapshots を返す", () => {
    const result = detectBreakthrough({
      scoringTrace: [],
      diffLines: 0,
      plateauDelta: 0.02,
      plateauLookback: 2,
      breakthrough,
    });

    expect(result.triggerResult).toBe(false);
    expect(result.triggerReasons).toContain("no-snapshots");
    expect(result.triggerReasons).not.toContain("already-converged");
  });

  it("最新 snapshot が allReviewerAxesPerfect100=true のときは already-converged を返す", () => {
    const result = detectBreakthrough({
      scoringTrace: [
        {
          iteration: 1,
          averageScore: 80,
          minScore: 79,
          allReviewerAxesPerfect100: false,
          commitSha: "a".repeat(40),
        },
        {
          iteration: 2,
          averageScore: 100,
          minScore: 100,
          allReviewerAxesPerfect100: true,
          commitSha: "b".repeat(40),
        },
      ],
      diffLines: 0,
      plateauDelta: 2,
      plateauLookback: 1,
      breakthrough,
    });

    expect(result.triggerResult).toBe(false);
    expect(result.triggerReasons).toContain("already-converged");
  });

  it("スコアが悪化しているときは plateau 扱いせず score-regressing を返す", () => {
    const result = detectBreakthrough({
      scoringTrace: [
        {
          iteration: 1,
          averageScore: 82,
          minScore: 80,
          allReviewerAxesPerfect100: false,
          commitSha: "a".repeat(40),
        },
        {
          iteration: 2,
          averageScore: 81,
          minScore: 79,
          allReviewerAxesPerfect100: false,
          commitSha: "b".repeat(40),
        },
        {
          iteration: 3,
          averageScore: 80,
          minScore: 78,
          allReviewerAxesPerfect100: false,
          commitSha: "c".repeat(40),
        },
      ],
      diffLines: 0,
      plateauDelta: 2,
      plateauLookback: 2,
      breakthrough,
    });

    expect(result.triggerResult).toBe(false);
    expect(result.triggerReasons).toContain("score-regressing");
    expect(result.triggerReasons).not.toContain("score-still-improving");
  });
});
