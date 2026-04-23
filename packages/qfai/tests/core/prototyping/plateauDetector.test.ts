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

  it("最新 snapshot が allItemsPass95=true のときは already-converged を返す", () => {
    const result = detectBreakthrough({
      scoringTrace: [
        {
          iteration: 1,
          averageScore: 0.8,
          minScore: 0.79,
          allItemsPass95: false,
          commitSha: "a".repeat(40),
        },
        {
          iteration: 2,
          averageScore: 0.96,
          minScore: 0.95,
          allItemsPass95: true,
          commitSha: "b".repeat(40),
        },
      ],
      diffLines: 0,
      plateauDelta: 0.02,
      plateauLookback: 1,
      breakthrough,
    });

    expect(result.triggerResult).toBe(false);
    expect(result.triggerReasons).toContain("already-converged");
  });
});
