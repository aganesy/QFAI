import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../config.js";
import { readValidatedClassification } from "../detection/surfaceType.js";
import { writeEvidenceBundles, type PrototypingSummaryBundle } from "../evidence/bundleWriter.js";
import { runRenderCapture } from "../evidence/renderRunner.js";
import type { RenderCaptureAdapter, RenderCaptureTarget } from "../evidence/types.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { runFullHarness } from "../harness/runtime.js";
import { resolveCalibrationPack } from "../calibration/packResolver.js";

import { resolveLatestRecommendationArtifact } from "./recommendationArtifact.js";
import {
  derivePrototypingObligations,
  NON_UI_PROTOTYPING_SURFACE_MESSAGE,
  resolvePrototypingMode,
  requiresVisualBrowserEvidence,
} from "./mode.js";
import type { PrototypingMode, PrototypingSurface } from "./types.js";
import { assertCanonicalPrototypingSurface } from "../domain/surface.js";
import type { ProviderRegistry } from "../providers/registry.js";
import {
  resolvePrototypingExecutionTargetUrl,
  resolvePrototypingProviders,
} from "./providerResolution.js";
import { buildUiFidelity } from "./uiFidelityBuilder.js";
import { buildRuntimeGate } from "./runtimeGateBuilder.js";
import { createObservabilityAdapter } from "./observabilityAdapter.js";
import { buildSpecCoverageSummary, buildPerSpecCoverage } from "./specCoverage.js";
import { buildUiObservationSummary, buildBrowserQaSummaryFromResult } from "./uiObservation.js";
import { loadHistory } from "../harness/history.js";
import type { FullHarnessPanelInputs } from "../harness/panelInputs.js";
import { validatePanelInputs } from "../harness/panelInputs.js";
import {
  buildDiscussionAxisInputs,
  buildScreenContractInputs,
  buildTrendAlignmentInputs,
} from "./l2Evidence.js";
import { buildScreenRenderTargets, readCanonicalScreenContracts } from "./screenContracts.js";
import { runBrowserQaPerScreen } from "./browserQaPerScreen.js";
import { buildRuntimeObservation, type RuntimeObservation } from "./runtimeObservation.js";

export type PrototypingExecutionRequest = {
  root: string;
  requestedMode?: PrototypingMode;
  providerRegistry?: ProviderRegistry;
  renderAdapter?: RenderCaptureAdapter;
  browserQaProviderId?: string;
  renderProviderId?: string;
  targetUrl?: string;
  reviewer?: string;
  changeSummary?: string[];
  limitations?: string[];
};

export type PrototypingExecutionResult = {
  mode: PrototypingMode;
  surface: PrototypingSurface;
  evidencePaths: {
    prototyping: string;
    render: string;
    browserQa: string;
  };
  generatedAt: string;
};

