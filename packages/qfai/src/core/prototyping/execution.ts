import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../config.js";
import { readClassificationBlock } from "../detection/surfaceType.js";
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
import type { CritiqueAdapter } from "../critique/adapter.js";
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
  critiqueAdapter?: CritiqueAdapter;
  renderProviderId?: string;
  targetUrl?: string;
  reviewer?: string;
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
  const classification = await readClassificationBlock(latestPack ?? request.root);
  const recommendationSurface = recommendation.recommendation?.surface;
  const classifiedSurface =
    classification?.primary_surface && classification.primary_surface !== "non-ui"
      ? classification.primary_surface
      : undefined;
  const resolvedSurface = recommendationSurface ?? classifiedSurface;
  if (!resolvedSurface) {
    throw new Error(
      "ui_bearing: false specs must not invoke prototyping execution. " +
        "surface field must be one of: web, mobile, desktop, cli, mixed.",
    );
  }
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

  const resolvedReviewer = request.reviewer ?? config.prototyping?.execution?.reviewer ?? undefined;

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
    const fullHarness = await runFullHarness({
      inputs: {
        specId: "prototyping-run",
        requirements: ["Generated from qfai prototyping run"],
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
      ...(request.critiqueAdapter ? { critiqueAdapter: request.critiqueAdapter } : {}),
    });
    summary.fullHarness = {
      enabled: true,
      available: true,
      runId: fullHarness.evidence.runId,
      iterationCount: fullHarness.loopResult.iterationCount,
      bestIteration: fullHarness.loopResult.bestIteration,
      terminationReason: fullHarness.loopResult.terminationReason,
      reviewerSignoff: {
        status: resolvedReviewer ? "approved" : "pending",
        reviewer: resolvedReviewer ?? "qfai",
        timestamp: generatedAt,
      },
      scoringTrace: fullHarness.reviewSummary.iterationSummary.map((entry) => ({
        iteration: entry.iteration,
        weightedTotal: entry.score,
        decision: entry.decision,
      })),
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
      toolVersion: "1.7.14",
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
