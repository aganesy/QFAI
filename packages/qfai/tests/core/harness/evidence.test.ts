import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadHistory, validateHistoryConsistency } from "../../../src/core/harness/history.js";
import type { FullHarnessHistory, FullHarnessIteration } from "../../../src/core/harness/types.js";

function makeIteration(overrides: Partial<FullHarnessIteration> = {}): FullHarnessIteration {
  return {
    iteration: 1,
    commitSha: "abc123",
    timestamp: "2026-04-22T00:00:00.000Z",
    changeSummary: ["Measured current UI"],
    limitations: ["none"],
    evidenceRefs: {
      render: [".qfai/evidence/render.json#/screens/0"],
      browserQa: [".qfai/evidence/browser-qa.json#/findings/0"],
      runtimeGate: [".qfai/evidence/runtime-gate.json#/ui/0"],
      uiObservation: [".qfai/evidence/render/orders.desktop.html"],
      specCoverage: [".qfai/evidence/spec-coverage.json#/specs/0"],
      discussion: [
        ".qfai/discussion/discussion-20260422000000000/uiux/33_exploration_rubric.md#axis-1",
      ],
      screenContract: [".qfai/contracts/ui/screen-contracts.yaml#/screens/orders"],
      trend: [".qfai/discussion/discussion-20260422000000000/04_Sources.md#trend-scan"],
    },
    reviewerScores: [
      {
        reviewerId: "reviewer-1",
        role: "ux-reviewer",
        scores: [
          {
            axisId: "runtime",
            score: 100,
            rationale: "runtime is solid",
            evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
          },
        ],
      },
    ],
    allReviewerAxesPerfect100: true,
    ...overrides,
  };
}

describe("harness evidence history", () => {
  it("returns null when evidence file does not exist", async () => {
    const history = await loadHistory(path.join(os.tmpdir(), "qfai-missing-history"));

    expect(history).toBeNull();
  });

  it("loads the fullHarness history from prototyping.json", async () => {
    const root = path.join(os.tmpdir(), `qfai-history-${Date.now()}`);
    await mkdir(root, { recursive: true });
    const evidenceRoot = path.join(root, ".qfai", "evidence");
    await mkdir(evidenceRoot, { recursive: true });

    const iteration = makeIteration();
    const json = {
      fullHarness: {
        runId: "fh-1",
        iterationCount: 1,
        bestIteration: 1,
        terminationReason: "converged",
        iterations: [iteration],
        scoringTrace: [
          {
            iteration: 1,
            reviewerCount: 1,
            axisCount: 1,
            minScore: 100,
            averageScore: 100,
            allReviewerAxesPerfect100: true,
            commitSha: "abc123",
          },
        ],
      },
    };
    await writeFile(
      path.join(evidenceRoot, "prototyping.json"),
      JSON.stringify(json, null, 2),
      "utf-8",
    );

    const history = await loadHistory(root);

    expect(history).not.toBeNull();
    expect(history?.runId).toBe("fh-1");
    expect(history?.bestIteration).toBe(1);
    expect(history?.terminationReason).toBe("converged");
    expect(history?.scoringTrace[0]?.allReviewerAxesPerfect100).toBe(true);
  });
});

describe("validateHistoryConsistency", () => {
  it("returns no errors for a structurally complete history", () => {
    const history: FullHarnessHistory = {
      runId: "fh-1",
      iterations: [makeIteration()],
      bestIteration: 1,
      scoringTrace: [
        {
          iteration: 1,
          reviewerCount: 1,
          axisCount: 1,
          minScore: 100,
          averageScore: 100,
          allReviewerAxesPerfect100: true,
          commitSha: "abc123",
        },
      ],
    };

    expect(validateHistoryConsistency(history, 1)).toEqual([]);
  });

  it("reports empty evidence categories", () => {
    const history: FullHarnessHistory = {
      runId: "fh-1",
      iterations: [
        makeIteration({
          evidenceRefs: {
            render: [],
            browserQa: [".qfai/evidence/browser-qa.json#/findings/0"],
            runtimeGate: [".qfai/evidence/runtime-gate.json#/ui/0"],
            uiObservation: [".qfai/evidence/render/orders.desktop.html"],
            specCoverage: [".qfai/evidence/spec-coverage.json#/specs/0"],
            discussion: [
              ".qfai/discussion/discussion-20260422000000000/uiux/33_exploration_rubric.md#axis-1",
            ],
            screenContract: [".qfai/contracts/ui/screen-contracts.yaml#/screens/orders"],
            trend: [".qfai/discussion/discussion-20260422000000000/04_Sources.md#trend-scan"],
          },
        }),
      ],
      bestIteration: 1,
      scoringTrace: [],
    };

    expect(validateHistoryConsistency(history)).toContain(
      "History consistency violation: iterations.length (1) !== scoringTrace.length (0)",
    );
    expect(validateHistoryConsistency(history)).toContain(
      "Iteration 1 has empty evidenceRefs categories",
    );
  });
});
