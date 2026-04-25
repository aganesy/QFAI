import { describe, expect, it } from "vitest";

import { buildFullHarnessResult } from "../../../src/core/harness/resultWriter.js";
import type { FullHarnessHistory } from "../../../src/core/harness/types.js";
import type { BrowserQaRunResult } from "../../../src/core/browserQa/types.js";
import type { RenderRunnerResult } from "../../../src/core/evidence/types.js";

describe("buildFullHarnessResult", () => {
  it("summarizes the latest reviewer-score snapshot and remaining iteration budget", () => {
    const history: FullHarnessHistory = {
      runId: "fh-1",
      iterations: [
        {
          iteration: 1,
          commitSha: "abc123",
          timestamp: "2026-04-22T00:00:00.000Z",
          changeSummary: ["Initial pass"],
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
              scores: [
                {
                  axisId: "runtime",
                  score: 100,
                  rationale: "passed",
                  evidenceRefs: [".qfai/evidence/runtime-gate.json#/ui/0"],
                },
              ],
            },
          ],
          allReviewerAxesPerfect100: true,
        },
      ],
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

    const renderResults: RenderRunnerResult[] = [
      {
        generatedAt: "2026-04-22T00:00:00.000Z",
        entries: [
          {
            capture_id: "capture-1",
            target: "/orders",
            viewport: "desktop",
            status: "captured",
            screenshot_path: "render/orders.png",
            html_path: "render/orders.html",
          },
        ],
        filesWritten: ["render/orders.png", "render/orders.html"],
      },
    ];
    const browserQaResults: BrowserQaRunResult[] = [
      {
        provider: "playwright",
        timestamp: "2026-04-22T00:00:00.000Z",
        phases: [
          {
            phase: "smoke",
            status: "executed",
            checks_performed: ["loads"],
            findings: [],
            repair_suggestions: [],
            evidence_refs: [".qfai/evidence/browser-qa.json#/phases/0"],
          },
        ],
      },
    ];

    const result = buildFullHarnessResult(
      history,
      renderResults,
      browserQaResults,
      20,
      "converged",
      [".qfai/evidence/observability.json"],
    );

    expect(result.evaluationSummary).toEqual({
      allReviewerAxesPerfect100: true,
      bestIteration: 1,
      minScore: 100,
      averageScore: 100,
      reviewerCount: 1,
      axisCount: 1,
    });
    expect(result.iterationBudget).toEqual({
      maxIterations: 20,
      remainingIterations: 19,
    });
    expect(result.evidenceSummary).toEqual({
      renderCaptured: 1,
      renderSkipped: 0,
      renderFailed: 0,
    });
    expect(result.browserQaSummary).toEqual({
      phasesExecuted: 1,
      phasesFailed: 0,
      phasesSkipped: 0,
      totalFindings: 0,
    });
    expect(result.observabilityRefs).toEqual([".qfai/evidence/observability.json"]);
  });
});
