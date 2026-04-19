import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runFullHarness, type FullHarnessRequest } from "../../src/core/harness/runtime.js";
import type { CalibrationPack } from "../../src/core/calibration/types.js";
import type { FullHarnessPanelInputs } from "../../src/core/harness/panelInputs.js";

async function withRoot(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-harness-"));
  try {
    await mkdir(path.join(root, ".qfai", "evidence"), { recursive: true });
    await mkdir(path.join(root, ".git", "refs", "heads"), { recursive: true });
    await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/main\n", "utf-8");
    await writeFile(
      path.join(root, ".git", "refs", "heads", "main"),
      "abc1234567890abcdef1234567890abcdef123456\n",
      "utf-8",
    );
    await writeFile(
      path.join(root, ".qfai", "evidence", "calibration.yaml"),
      [
        "version: 1.7.15",
        "thresholds:",
        "  accept: 0.8",
        "  refine: 0.5",
        "maxIterations: 5",
        "plateauDelta: 0.02",
        "plateauLookback: 3",
        "examples: []",
        "",
      ].join("\n"),
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function makePanelInputs(): FullHarnessPanelInputs {
  return {
    runtimeGate: {
      uiRoutes: [
        {
          screenId: "dashboard",
          route: "/dashboard",
          rendered: true,
          browserVisited: true,
          renderEvidenceRefs: [".qfai/evidence/render.json#/screens/0"],
          browserQaEvidenceRefs: [".qfai/evidence/browser-qa.json#/phases/0"],
        },
      ],
      evidenceRefs: [
        ".qfai/discussion/discussion-20260406000000000/uiux/40_screen_contracts.md#dashboard",
        ".qfai/evidence/render.json#/screens/0",
        ".qfai/evidence/browser-qa.json#/phases/0",
      ],
    },
    renderEvidence: {
      totalScreens: 1,
      capturedScreens: 1,
      failedScreens: 0,
      viewports: ["desktop"],
      evidenceRefs: [".qfai/evidence/render.json#/screens/0"],
    },
    browserQa: {
      executed: true,
      blockingFindings: 0,
      experienceFindings: 0,
      visualFindings: 0,
      totalFindings: 0,
      phasesExecuted: ["smoke"],
      evidenceRefs: [".qfai/evidence/browser-qa.json#/phases/0"],
    },
    uiObservation: {
      screens: [
        {
          screenId: "dashboard",
          route: "/dashboard",
          htmlCaptureRef: ".qfai/evidence/render/dashboard.desktop.html",
          domLabelsFound: ["Dashboard"],
          elementsPlaced: 1,
          actionsWired: 1,
          mockPathFindings: [],
          browserQaEvidenceRefs: [".qfai/evidence/browser-qa.json#/phases/0"],
          browserQaObserved: true,
        },
      ],
      evidenceRefs: [".qfai/evidence/render/dashboard.desktop.html"],
    },
    specCoverage: {
      declared: { uiRoutes: 1 },
      checked: { uiOk: 1 },
      missing: { uiRoutes: [] },
      evidenceRefs: [
        ".qfai/discussion/discussion-20260406000000000/uiux/40_screen_contracts.md#dashboard",
        ".qfai/evidence/render.json#/screens/0",
      ],
    },
    discussionAxes: {
      invariantAxes: 1,
      trendDerivedAxes: 1,
      productSpecificAxes: 1,
      aggregateScore: 0.9,
      evidenceRefs: [
        ".qfai/discussion/discussion-20260406000000000/uiux/20_design_eval_invariant.md#L12",
      ],
    },
    screenContract: {
      totalContracts: 1,
      coveredContracts: 1,
      fidelityScore: 1,
      evidenceRefs: [
        ".qfai/discussion/discussion-20260406000000000/uiux/40_screen_contracts.md#dashboard",
      ],
    },
    trendAlignment: {
      trendSourcesChecked: 1,
      translationConsistency: 1,
      competitiveGapsCovered: 1,
      evidenceRefs: [".qfai/discussion/discussion-20260406000000000/04_Sources.md#L8"],
    },
  };
}

function makeRequest(
  root: string,
  overrides: Partial<FullHarnessRequest> = {},
): FullHarnessRequest {
  const calibrationPack: CalibrationPack = {
    version: "1.7.15",
    thresholds: { accept: 0.8, refine: 0.5 },
    maxIterations: 5,
    plateauDelta: 0.02,
    plateauLookback: 3,
    examples: [],
  };
  return {
    root,
    reviewer: "qa-reviewer",
    changeSummary: ["Initial measurement"],
    limitations: [],
    calibrationPack,
    calibrationRef: {
      packPath: path.join(root, ".qfai", "evidence", "calibration.yaml"),
      configPath: "qfai.config.yaml",
      packVersion: calibrationPack.version,
    },
    adapters: {
      surface: "web",
      render: {
        captureEvidence: async () => ({
          entries: [
            {
              capture_id: "cap-1",
              target: "/dashboard",
              status: "captured",
              screenshot_path: ".qfai/evidence/render/dashboard.desktop.png",
              html_path: ".qfai/evidence/render/dashboard.desktop.html",
              viewport: "desktop",
            },
          ],
          filesWritten: [
            ".qfai/evidence/render/dashboard.desktop.png",
            ".qfai/evidence/render/dashboard.desktop.html",
          ],
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
              evidence_refs: [".qfai/evidence/browser-qa.json#/phases/0"],
              checks_performed: ["smoke passed"],
            },
          ],
          provider: "test",
          timestamp: new Date().toISOString(),
        }),
      },
    },
    screenContracts: [{ screenId: "dashboard", route: "/dashboard" }],
    panelInputs: makePanelInputs(),
    ...overrides,
  };
}

describe("runFullHarness", () => {
  it("uses the resolved calibration pack provided by the caller", async () => {
    await withRoot(async (root) => {
      const result = await runFullHarness(makeRequest(root));
      expect(result.calibrationRef.packPath).toContain("calibration.yaml");
      expect(result.calibrationRef.packVersion).toBe("1.7.15");
    });
  });

  it("keeps single-iteration accept non-terminal", async () => {
    await withRoot(async (root) => {
      await writeFile(
        path.join(root, ".qfai", "evidence", "calibration.yaml"),
        [
          "version: 1.7.15",
          "thresholds:",
          "  accept: 0.1",
          "  refine: 0.05",
          "maxIterations: 5",
          "plateauDelta: 0.02",
          "plateauLookback: 3",
          "examples: []",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await runFullHarness(
        makeRequest(root, {
          calibrationPack: {
            version: "1.7.15",
            thresholds: { accept: 0.1, refine: 0.05 },
            maxIterations: 5,
            plateauDelta: 0.02,
            plateauLookback: 3,
            examples: [],
          },
          calibrationRef: {
            packPath: path.join(root, ".qfai", "evidence", "calibration.yaml"),
            configPath: "qfai.config.yaml",
            packVersion: "1.7.15",
          },
        }),
      );
      expect(result.isTerminal).toBe(false);
      expect(result.terminationReason).toBeUndefined();
      expect(result.finalDecision).toBe("pending");
      expect(result.signoffStatus).toBe("pending");
      expect(result.logVerdict).toBe("revise");
    });
  });

  it("maps plateau termination to abandoned semantics", async () => {
    await withRoot(async (root) => {
      await writeFile(
        path.join(root, ".qfai", "evidence", "calibration.yaml"),
        [
          "version: 1.7.15",
          "thresholds:",
          "  accept: 0.99",
          "  refine: 0.98",
          "maxIterations: 1",
          "plateauDelta: 0.02",
          "plateauLookback: 1",
          "examples: []",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await runFullHarness(
        makeRequest(root, {
          calibrationPack: {
            version: "1.7.15",
            thresholds: { accept: 0.99, refine: 0.98 },
            maxIterations: 1,
            plateauDelta: 0.02,
            plateauLookback: 1,
            examples: [],
          },
          calibrationRef: {
            packPath: path.join(root, ".qfai", "evidence", "calibration.yaml"),
            configPath: "qfai.config.yaml",
            packVersion: "1.7.15",
          },
        }),
      );
      expect(result.isTerminal).toBe(true);
      expect(result.finalDecision).toBe("abandoned");
      expect(result.signoffStatus).toBe("abandoned");
      expect(result.logVerdict).toBe("abandon");
    });
  });

  it("rejects cli surface", async () => {
    await withRoot(async (root) => {
      await expect(
        runFullHarness(
          makeRequest(root, {
            adapters: {
              ...makeRequest(root).adapters,
              surface: "cli",
            },
          }),
        ),
      ).rejects.toThrow("packages/qfai v1.7.15");
    });
  });
});
