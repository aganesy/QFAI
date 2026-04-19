// QFAI:SPEC-0012:TC-0012-0121
// QFAI:SPEC-0012:TC-0012-0122
// QFAI:SPEC-0012:TC-0012-0123
// QFAI:SPEC-0012:TC-0012-0124
// QFAI:SPEC-0012:TC-0012-0125
// QFAI:SPEC-0012:TC-0012-0126
// QFAI:SPEC-0012:TC-0012-0127
// QFAI:SPEC-0012:TC-0012-0128
// QFAI:SPEC-0012:TC-0012-0129
// QFAI:SPEC-0012:TC-0012-0130
// QFAI:SPEC-0012:TC-0012-0131
// QFAI:SPEC-0012:TC-0012-0132
// QFAI:SPEC-0012:TC-0012-0133
// QFAI:SPEC-0012:TC-0012-0134
// QFAI:SPEC-0012:TC-0012-0135
// QFAI:SPEC-0012:TC-0012-0136
// QFAI:SPEC-0012:TC-0012-0137
// QFAI:SPEC-0012:TC-0012-0138
// QFAI:SPEC-0012:TC-0012-0139
// QFAI:SPEC-0012:TC-0012-0140

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  derivePrototypingObligations,
  NON_UI_PROTOTYPING_SURFACE_REASON_CODE,
} from "../../src/core/prototyping/mode.js";
import type { PrototypingSurface } from "../../src/core/prototyping/types.js";
import { buildActionCoverage } from "../../src/core/prototyping/actionCoverage.js";
import type { BrowserQaFinding } from "../../src/core/browserQa/types.js";
import {
  buildRuntimeObservation,
  type ObservedUiRoute,
  type RuntimeObservation,
} from "../../src/core/prototyping/runtimeObservation.js";
import type { CanonicalScreenContract } from "../../src/core/prototyping/screenContracts.js";
import type { RenderRunnerResult } from "../../src/core/evidence/types.js";
import { collectObservedRuntimeArtifacts } from "../../src/core/prototyping/specCoverage.js";
import { runFullHarness } from "../../src/core/harness/runtime.js";
import type { FullHarnessRequest } from "../../src/core/harness/runtime.js";
import type {
  FullHarnessAdapters,
  HarnessRenderAdapter,
  HarnessBrowserQaAdapter,
} from "../../src/core/harness/adapters.js";
import type { CalibrationPack } from "../../src/core/calibration/types.js";
import type { SurfaceType } from "../../src/core/detection/surfaceType.js";
import type { FullHarnessPanelInputs } from "../../src/core/harness/panelInputs.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(process.cwd(), "..", "..");

function srcPath(...segments: string[]): string {
  return path.join(repoRoot, "packages", "qfai", "src", "core", ...segments);
}

const MINIMAL_CALIBRATION_PACK: CalibrationPack = {
  version: "1.0.0",
  examples: [],
  thresholds: { accept: 0.8, refine: 0.5 },
  maxIterations: 3,
  plateauDelta: 0.02,
  plateauLookback: 3,
};

function makeMinimalRequest(
  overrides: Partial<FullHarnessRequest> & { adapters: FullHarnessAdapters },
): FullHarnessRequest {
  return {
    root: ".",
    reviewer: "test-reviewer",
    changeSummary: ["test change"],
    limitations: [],
    calibrationPack: MINIMAL_CALIBRATION_PACK,
    calibrationRef: { packPath: ".", packVersion: "1.0.0" },
    screenContracts: [{ screenId: "s1", route: "/" }],
    panelInputs: {} as unknown as FullHarnessPanelInputs,
    ...overrides,
  };
}

const SCREEN_CONTRACTS_3: CanonicalScreenContract[] = [
  { name: "Home", screenId: "scr-home", route: "/", primaryTasks: [], sourceRef: "ref-home" },
  {
    name: "Orders",
    screenId: "scr-orders",
    route: "/orders",
    primaryTasks: [],
    sourceRef: "ref-orders",
  },
  {
    name: "Profile",
    screenId: "scr-profile",
    route: "/profile",
    primaryTasks: [],
    sourceRef: "ref-profile",
  },
];

