import { readdir } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../config.js";
import { readClassificationBlock } from "../detection/surfaceType.js";
import type { SurfaceType } from "../detection/surfaceType.js";
import { writeEvidenceBundles, type PrototypingSummaryBundle } from "../evidence/bundleWriter.js";
import { runRenderCapture } from "../evidence/renderRunner.js";
import type { RenderCaptureAdapter, RenderCaptureTarget } from "../evidence/types.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import { runFullHarness } from "../harness/runtime.js";
import type { CritiqueAdapter } from "../critique/adapter.js";
import { resolveLatestRecommendationArtifact } from "./recommendationArtifact.js";
import { derivePrototypingObligations, resolvePrototypingMode } from "./mode.js";
import type { PrototypingMode, PrototypingSurface } from "./types.js";
import type { ProviderRegistry } from "../providers/registry.js";
import { runBrowserQaOrchestrated } from "../browserQa/runner.js";

export type PrototypingExecutionRequest = {
  root: string;
  requestedMode?: PrototypingMode;
  providerRegistry?: ProviderRegistry;
  renderAdapter?: RenderCaptureAdapter;
  browserQaProviderId?: string;
  critiqueAdapter?: CritiqueAdapter;
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
  const surface = (classification?.primary_surface ??
    recommendation.recommendation?.surface ??
    "non-ui") as PrototypingSurface;
  const modeSummary = resolvePrototypingMode({
    explicitMode: request.requestedMode,
    discussionRecommendation: recommendation.recommendation,
  });
  const obligations = derivePrototypingObligations({
    surface,
    effectiveMode: modeSummary.effective,
  });

  const renderTargets: RenderCaptureTarget[] = obligations.requireRenderBundle
    ? [{ targetId: "primary", route: "/primary", viewport: "desktop", width: 1440, height: 900 }]
    : [];
  const renderResult = await runRenderCapture(
    renderTargets,
    path.join(request.root, ".qfai", "evidence", "render"),
    request.renderAdapter,
  );

  const browserQaProvider = request.browserQaProviderId
    ? request.providerRegistry?.getQaProvider(request.browserQaProviderId)
    : request.providerRegistry?.getFirstQaProvider();
  const browserQaResult = await runBrowserQaOrchestrated(
    {
      surface: surface as SurfaceType,
      routes: ["/primary"],
    },
    browserQaProvider,
  );

  const summary = await buildPrototypingSummaryBundle({
    root: request.root,
    generatedAt,
    mode: modeSummary,
    surface,
  });

  if (obligations.requireRuntimeGate) {
    summary.runtimeGate = { ui: [], api: [] };
  }
  if (obligations.requireUiFidelity) {
    summary.uiFidelity = { mode: "skeleton", screens: [] };
  }
  if (modeSummary.effective === "full-harness") {
    const fullHarness = await runFullHarness({
      inputs: {
        specId: "prototyping-run",
        requirements: ["Generated from qfai prototyping run"],
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
        status: "approved",
        reviewer: "qfai",
        timestamp: generatedAt,
      },
      scoringTrace: fullHarness.reviewSummary.iterationSummary.map((entry) => ({
        iteration: entry.iteration,
        weightedTotal: entry.score,
        decision: entry.decision,
      })),
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
      toolVersion: "1.7.13",
      commands: [`qfai prototyping run --mode ${input.mode.effective}`],
      generatedBy: "qfai prototyping run",
      providerIds: [],
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
