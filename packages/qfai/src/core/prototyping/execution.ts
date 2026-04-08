import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../config.js";
import { readValidatedClassification } from "../detection/surfaceType.js";
import type { SurfaceType } from "../detection/surfaceType.js";
import { writeEvidenceBundles, type PrototypingSummaryBundle } from "../evidence/bundleWriter.js";
import { runRenderCapture } from "../evidence/renderRunner.js";
import type {
  RenderCaptureAdapter,
  RenderCaptureTarget,
  RenderRunnerResult,
} from "../evidence/types.js";
import type { BrowserQaInput } from "../browserQa/types.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { runFullHarness } from "../harness/runtime.js";

import { resolveLatestRecommendationArtifact } from "./recommendationArtifact.js";
import { derivePrototypingObligations, resolvePrototypingMode } from "./mode.js";
import type { PrototypingMode, PrototypingSurface } from "./types.js";
import { assertCanonicalPrototypingSurface } from "../domain/surface.js";
import type { ProviderRegistry } from "../providers/registry.js";
import { runBrowserQaOrchestrated } from "../browserQa/runner.js";
import {
  resolvePrototypingExecutionTargetUrl,
  resolvePrototypingProviders,
} from "./providerResolution.js";
import { buildUiFidelity } from "./uiFidelityBuilder.js";
import { buildRuntimeGate } from "./runtimeGateBuilder.js";
import { createObservabilityAdapter } from "./observabilityAdapter.js";

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
  // Prototyping execution decides only visual/browser evidence obligations here.
  // Discussion-side UI-bearing classification is handled separately.
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

  const renderTargets: RenderCaptureTarget[] = obligations.requireRenderBundle
    ? [{ targetId: "primary", route: "/primary", viewport: "desktop", width: 1440, height: 900 }]
    : [];
  const renderResult = await runRenderCapture(
    renderTargets,
    path.join(request.root, ".qfai", "evidence", "render"),
    request.renderAdapter ?? resolvedProviders.renderAdapter,
    { required: obligations.requireRenderBundle },
  );

  const browserQaProvider = resolvedProviders.browserProviderId
    ? resolvedProviders.registry.getQaProvider(resolvedProviders.browserProviderId)
    : request.browserQaProviderId
      ? request.providerRegistry?.getQaProvider(request.browserQaProviderId)
      : (resolvedProviders.registry.getFirstQaProvider() ??
        request.providerRegistry?.getFirstQaProvider());
  const browserQaInput = await buildBrowserQaInput({
    renderResult,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
    surface,
    required: obligations.requireBrowserQaBundle,
  });
  const browserQaResult = await runBrowserQaOrchestrated(browserQaInput, browserQaProvider);

  const summary = await buildPrototypingSummaryBundle({
    root: request.root,
    generatedAt,
    mode: modeSummary,
    surface,
    providerIds: resolvedProviders.providerIds,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
  });

  const runtimeGate = buildRuntimeGate({
    surface,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
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
    const calibration = config.prototyping?.calibration ?? {
      packPath: ".qfai/evidence/calibration.yaml",
      thresholds: { accept: 0.8, refine: 0.5 },
      maxIterations: 15,
      plateauDelta: 0.02,
      plateauLookback: 3,
    };

    const fullHarness = await runFullHarness({
      root: request.root,
      reviewer: request.reviewer,
      changeSummary: request.changeSummary ?? ["Initial measurement"],
      limitations: request.limitations ?? [],
      calibration: {
        packPath: calibration.packPath ?? ".qfai/evidence/calibration.yaml",
        packVersion: "1.0.0",
        configPath: "qfai.config.yaml",
        thresholds: {
          accept: calibration.thresholds?.accept ?? 0.8,
          refine: calibration.thresholds?.refine ?? 0.5,
        },
        maxIterations: calibration.maxIterations ?? 15,
        plateauDelta: calibration.plateauDelta ?? 0.02,
        plateauLookback: calibration.plateauLookback ?? 3,
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
      l1: { panel: "L1", total: 0, axes: [] },
      l2: { panel: "L2", total: 0, axes: [] },
    });

    const isCompleted = fullHarness.isTerminal;
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
      reviewerLogs: [
        {
          iteration: fullHarness.iteration.iteration,
          reviewerId: request.reviewer,
          verdict: fullHarness.iteration.decision === "accept" ? "approve" : "revise",
          summary: `Iteration ${fullHarness.iteration.iteration} measurement recorded`,
          evidenceRefs: [
            ...fullHarness.iteration.evidenceRefs.render,
            ...fullHarness.iteration.evidenceRefs.browserQa,
          ],
        },
      ],
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
}): Promise<PrototypingSummaryBundle> {
  const specsDir = path.join(input.root, ".qfai", "specs");
  const specNames = await safeReadDir(specsDir);
  const specs = specNames
    .filter((name) => name.startsWith("spec-"))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      specId: name,
      declared: { uiRoutes: 0, apiEndpoints: 0, dbObjects: 0 },
      checked: { uiOk: 0, apiNon404: 0, dbPresent: 0 },
      missing: { uiRoutes: [], apiEndpoints: [], dbObjects: [] },
    }));

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

async function buildBrowserQaInput(input: {
  renderResult: RenderRunnerResult;
  targetUrl?: string;
  surface: SurfaceType;
  required: boolean;
}): Promise<BrowserQaInput> {
  const capturedHtmlPath = input.renderResult.entries.find(
    (entry) => entry.status === "captured" && typeof entry.html_path === "string",
  )?.html_path;
  if (capturedHtmlPath) {
    return {
      surface: input.surface,
      routes: ["/primary"],
      htmlContent: await readFile(capturedHtmlPath, "utf-8"),
      required: input.required,
      executionSource: "html",
    };
  }
  if (input.targetUrl) {
    return {
      surface: input.surface,
      routes: ["/primary"],
      targetUrl: input.targetUrl,
      required: input.required,
      executionSource: "url",
    };
  }
  return {
    surface: input.surface,
    routes: ["/primary"],
    required: input.required,
    executionSource: "none",
  };
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}