export async function runPrototypingExecution(
  request: PrototypingExecutionRequest,
): Promise<PrototypingExecutionResult> {
  const generatedAt = new Date().toISOString();
  const resolved = await loadConfig(request.root);
  const config = resolved.config;
  const discussionRoot = resolvePath(request.root, config, "discussionDir");
  const latestPack = await findLatestDiscussionPackDir(discussionRoot);
  const recommendation = await resolveLatestRecommendationArtifact(request.root, config);

  // Hard gate: invalid recommendation artifact must reject execution immediately.
  // No fallback to explicit mode, default mode, or warning-only continuation.
  if (recommendation.status === "invalid") {
    throw new Error(
      "Prototyping recommendation artifact is invalid. " +
        "Canonical namespaced schema is required under 'prototyping:' key. " +
        "Top-level recommendation keys are not supported. " +
        "recommended_mode must be included in allowed_modes. " +
        "Fix prototyping.yaml before running prototyping execution.",
    );
  }

  const classification = await readValidatedClassification(latestPack ?? request.root);
  if (classification === null) {
    throw new Error(
      "Classification is invalid or contradictory. " +
        "Prototyping execution requires a valid classification in 01_Context.md. " +
        "Fix the classification block before running prototyping.",
    );
  }
  if (!classification.ui_bearing || classification.primary_surface === "non-ui") {
    throw new Error(
      "Non-UI classification is not a prototyping execution target. " +
        "surface field must be one of: web, mobile, desktop, cli, mixed.",
    );
  }
  const recommendationSurface = recommendation.recommendation?.surface;
  const classifiedSurface = classification.primary_surface;
  const resolvedSurface = recommendationSurface ?? classifiedSurface;
  const surface: PrototypingSurface = assertCanonicalPrototypingSurface(resolvedSurface);
  const modeSummary = resolvePrototypingMode({
    explicitMode: request.requestedMode,
    discussionRecommendation: recommendation.recommendation,
  });
  const obligations = derivePrototypingObligations({
    surface,
    effectiveMode: modeSummary.effective,
  });
  if (!obligations.validCombination) {
    throw new Error(obligations.invalidReason ?? NON_UI_PROTOTYPING_SURFACE_MESSAGE);
  }
  const targetUrl = resolvePrototypingExecutionTargetUrl({
    ...(request.targetUrl !== undefined ? { requestTargetUrl: request.targetUrl } : {}),
    config,
  });
  const resolvedProviders = resolvePrototypingProviders({
    config,
    ...(request.browserQaProviderId !== undefined
      ? { browserProviderId: request.browserQaProviderId }
      : {}),
    ...(request.renderProviderId !== undefined
      ? { renderProviderId: request.renderProviderId }
      : {}),
    ...(targetUrl !== undefined ? { targetUrl } : {}),
  });

  const visualFullHarness =
    modeSummary.effective === "full-harness" && requiresVisualBrowserEvidence(surface);
  const effectiveRenderAdapter = request.renderAdapter ?? resolvedProviders.renderAdapter;
  const screenContracts = visualFullHarness ? await readCanonicalScreenContracts(latestPack) : [];
  if (visualFullHarness && screenContracts.length === 0) {
    throw new Error(
      "Full-harness requires canonical screen contracts in uiux/40_screen_contracts.md for UI-bearing surfaces.",
    );
  }
  const renderTargets: RenderCaptureTarget[] = obligations.requireRenderBundle
    ? buildScreenRenderTargets(screenContracts)
    : [];
  if (visualFullHarness && !effectiveRenderAdapter) {
    throw new Error("Full-harness requires a render adapter for UI-bearing surfaces.");
  }
  const renderResult = await runRenderCapture(
    renderTargets,
    path.join(request.root, ".qfai", "evidence", "render"),
    effectiveRenderAdapter,
    { required: obligations.requireRenderBundle },
  );

  const browserQaProvider = resolvedProviders.browserProviderId
    ? resolvedProviders.registry.getQaProvider(resolvedProviders.browserProviderId)
    : request.browserQaProviderId
      ? request.providerRegistry?.getQaProvider(request.browserQaProviderId)
      : (resolvedProviders.registry.getFirstQaProvider() ??
        request.providerRegistry?.getFirstQaProvider());
  if (visualFullHarness && !browserQaProvider) {
    throw new Error("Full-harness requires a browser QA adapter for UI-bearing surfaces.");
  }
  const browserQaResult = await runBrowserQaPerScreen({
    surface,
    required: obligations.requireBrowserQaBundle,
    screenContracts,
    renderResult,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
    ...(browserQaProvider ? { provider: browserQaProvider } : {}),
  });
  const runtimeObservation = buildRuntimeObservation({
    screenContracts,
    renderResult,
    browserQaResult,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
  });
  const runtimeGate = buildRuntimeGate({ runtimeObservation });

  const summary = await buildPrototypingSummaryBundle({
    root: request.root,
    generatedAt,
    mode: modeSummary,
    surface,
    providerIds: resolvedProviders.providerIds,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
    ...(runtimeGate !== undefined ? { runtimeGate } : {}),
  });

  if (runtimeGate) {
    summary.runtimeGate = runtimeGate;
  }
  const uiFidelity = await buildUiFidelity({
    root: request.root,
    config,
    required: obligations.requireUiFidelity,
    renderResult,
    browserQaResult,
  });
  if (uiFidelity.uiFidelity) {
    summary.uiFidelity = uiFidelity.uiFidelity;
  }
  summary.uiFidelityStatus = uiFidelity.status;
  if (uiFidelity.missingRequiredEvidence.length > 0) {
    summary.missingRequiredEvidence = uiFidelity.missingRequiredEvidence;
  }
  if (modeSummary.effective === "full-harness") {
    // Reviewer is mandatory for full-harness
    if (!request.reviewer) {
      throw new Error(
        "Full-harness mode requires --reviewer <id>. " +
          "Provide a real reviewer identifier via the CLI flag.",
      );
    }

    // Reject placeholder reviewer identifiers
    const normalizedReviewer = request.reviewer.toLowerCase().trim();
    const placeholders = [
      "qfai",
      "default",
      "system",
      "auto",
      "placeholder",
      "tbd",
      "n/a",
      "none",
      "unknown",
      "",
    ];
    if (placeholders.includes(normalizedReviewer)) {
      throw new Error(
        `Reviewer identifier "${request.reviewer}" is a placeholder. ` +
          `Provide a real reviewer identity for full-harness mode.`,
      );
    }

    // CalibrationLoader — pack is SSOT for all thresholds/params (fail-closed)
    const calibrationConfig = config.prototyping?.calibration;
    const packPath = calibrationConfig?.packPath ?? ".qfai/evidence/calibration.yaml";
    try {
      const calibrationPack = await resolveCalibrationPack({
        root: request.root,
        packPath,
      });
      const packVersion = calibrationPack.pack.version;

      // v1.7.15: pack is SSOT — no config fallback for thresholds/maxIterations/plateau
      const thresholds = calibrationPack.thresholds;
      const maxIterations = calibrationPack.maxIterations;
      const plateauDelta = calibrationPack.plateauDelta;
      const plateauLookback = calibrationPack.plateauLookback;

      // Build spec coverage from real artifacts
      const specsDir = path.join(request.root, ".qfai", "specs");
      const runtimeGateForCoverage = buildRuntimeGate({ runtimeObservation });
      const specCoverage = await buildSpecCoverageSummary(
        specsDir,
        runtimeObservation,
        path.join(request.root, ".qfai", "evidence"),
      );

      // Build UI observation from real DOM/render
      const uiObservation = await buildUiObservationSummary(
        renderResult,
        browserQaResult,
        screenContracts,
      );

      // Build browser QA summary from real results
      const browserQaSummary = buildBrowserQaSummaryFromResult(browserQaResult);

      // Assemble panel inputs from real evidence
      const runtimeGateEvidence = runtimeGateForCoverage
        ? {
            uiRoutes: runtimeGateForCoverage.ui,
            evidenceRefs: runtimeGateForCoverage.evidenceRefs,
          }
        : { uiRoutes: [], evidenceRefs: [] };

      // Build L2 inputs from real artifacts (no zero-filling)
      const discussionAxes = await buildDiscussionAxisInputs(request.root);
      const screenContractInputs = uiFidelity.uiFidelity
        ? await buildScreenContractInputs(request.root, uiFidelity.uiFidelity.screens)
        : (() => {
            throw new Error(
              "Full-harness requires UI fidelity screens for screen contract inputs. " +
                "No screen contracts could be resolved.",
            );
          })();
      const trendAlignment = await buildTrendAlignmentInputs(request.root);

      const panelInputs: FullHarnessPanelInputs = {
        runtimeGate: runtimeGateEvidence,
        renderEvidence: {
          totalScreens: renderResult.entries.length,
          capturedScreens: renderResult.entries.filter((e) => e.status === "captured").length,
          failedScreens: renderResult.entries.filter((e) => e.status === "failed").length,
          viewports: [...new Set(renderResult.entries.map((e) => e.viewport))],
          evidenceRefs: renderResult.filesWritten,
        },
        browserQa: browserQaSummary,
        uiObservation,
        specCoverage,
        discussionAxes,
        screenContract: screenContractInputs,
        trendAlignment,
      };

      // Validate panel inputs — missing evidence must fail, not silently score to 0
      validatePanelInputs(panelInputs);

      const fullHarness = await runFullHarness({
        root: request.root,
        reviewer: request.reviewer,
        changeSummary: request.changeSummary ?? ["Initial measurement"],
        limitations: request.limitations ?? [],
        calibration: {
          packPath,
          packVersion,
          configPath: "qfai.config.yaml",
          thresholds,
          maxIterations,
          plateauDelta,
          plateauLookback,
        },
        adapters: {
          surface,
          render: {
            // eslint-disable-next-line @typescript-eslint/require-await
            captureEvidence: async () => renderResult,
          },
          browserQa: {
            // eslint-disable-next-line @typescript-eslint/require-await
            runQa: async () => browserQaResult,
          },
          observability: createObservabilityAdapter(request.root),
        },
        screenContracts: screenContracts.map((screen) => ({
          screenId: screen.screenId,
          route: screen.route,
        })),
        panelInputs,
      });

      const isCompleted = fullHarness.isTerminal;

      // Load cumulative reviewerLogs from history (append-only)
      const previousHistory = await loadHistory(request.root);
      const previousLogs: Array<{
        iteration: number;
        reviewerId: string;
        verdict: "approve" | "revise" | "reject";
        summary: string;
        evidenceRefs: string[];
      }> = [];
      if (previousHistory) {
        // Extract previous reviewerLogs from existing prototyping.json fullHarness block
        try {
          const existingJson = await readFile(
            path.join(request.root, ".qfai", "evidence", "prototyping.json"),
            "utf-8",
          );
          const existingParsed = JSON.parse(existingJson) as Record<string, unknown>;
          const existingFh = existingParsed.fullHarness as Record<string, unknown> | undefined;
          if (existingFh && Array.isArray(existingFh.reviewerLogs)) {
            previousLogs.push(...(existingFh.reviewerLogs as typeof previousLogs));
          }
        } catch {
          // No previous logs to accumulate
        }
      }

      const currentLog = {
        iteration: fullHarness.iteration.iteration,
        reviewerId: request.reviewer,
        verdict: (fullHarness.iteration.decision === "accept" ? "approve" : "revise") as
          | "approve"
          | "revise"
          | "reject",
        summary: `Iteration ${fullHarness.iteration.iteration}: decision=${fullHarness.iteration.decision} weightedTotal=${fullHarness.iteration.weightedTotal.toFixed(3)} limitations=${fullHarness.iteration.limitations.length}`,
        evidenceRefs: [
          ...fullHarness.iteration.evidenceRefs.render,
          ...fullHarness.iteration.evidenceRefs.browserQa,
          ...fullHarness.iteration.evidenceRefs.runtimeGate,
          ...fullHarness.iteration.evidenceRefs.uiObservation,
          ...fullHarness.iteration.evidenceRefs.specCoverage,
          ...fullHarness.iteration.evidenceRefs.discussion,
          ...fullHarness.iteration.evidenceRefs.screenContract,
          ...fullHarness.iteration.evidenceRefs.trend,
        ],
      };

      // Cumulative reviewerLogs (append-only)
      const cumulativeReviewerLogs = [...previousLogs, currentLog];

      summary.fullHarness = {
        enabled: true,
        runId: fullHarness.history.runId,
        calibrationRef: fullHarness.calibrationRef,
        iterationCount: fullHarness.history.iterations.length,
        bestIteration: fullHarness.history.bestIteration,
        status: isCompleted ? "completed" : "in-progress",
        ...(fullHarness.terminationReason
          ? { terminationReason: fullHarness.terminationReason }
          : {}),
        reviewerSignoff: {
          reviewerId: request.reviewer,
          status: isCompleted ? "approved" : "rejected",
          timestamp: generatedAt,
          source: "cli",
        },
        reviewerLogs: cumulativeReviewerLogs,
        iterations: fullHarness.history.iterations,
        scoringTrace: fullHarness.history.scoringTrace,
        limitations: fullHarness.iteration.limitations,
      };
      const evidencePaths = await writeEvidenceBundles({
        root: request.root,
        render: { result: renderResult, surface, mode: modeSummary.effective, generatedAt },
        browserQa: { result: browserQaResult, mode: modeSummary.effective },
        prototyping: summary,
        fullHarnessArtifacts: {
          fakeUiDetection: fullHarness.fakeUiDetection,
          handoff: fullHarness.handoff,
          exitReason: fullHarness.exitReason,
        },
      });

      return {
        mode: modeSummary.effective,
        surface,
        evidencePaths: {
          prototyping: evidencePaths.prototypingPath,
          render: evidencePaths.renderPath,
          browserQa: evidencePaths.browserQaPath,
        },
        generatedAt,
      };
    } catch (err) {
      throw new Error(
        `Full-harness requires a valid calibration pack at ${packPath}. ` +
          `Load failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const evidencePaths = await writeEvidenceBundles({
    root: request.root,
    render: { result: renderResult, surface, mode: modeSummary.effective, generatedAt },
    browserQa: { result: browserQaResult, mode: modeSummary.effective },
    prototyping: summary,
  });

  return {
    mode: modeSummary.effective,
    surface,
    evidencePaths: {
      prototyping: evidencePaths.prototypingPath,
      render: evidencePaths.renderPath,
      browserQa: evidencePaths.browserQaPath,
    },
    generatedAt,
  };
}

async function buildPrototypingSummaryBundle(input: {
  root: string;
  generatedAt: string;
  mode: ReturnType<typeof resolvePrototypingMode>;
  surface: PrototypingSurface;
  providerIds: string[];
  targetUrl?: string;
  runtimeGate?: {
    ui: Array<{
      screenId: string;
      route: string;
      url?: string;
      rendered: boolean;
      browserVisited: boolean;
      httpStatus?: number;
      renderEvidenceRefs: string[];
      browserQaEvidenceRefs: string[];
    }>;
  };
}): Promise<PrototypingSummaryBundle> {
  const specsDir = path.join(input.root, ".qfai", "specs");
  const perSpecCoverage = await buildPerSpecCoverage(
    specsDir,
    runtimeGateToObservation(input.runtimeGate),
  );
  const perSpecMap = new Map(perSpecCoverage.map((s) => [s.specId, s]));
  const specNames = await safeReadDir(specsDir);
  const specs = specNames
    .filter((name) => name.startsWith("spec-"))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const perSpec = perSpecMap.get(name);
      if (!perSpec) {
        throw new Error(
          `Spec coverage build failure: spec "${name}" exists but has no coverage data. ` +
            `All specs must have corresponding coverage results.`,
        );
      }
      return {
        specId: name,
        declared: { ...perSpec.declared },
        checked: { ...perSpec.checked },
        missing: {
          uiRoutes: [...perSpec.missing.uiRoutes],
          apiEndpoints: [],
          dbObjects: [],
        },
      };
    });

  return {
    surface: input.surface,
    specs,
    mode: {
      ...(input.mode.requested ? { requested: input.mode.requested } : {}),
      effective: input.mode.effective,
      source: input.mode.source,
      rationale: input.mode.rationale,
    },
    meta: {
      generatedAt: input.generatedAt,
      toolVersion: "1.7.15",
      commands: [`qfai prototyping run --mode ${input.mode.effective}`],
      generatedBy: "qfai prototyping run",
      providerIds: input.providerIds,
      ...(input.targetUrl ? { targetUrl: input.targetUrl } : {}),
    },
  };
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

function runtimeGateToObservation(
  runtimeGate:
    | {
        ui: Array<{
          screenId: string;
          route: string;
          url?: string;
          rendered: boolean;
          browserVisited: boolean;
          httpStatus?: number;
          renderEvidenceRefs: string[];
          browserQaEvidenceRefs: string[];
        }>;
      }
    | undefined,
): RuntimeObservation | undefined {
  if (!runtimeGate) {
    return undefined;
  }
  return {
    ui: runtimeGate.ui.map((entry) => ({ ...entry })),
  };
}