// ---------------------------------------------------------------------------
// WS-7: Non-UI surface rejection
// ---------------------------------------------------------------------------

describe("WS-7: non-UI surface rejection", () => {
  describe("TC-0012-0121: Non-UI Surface Rejects standard mode", () => {
    it("derivePrototypingObligations returns validCombination=false for cli + standard mode", () => {
      const result = derivePrototypingObligations({
        surface: "cli" as PrototypingSurface,
        effectiveMode: "standard",
      });
      expect(result.validCombination).toBe(false);
    });
  });

  // NOTE: Current code returns UNSUPPORTED_PROTOTYPING_MODE_REASON_CODE for non-full-harness
  // modes (checked before surface). This test expresses the SPEC requirement that non-UI
  // surface rejection takes precedence. Expected to be RED until implementation is fixed.
  describe("TC-0012-0122: Non-UI Surface Rejection Reason Code Consistent", () => {
    it("cli + low-cost mode → invalidReasonCode is NON_UI_PROTOTYPING_SURFACE_REASON_CODE", () => {
      const result = derivePrototypingObligations({
        surface: "cli" as PrototypingSurface,
        effectiveMode: "low-cost",
      });
      expect(result.validCombination).toBe(false);
      expect(result.invalidReasonCode).toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
    });
  });

  describe("TC-0012-0123: UI-bearing Surface Accepted (All Modes)", () => {
    it("web + full-harness returns validCombination=true and no NON_UI surface reason code", () => {
      const result = derivePrototypingObligations({
        surface: "web" as PrototypingSurface,
        effectiveMode: "full-harness",
      });
      expect(result.validCombination).toBe(true);
      expect(result.invalidReasonCode).not.toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
    });

    it("mobile + full-harness returns validCombination=true", () => {
      const result = derivePrototypingObligations({
        surface: "mobile" as PrototypingSurface,
        effectiveMode: "full-harness",
      });
      expect(result.validCombination).toBe(true);
      expect(result.invalidReasonCode).not.toBe(NON_UI_PROTOTYPING_SURFACE_REASON_CODE);
    });
  });
});

// ---------------------------------------------------------------------------
// WS-8: runFullHarness() fail-closed validation
// ---------------------------------------------------------------------------

describe("WS-8: runFullHarness() fail-closed", () => {
  describe("TC-0012-0124: runFullHarness Missing Surface Throws", () => {
    it("throws 'Full-harness requires adapters.surface' when surface is empty string", async () => {
      const req = makeMinimalRequest({
        adapters: {
          surface: "" as unknown as SurfaceType,
          render: {} as unknown as HarnessRenderAdapter,
          browserQa: {} as unknown as HarnessBrowserQaAdapter,
        },
      });
      await expect(runFullHarness(req)).rejects.toThrow("Full-harness requires adapters.surface");
    });
  });

  describe("TC-0012-0125: runFullHarness Missing Adapter Throws", () => {
    it("throws when render adapter is absent (TypeError propagates)", async () => {
      const req = makeMinimalRequest({
        adapters: {
          surface: "web" as SurfaceType,
          render: undefined as unknown as HarnessRenderAdapter,
          browserQa: {} as unknown as HarnessBrowserQaAdapter,
        },
      });
      await expect(runFullHarness(req)).rejects.toThrow();
    });
  });

  describe("TC-0012-0126: runFullHarness Empty ScreenContracts Throws", () => {
    it("throws 'Full-harness requires canonical screenContracts' when screenContracts=[]", async () => {
      const req = makeMinimalRequest({
        adapters: {
          surface: "web" as SurfaceType,
          render: {} as unknown as HarnessRenderAdapter,
          browserQa: {} as unknown as HarnessBrowserQaAdapter,
        },
        screenContracts: [],
      });
      await expect(runFullHarness(req)).rejects.toThrow(
        "Full-harness requires canonical screenContracts",
      );
    });
  });

  describe("TC-0012-0127: Adapter Error Propagated", () => {
    it("error thrown by render adapter propagates out of runFullHarness (not caught silently)", async () => {
      const errorRender: HarnessRenderAdapter = {
        captureEvidence: async (_iteration: number): Promise<never> => {
          throw new Error("render adapter exploded");
        },
      };
      const req = makeMinimalRequest({
        adapters: {
          surface: "web" as SurfaceType,
          render: errorRender,
          browserQa: {} as unknown as HarnessBrowserQaAdapter,
        },
      });
      await expect(runFullHarness(req)).rejects.toThrow("render adapter exploded");
    });
  });
});

