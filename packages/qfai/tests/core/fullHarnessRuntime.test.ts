/**
 * Full-harness runtime tests — WS-4 measurement-driven model
 */
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runFullHarness, type FullHarnessRequest } from "../../src/core/harness/runtime.js";
import type { FullHarnessAdapters } from "../../src/core/harness/adapters.js";
import type { FullHarnessPanelInputs } from "../../src/core/harness/panelInputs.js";

async function withRoot(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-harness-"));
  try {
    await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
    // Full-harness requires a git repo for resolveCommitSha
    await mkdir(path.join(root, ".git", "refs", "heads"), { recursive: true });
    await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/main\n", "utf-8");
    await writeFile(
      path.join(root, ".git", "refs", "heads", "main"),
      "abc1234567890abcdef1234567890abcdef123456\n",
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function makePanelInputs(overrides: Partial<FullHarnessPanelInputs> = {}): FullHarnessPanelInputs {
  return {
    runtimeGate: {
      uiRoutes: [
        {
          screenId: "home",
          route: "/",
          rendered: true,
          browserVisited: true,
          renderEvidenceRefs: ["render-001.png", "render-001.html"],
          browserQaEvidenceRefs: ["browserQa-report.json#/phases/smoke"],
        },
      ],
      apiEndpoints: [{ method: "GET", path: "/api/health", status: 200 }],
      evidenceRefs: [".qfai/evidence/prototyping.json#/runtimeGate"],
    },
    renderEvidence: {
      totalScreens: 2,
      capturedScreens: 2,
      failedScreens: 0,
      viewports: ["1920x1080"],
      evidenceRefs: ["render-001.png"],
    },
    browserQa: {
      executed: true,
      blockingFindings: 0,
      experienceFindings: 0,
      visualFindings: 0,
      totalFindings: 0,
      phasesExecuted: ["smoke", "interaction"],
      evidenceRefs: ["browserQa-report.json"],
    },
    uiObservation: {
      screens: [
        {
          screenId: "home",
          route: "/",
          htmlCaptureRef: "screen-001.html",
          domLabelsFound: ["heading"],
          elementsPlaced: 5,
          actionsWired: 2,
          mockPathFindings: [],
          browserQaEvidenceRefs: ["browserQa-report.json#/phases/0"],
          browserQaObserved: true,
        },
      ],
      evidenceRefs: ["uiObs-001.json"],
    },
    specCoverage: {
      declared: { uiRoutes: 1, apiEndpoints: 1, dbObjects: 1 },
      checked: { uiOk: 1, apiNon404: 1, dbPresent: 1 },
      missing: { uiRoutes: [], apiEndpoints: [], dbObjects: [] },
      evidenceRefs: ["specCov-001.json"],
    },
    discussionAxes: {
      invariantAxes: 3,
      trendDerivedAxes: 2,
      productSpecificAxes: 1,
      aggregateScore: 0.9,
      evidenceRefs: ["discussion-001.json"],
    },
    screenContract: {
      totalContracts: 2,
      coveredContracts: 2,
      fidelityScore: 0.95,
      evidenceRefs: ["screenContract-001.json"],
    },
    trendAlignment: {
      trendSourcesChecked: 3,
      translationConsistency: 0.9,
      competitiveGapsCovered: 2,
      evidenceRefs: ["trend-001.json"],
    },
    ...overrides,
  };
}

function makeRequest(
  root: string,
  overrides: Partial<FullHarnessRequest> = {},
): FullHarnessRequest {
  return {
    root,
    reviewer: "test-reviewer",
    changeSummary: ["Initial measurement"],
    limitations: [],
    calibration: {
      packPath: ".qfai/evidence/calibration.yaml",
      packVersion: "1.7.15",
      configPath: "qfai.config.yaml",
      thresholds: { accept: 0.8, refine: 0.5 },
      maxIterations: 5,
      plateauDelta: 0.02,
      plateauLookback: 3,
    },
    adapters: {
      surface: "web",
      render: {
        captureEvidence: async () => ({
          entries: [
            {
              capture_id: "cap-1",
              target: "/",
              status: "captured",
              screenshot_path: "render-001.png",
              html_path: "render-001.html",
              viewport: "desktop",
            },
          ],
          filesWritten: ["render-001.png", "render-001.html"],
        }),
      },
      browserQa: {
        runQa: async () => ({
          phases: [
            {
              phase: "smoke",
              status: "passed",
              findings: [],
              repair_suggestions: [],
              evidence_refs: ["browserQa-report.json#/phases/smoke"],
              checks_performed: ["smoke passed"],
            },
          ],
          provider: "test",
          timestamp: new Date().toISOString(),
        }),
      },
    },
    screenContracts: [{ screenId: "home", route: "/" }],
    panelInputs: makePanelInputs(),
    ...overrides,
  };
}

describe("runFullHarness", () => {
  it("TC-D1: 1 iteration accept → NOT converged (v1.7.15)", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(
        makeRequest(root, {
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.7.15",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      // v1.7.15: single-iteration accept does NOT produce converged
      expect(result.isTerminal).toBe(false);
      expect(result.terminationReason).toBeUndefined();
      expect(result.history.iterations.length).toBe(1);
      expect(result.history.scoringTrace.length).toBe(1);
    });
  });

  it("TC-D3: low scores → not terminal on first iteration", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(
        makeRequest(root, {
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.7.15",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.99, refine: 0.98 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(result.isTerminal).toBe(false);
      expect(result.history.iterations.length).toBe(1);
    });
  });

  it("TC-D4: UI-bearing surface → calls render and Browser QA", async () => {
    await withRoot(async (root) => {
      let renderCalled = false;
      let qaCalled = false;

      const adapters: FullHarnessAdapters = {
        surface: "web",
        render: {
          captureEvidence: async () => {
            renderCalled = true;
            return {
              entries: [
                {
                  capture_id: "cap-1",
                  target: "/",
                  status: "captured",
                  screenshot_path: "render-001.png",
                  html_path: "render-001.html",
                  viewport: "desktop",
                },
              ],
              filesWritten: ["render-001.png", "render-001.html"],
            };
          },
        },
        browserQa: {
          runQa: async () => {
            qaCalled = true;
            return {
              phases: [
                {
                  phase: "smoke",
                  status: "passed",
                  findings: [],
                  repair_suggestions: [],
                  evidence_refs: ["browserQa-report.json#/phases/smoke"],
                  checks_performed: ["smoke passed"],
                },
              ],
              provider: "test",
              timestamp: new Date().toISOString(),
            };
          },
        },
      };

      await runFullHarness(
        makeRequest(root, {
          adapters,
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.7.15",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(renderCalled).toBe(true);
      expect(qaCalled).toBe(true);
    });
  });

  it("TC-D5: CLI surface → full-harness is rejected", async () => {
    await withRoot(async (root) => {
      let renderCalled = false;
      let qaCalled = false;

      const adapters: FullHarnessAdapters = {
        surface: "cli",
        render: {
          captureEvidence: async () => {
            renderCalled = true;
            return { entries: [], filesWritten: [] };
          },
        },
        browserQa: {
          runQa: async () => {
            qaCalled = true;
            return { phases: [], provider: "test", timestamp: new Date().toISOString() };
          },
        },
      };

      await expect(
        runFullHarness(
          makeRequest(root, {
            adapters,
            calibration: {
              packPath: ".qfai/evidence/calibration.yaml",
              packVersion: "1.7.15",
              configPath: "qfai.config.yaml",
              thresholds: { accept: 0.1, refine: 0.05 },
              maxIterations: 5,
              plateauDelta: 0.02,
              plateauLookback: 3,
            },
          }),
        ),
      ).rejects.toThrow("full-harness is supported only");
      expect(renderCalled).toBe(false);
      expect(qaCalled).toBe(false);
    });
  });

  it("fails closed when surface is missing", async () => {
    await withRoot(async (root) => {
      await expect(
        runFullHarness(
          makeRequest(root, {
            adapters: {
              surface: undefined as never,
              render: {
                captureEvidence: async () => ({ entries: [], filesWritten: [] }),
              },
              browserQa: {
                runQa: async () => ({
                  phases: [],
                  provider: "test",
                  timestamp: new Date().toISOString(),
                }),
              },
            },
          }),
        ),
      ).rejects.toThrow("Full-harness requires adapters.surface.");
    });
  });

  it("fails closed when screenContracts are missing", async () => {
    await withRoot(async (root) => {
      await expect(
        runFullHarness(
          makeRequest(root, {
            screenContracts: [],
          }),
        ),
      ).rejects.toThrow("Full-harness requires canonical screenContracts.");
    });
  });

  it("fails closed when Browser QA executes without evidence refs", async () => {
    await withRoot(async (root) => {
      await expect(
        runFullHarness(
          makeRequest(root, {
            adapters: {
              surface: "web",
              render: {
                captureEvidence: async () => ({
                  entries: [
                    {
                      capture_id: "cap-1",
                      target: "/",
                      status: "captured",
                      screenshot_path: "render-001.png",
                      html_path: "render-001.html",
                      viewport: "desktop",
                    },
                  ],
                  filesWritten: ["render-001.png", "render-001.html"],
                }),
              },
              browserQa: {
                runQa: async () => ({
                  phases: [
                    {
                      phase: "smoke",
                      status: "passed",
                      findings: [],
                      repair_suggestions: [],
                      evidence_refs: [],
                      checks_performed: ["smoke passed"],
                    },
                  ],
                  provider: "test",
                  timestamp: new Date().toISOString(),
                }),
              },
            },
          }),
        ),
      ).rejects.toThrow("Full-harness requires Browser QA evidence refs");
    });
  });

  it("TC-D6: result writer produces expected summary", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(
        makeRequest(root, {
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.7.15",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(result.iteration).toBeDefined();
      expect(typeof result.iteration.iteration).toBe("number");
      expect(result.history.runId).toBeTruthy();
      expect(result.calibrationRef).toBeDefined();
      expect(result.calibrationRef.configPath).toBe("qfai.config.yaml");
    });
  });

  it("observability adapter receives iteration records", async () => {
    await withRoot(async (root) => {
      const records: Array<{ iteration: number; score: number; decision: string }> = [];
      let flushed = false;

      const adapters: FullHarnessAdapters = {
        surface: "web",
        render: {
          captureEvidence: async () => ({
            entries: [
              {
                capture_id: "cap-1",
                target: "/",
                status: "captured",
                screenshot_path: "render-001.png",
                html_path: "render-001.html",
                viewport: "desktop",
              },
            ],
            filesWritten: ["render-001.png", "render-001.html"],
          }),
        },
        browserQa: {
          runQa: async () => ({
            phases: [
              {
                phase: "smoke",
                status: "passed",
                findings: [],
                repair_suggestions: [],
                evidence_refs: ["browserQa-report.json#/phases/smoke"],
                checks_performed: ["smoke passed"],
              },
            ],
            provider: "test",
            timestamp: new Date().toISOString(),
          }),
        },
        observability: {
          recordIteration: (data) => {
            records.push(data);
          },
          flush: async () => {
            flushed = true;
          },
        },
      };

      await runFullHarness(
        makeRequest(root, {
          adapters,
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.7.15",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(records.length).toBeGreaterThan(0);
      expect(flushed).toBe(true);
    });
  });

  it("generates evidence and review summary", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(
        makeRequest(root, {
          calibration: {
            packPath: ".qfai/evidence/calibration.yaml",
            packVersion: "1.7.15",
            configPath: "qfai.config.yaml",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
          },
        }),
      );

      expect(result.history.runId).toBeTruthy();
      expect(result.iteration).toBeDefined();
      expect(result.fakeUiDetection).toBeDefined();
      expect(result.handoff).toBeDefined();
    });
  });
});