// ---------------------------------------------------------------------------
// WS-9: Observed-only route semantics
// ---------------------------------------------------------------------------

describe("WS-9: observed-only route semantics", () => {
  describe("TC-0012-0128: Unobserved Route Excluded from Ledger", () => {
    it("buildRuntimeObservation with 3 screens but only 2 rendered → ui has 2 entries", () => {
      const renderResult: RenderRunnerResult = {
        entries: [
          {
            capture_id: "c1",
            target: "/",
            status: "captured",
            screenshot_path: "home.png",
            viewport: "desktop",
          },
          {
            capture_id: "c2",
            target: "/orders",
            status: "captured",
            screenshot_path: "orders.png",
            viewport: "desktop",
          },
        ],
        filesWritten: [],
      };
      const result = buildRuntimeObservation({
        screenContracts: SCREEN_CONTRACTS_3,
        renderResult,
      });
      expect(result.ui).toHaveLength(2);
      const routes = result.ui.map((entry) => entry.route);
      expect(routes).toContain("/");
      expect(routes).toContain("/orders");
      expect(routes).not.toContain("/profile");
    });
  });

  describe("TC-0012-0129: runtimeGate api db Fields Absent", () => {
    it("RuntimeObservation type has only ui field (no api: or db: fields)", async () => {
      const src = await readFile(srcPath("prototyping", "runtimeObservation.ts"), "utf-8");
      // RuntimeObservation should only have 'ui' field
      const typeBlock = src.match(/export type RuntimeObservation\s*=\s*\{[^}]+\}/)?.[0] ?? "";
      expect(typeBlock).toBeTruthy();
      expect(typeBlock).not.toMatch(/\bapi\s*:/);
      expect(typeBlock).not.toMatch(/\bdb\s*:/);
    });
  });

  describe("TC-0012-0130: specCoverage Set Comparison", () => {
    it("collectObservedRuntimeArtifacts with 2 observed routes out of 3 declared → uiOk has 2 entries", () => {
      const observation: RuntimeObservation = {
        ui: [
          {
            screenId: "scr-home",
            route: "/",
            declaredRef: "ref-home",
            rendered: true,
            browserVisited: false,
            renderEvidenceRefs: ["home.png"],
            browserQaEvidenceRefs: [],
          } satisfies ObservedUiRoute,
          {
            screenId: "scr-orders",
            route: "/orders",
            declaredRef: "ref-orders",
            rendered: true,
            browserVisited: false,
            renderEvidenceRefs: ["orders.png"],
            browserQaEvidenceRefs: [],
          } satisfies ObservedUiRoute,
        ],
      };
      const result = collectObservedRuntimeArtifacts(observation);
      expect(result.uiOk).toHaveLength(2);
      expect(result.uiOk).toContain("/");
      expect(result.uiOk).toContain("/orders");
      // "/profile" not observed
      expect(result.uiOk).not.toContain("/profile");
    });
  });
});

// ---------------------------------------------------------------------------
// WS-10: Per-screen Browser QA
// ---------------------------------------------------------------------------

describe("WS-10: per-screen Browser QA", () => {
  describe("TC-0012-0131: Per-Screen Browser QA Executions", () => {
    it("browserQaPerScreen.ts exports runBrowserQaPerScreen", async () => {
      const src = await readFile(srcPath("prototyping", "browserQaPerScreen.ts"), "utf-8");
      expect(src).toMatch(/export\s.*runBrowserQaPerScreen/);
    });

    it("browserQaPerScreen.ts iterates over screen contracts with for..of loop", async () => {
      const src = await readFile(srcPath("prototyping", "browserQaPerScreen.ts"), "utf-8");
      expect(src).toMatch(/for\s*\(.*screen.*of.*screenContracts/);
    });

    it("browserQaPerScreen.ts assigns screen.route to each finding", async () => {
      const src = await readFile(srcPath("prototyping", "browserQaPerScreen.ts"), "utf-8");
      expect(src).toContain("screen.route");
      // findings without route get screen.route assigned via nullish coalescing
      expect(src).toContain("finding.route ?? screen.route");
    });
  });
});

// ---------------------------------------------------------------------------
// WS-11: actionsWired semantics
// ---------------------------------------------------------------------------

describe("WS-11: actionsWired semantics", () => {
  describe("TC-0012-0132: Generic Phase Ref Reuse Validator Hard Fail", () => {
    it("prototypingEvidence.ts validates non-empty browserQaEvidenceRefs for runtimeGate rows", async () => {
      const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
      expect(src).toContain("browserQaEvidenceRefs");
      // Validator requires concrete artifact refs in browserQaEvidenceRefs (required: true)
      expect(src).toContain("required: true");
      expect(src).toContain("browserQaEvidenceRefs[]");
    });
  });

  describe("TC-0012-0133: Screen Without Refs Marked Unobserved", () => {
    it("buildRuntimeObservation: screen with no render and no browserQa evidence is excluded from ui", () => {
      const noEvidenceScreen: CanonicalScreenContract = {
        name: "Profile",
        screenId: "scr-profile",
        route: "/profile",
        primaryTasks: [],
        sourceRef: "ref-profile",
      };
      const result = buildRuntimeObservation({
        screenContracts: [noEvidenceScreen],
        renderResult: { entries: [], filesWritten: [] },
        browserQaResult: {
          phases: [],
          provider: "test",
          timestamp: new Date().toISOString(),
        },
      });
      expect(result.ui).toHaveLength(0);
    });

    it("phase-level Browser QA refs stay scoped to the matching screen when findings are empty", () => {
      const result = buildRuntimeObservation({
        screenContracts: SCREEN_CONTRACTS_3,
        renderResult: { entries: [], filesWritten: [] },
        browserQaResult: {
          phases: [
            {
              phase: "smoke",
              status: "passed",
              findings: [],
              repair_suggestions: [],
              evidence_refs: [".qfai/evidence/browser-qa.json#/phases/0"],
              checks_performed: ["visited /orders"],
              screen_id: "scr-orders",
              route: "/orders",
            },
          ],
          provider: "test",
          timestamp: new Date().toISOString(),
        },
      });

      expect(result.ui.map((entry) => entry.screenId)).toEqual(["scr-orders"]);
      expect(result.ui[0]?.browserQaEvidenceRefs).toEqual([
        ".qfai/evidence/browser-qa.json#/phases/0",
      ]);
    });
  });

  describe("TC-0012-0134: actionsWired Counts Only Wired Controls", () => {
    it("3 declared actions, 2 controls wired, 1 missing → actionsWired=2", () => {
      const result = buildActionCoverage({
        actionIds: ["submit", "cancel", "help"],
        controls: [
          { selector: "btn-submit", interactionTargetResolved: true },
          { selector: "btn-cancel", interactionTargetResolved: true },
        ],
        browserQaFindings: [],
      });
      expect(result.actionsWired).toBe(2);
      expect(result.actionsDeclared).toBe(3);
      expect(result.missingActions).toContain("help");
    });
  });

  describe("TC-0012-0135: Findings Do Not Increase actionsWired", () => {
    it("adding 5 non-blocking info findings does not change actionsWired=2", () => {
      const infoFinding: BrowserQaFinding = {
        phase: "smoke",
        severity: "info",
        summary: "info finding",
        detail: "detail",
        evidence_refs: [],
        repair_suggestions: [],
      };
      const result = buildActionCoverage({
        actionIds: ["submit", "cancel", "help"],
        controls: [
          { selector: "btn-submit", interactionTargetResolved: true },
          { selector: "btn-cancel", interactionTargetResolved: true },
        ],
        browserQaFindings: [infoFinding, infoFinding, infoFinding, infoFinding, infoFinding],
      });
      expect(result.actionsWired).toBe(2);
    });
  });

  // NOTE: This test expresses the SPEC requirement that actionsWired > actionsDeclared
  // should be a hard error in the validator. Expected to be RED until implementation is fixed.
  describe("TC-0012-0136: actionsWired > actionsDeclared Validator Error", () => {
    it("prototypingEvidence.ts has validation rule preventing actionsWired > actionsDeclared", async () => {
      const src = await readFile(srcPath("validators", "prototypingEvidence.ts"), "utf-8");
      expect(src).toMatch(/actionsWired.*>.*actionsDeclared|actionsWired\s*>\s*actionsDeclared/);
    });
  });

  describe("TC-0012-0137: actionsDeclared=0 Screen is Normal", () => {
    it("empty actionIds → actionsWired=0 with no error thrown", () => {
      const result = buildActionCoverage({
        actionIds: [],
        controls: [],
        browserQaFindings: [],
      });
      expect(result.actionsWired).toBe(0);
      expect(result.actionsDeclared).toBe(0);
      expect(result.actionsObserved).toBe(0);
    });

    it("actionIds with control found but interactionTargetResolved=false → actionsWired=0", () => {
      const result = buildActionCoverage({
        actionIds: ["submit"],
        controls: [{ selector: "btn-submit", interactionTargetResolved: false }],
        browserQaFindings: [],
      });
      expect(result.actionsObserved).toBe(1);
      expect(result.actionsWired).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// WS-12: Calibration SSOT and L2 structured parse
// ---------------------------------------------------------------------------

describe("WS-12: calibration SSOT and L2 structured parse", () => {
  describe("TC-0012-0138: packResolver Provides Consistent Thresholds", () => {
    it("calibration/packResolver.ts exports resolveCalibrationPack", async () => {
      const src = await readFile(srcPath("calibration", "packResolver.ts"), "utf-8");
      expect(src).toMatch(/export\s.*resolveCalibrationPack/);
    });

    it("execution.ts imports resolveCalibrationPack from calibration/packResolver.js", async () => {
      const src = await readFile(srcPath("prototyping", "execution.ts"), "utf-8");
      expect(src).toContain("resolveCalibrationPack");
      expect(src).toContain("calibration/packResolver.js");
    });
  });

  describe("TC-0012-0139: API Coverage in Artifact is Hard Error", () => {
    it("specCoverage.ts throws when spec declares apiEndpoints (non-UI prototyping coverage)", async () => {
      const src = await readFile(srcPath("prototyping", "specCoverage.ts"), "utf-8");
      expect(src).toContain("non-UI prototyping coverage");
      expect(src).toMatch(/apiEndpoints\.length\s*>\s*0|spec\.apiEndpoints\.length/);
      expect(src).toContain("throw new Error");
    });
  });

  describe("TC-0012-0140: l2Evidence Uses Structured Parser First", () => {
    it("l2Evidence.ts imports from structuredArtifactReaders.js", async () => {
      const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
      expect(src).toMatch(/from.*structuredArtifactReaders\.js/);
    });

    it("l2Evidence.ts does NOT rely on keyword-based heuristic fallback as primary path", async () => {
      const src = await readFile(srcPath("prototyping", "l2Evidence.ts"), "utf-8");
      // Must import structured readers
      expect(src).toContain("structuredArtifactReaders");
      // Must not have a naive keyword-match fallback as the first/primary parsing strategy
      const nonCommentLines = src
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
        .join("\n");
      expect(nonCommentLines).not.toMatch(/\.includes\s*\(\s*["']#\s*|\.match\s*\(.*heading.*\)/);
    });
  });
});
