import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "../config.js";
import { readValidatedClassification } from "../detection/surfaceType.js";
import { writeEvidenceBundles, type PrototypingSummaryBundle } from "../evidence/bundleWriter.js";
import { runRenderCapture } from "../evidence/renderRunner.js";
import type { RenderCaptureAdapter, RenderCaptureTarget } from "../evidence/types.js";
import { findLatestDiscussionPackDir } from "../discussionPack.js";
import {
  resolveCalibrationPack,
  type ResolvedCalibrationPack,
} from "../calibration/packResolver.js";
import { runFullHarness } from "../harness/runtime.js";
import type { FullHarnessPanelInputs } from "../harness/panelInputs.js";
import type { FullHarnessIteration } from "../harness/types.js";
import { validatePanelInputs } from "../harness/panelInputs.js";
import { loadHistory } from "../harness/history.js";

import { resolveLatestRecommendationArtifact } from "./recommendationArtifact.js";
import {
  derivePrototypingObligations,
  NON_UI_PROTOTYPING_SURFACE_MESSAGE,
  resolvePrototypingMode,
} from "./mode.js";
import type { PrototypingMode, PrototypingSurface } from "./types.js";
import { assertCanonicalPrototypingSurface } from "../domain/surface.js";
import type { ProviderRegistry } from "../providers/registry.js";
import {
  resolvePrototypingExecutionTargetUrl,
  resolvePrototypingProviders,
} from "./providerResolution.js";
import { buildUiFidelity, type BuiltUiFidelity } from "./uiFidelityBuilder.js";
import { buildRuntimeGate } from "./runtimeGateBuilder.js";
import {
  isBrowserQaPassthroughRef,
  normalizeConcreteArtifactRef,
  toConcreteArtifactRef,
} from "./pathUtils.js";
import {
  assertBrowserQaEvidenceRefs,
  assertConcreteArtifactRefs,
  isCanonicalScreenContractRef,
  isSpecDeclarationRef,
} from "./refSemantics.js";
import { createObservabilityAdapter } from "./observabilityAdapter.js";
import { buildSpecCoverageSummary, buildPerSpecCoverage } from "./specCoverage.js";
import { buildUiObservationSummary, buildBrowserQaSummaryFromResult } from "./uiObservation.js";
import {
  buildDiscussionAxisInputs,
  buildScreenContractInputs,
  buildTrendAlignmentInputs,
} from "./l2Evidence.js";
import { buildScreenRenderTargets, readCanonicalScreenContracts } from "./screenContracts.js";
import { runBrowserQaPerScreen } from "./browserQaPerScreen.js";
import { buildRuntimeObservation, type RuntimeObservation } from "./runtimeObservation.js";
import {
  assertSupportedPrototypingSurface,
  getSupportedPrototypingSurfacesLabel,
  isSupportedPrototypingSurface,
} from "./surfacePolicy.js";
import {
  CalibrationResolutionError,
  EvidenceWriteError,
  FullHarnessRuntimeError,
  L2EvidenceBuildError,
  SpecCoverageBuildError,
  UiFidelityEvidenceError,
} from "./errors.js";

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
  const configPathForSummary = toRelativeSummaryPath(request.root, resolved.configPath);
  const discussionRoot = resolvePath(request.root, config, "discussionDir");
  const latestPack = await findLatestDiscussionPackDir(discussionRoot);
  const recommendation = await resolveLatestRecommendationArtifact(request.root, config);

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
        `surface field must be one of: ${getSupportedPrototypingSurfacesLabel()}.`,
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
  const supportedSurface = assertSupportedPrototypingSurface(surface);
  const obligations = derivePrototypingObligations({
    surface: supportedSurface,
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

  if (!request.reviewer) {
    throw new Error(
      "Full-harness mode requires --reviewer <id>. " +
        "Provide a real reviewer identifier via the CLI flag.",
    );
  }
  assertReviewerIsNotPlaceholder(request.reviewer);

  const calibrationConfig = config.prototyping?.calibration;
  const packPath = calibrationConfig?.packPath ?? ".qfai/evidence/calibration.yaml";
  const resolvedCalibration = await resolveCalibrationOrThrow({
    root: request.root,
    packPath,
  });

  const visualFullHarness = isSupportedPrototypingSurface(supportedSurface);
  const effectiveRenderAdapter = request.renderAdapter ?? resolvedProviders.renderAdapter;
  const screenContracts = visualFullHarness ? await readCanonicalScreenContracts(latestPack) : [];
  if (screenContracts.length === 0) {
    throw new Error(
      "Full-harness requires canonical screen contracts in uiux/40_screen_contracts.md for UI-bearing surfaces.",
    );
  }

  const renderTargets: RenderCaptureTarget[] = buildScreenRenderTargets(screenContracts);
  if (!effectiveRenderAdapter) {
    throw new Error("Full-harness requires a render adapter for UI-bearing surfaces.");
  }
  const renderResult = await runRenderCapture(
    renderTargets,
    path.join(request.root, ".qfai", "evidence", "render"),
    effectiveRenderAdapter,
    { required: true },
  );

  const browserQaProvider = resolvedProviders.browserProviderId
    ? (request.providerRegistry?.getQaProvider(resolvedProviders.browserProviderId) ??
      resolvedProviders.registry.getQaProvider(resolvedProviders.browserProviderId))
    : (request.providerRegistry?.getFirstQaProvider() ??
      resolvedProviders.registry.getFirstQaProvider());
  if (!browserQaProvider) {
    throw new Error("Full-harness requires a browser QA adapter for UI-bearing surfaces.");
  }
  const browserQaResult = await runBrowserQaPerScreen({
    surface: supportedSurface,
    required: true,
    screenContracts,
    renderResult,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
    provider: browserQaProvider,
  });

  const runtimeObservation = buildRuntimeObservation({
    screenContracts,
    renderResult,
    browserQaResult,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
  });
  const normalizedRuntimeObservation = normalizeRuntimeObservationRefs(
    request.root,
    runtimeObservation,
  );
  const runtimeGate = buildRuntimeGate({ runtimeObservation: normalizedRuntimeObservation });

  const summary = await buildPrototypingSummaryBundle({
    root: request.root,
    generatedAt,
    mode: modeSummary,
    surface: supportedSurface,
    providerIds: resolvedProviders.providerIds,
    ...(targetUrl !== undefined ? { targetUrl } : {}),
    ...(runtimeGate !== undefined ? { runtimeGate } : {}),
  });
  if (runtimeGate) {
    summary.runtimeGate = runtimeGate;
  }

  const uiFidelity = await buildUiFidelityOrThrow({
    root: request.root,
    config,
    required: obligations.requireUiFidelity,
    renderResult,
    browserQaResult,
    screenContracts: screenContracts.map((screen) => ({
      screenId: screen.screenId,
      route: screen.route,
    })),
  });
  summary.uiFidelity = uiFidelity.uiFidelity;
  summary.uiFidelityStatus = uiFidelity.status;

  const specsDir = path.join(request.root, ".qfai", "specs");
  const specCoverage = await buildSpecCoverageOrThrow({
    root: request.root,
    specsDir,
    runtimeObservation: normalizedRuntimeObservation,
    renderFilesWritten: renderResult.filesWritten,
    browserQaResult,
  });

  const uiObservation = await buildUiObservationSummary(
    renderResult,
    browserQaResult,
    screenContracts,
  );
  const browserQaSummary = buildBrowserQaSummaryFromResult(browserQaResult);
  const runtimeGateEvidence = runtimeGate
    ? {
        uiRoutes: runtimeGate.ui,
        evidenceRefs: runtimeGate.evidenceRefs,
      }
    : { uiRoutes: [], evidenceRefs: [] };

  const panelInputs = await buildPanelInputsOrThrow({
    root: request.root,
    uiFidelityScreens: uiFidelity.uiFidelity.screens,
    renderResult,
    browserQaSummary,
    uiObservation,
    specCoverage,
    runtimeGateEvidence,
  });

  const fullHarness = await runFullHarnessOrThrow({
    request,
    reviewer: request.reviewer,
    supportedSurface,
    resolvedCalibration,
    configPathForSummary,
    renderResult,
    browserQaResult,
    screenContracts: screenContracts.map((screen) => ({
      screenId: screen.screenId,
      route: screen.route,
    })),
    panelInputs,
  });

  const cumulativeReviewerLogs = await buildCumulativeReviewerLogs({
    root: request.root,
    reviewer: request.reviewer,
    fullHarness,
  });

  summary.fullHarness = {
    enabled: true,
    runId: fullHarness.history.runId,
    calibrationRef: fullHarness.calibrationRef,
    iterationCount: fullHarness.history.iterations.length,
    bestIteration: fullHarness.history.bestIteration,
    status: fullHarness.isTerminal ? "completed" : "in-progress",
    ...(fullHarness.isTerminal && fullHarness.terminationReason
      ? { terminationReason: fullHarness.terminationReason }
      : {}),
    finalDecision: fullHarness.isTerminal ? fullHarness.finalDecision : "pending",
    reviewerSignoff: {
      reviewerId: request.reviewer,
      status: fullHarness.isTerminal ? fullHarness.signoffStatus : "pending",
      ...(fullHarness.isTerminal ? { timestamp: generatedAt } : {}),
      source: "cli",
    },
    reviewerLogs: cumulativeReviewerLogs,
    iterations: fullHarness.history.iterations,
    scoringTrace: fullHarness.history.scoringTrace,
    limitations: fullHarness.iteration.limitations,
  };

  if (runtimeGate) {
    assertRuntimeGateLeafRefs(runtimeGate);
    assertConcreteArtifactRefs("runtimeGate.evidenceRefs", runtimeGate.evidenceRefs);
  }
  assertConcreteArtifactRefs("specCoverage.evidenceRefs", specCoverage.evidenceRefs);
  assertFullHarnessLeafRefs(fullHarness.history.iterations, "fullHarness.iterations");
  for (const log of cumulativeReviewerLogs) {
    assertConcreteArtifactRefs(
      `fullHarness.reviewerLogs[${log.iteration}:${log.reviewerId}].evidenceRefs`,
      log.evidenceRefs,
    );
  }

  const evidencePaths = await writeEvidenceBundlesOrThrow({
    root: request.root,
    render: {
      result: renderResult,
      surface: supportedSurface,
      mode: modeSummary.effective,
      generatedAt,
    },
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
    surface: supportedSurface,
    evidencePaths: {
      prototyping: evidencePaths.prototypingPath,
      render: evidencePaths.renderPath,
      browserQa: evidencePaths.browserQaPath,
    },
    generatedAt,
  };
}

async function resolveCalibrationOrThrow(input: {
  root: string;
  packPath: string;
}): Promise<ResolvedCalibrationPack> {
  try {
    return await resolveCalibrationPack(input);
  } catch (error) {
    throw new CalibrationResolutionError(
      `Calibration pack resolution failed for "${input.packPath}". ${formatError(error)}`,
      { cause: error },
    );
  }
}

async function buildUiFidelityOrThrow(input: {
  root: string;
  config: Awaited<ReturnType<typeof loadConfig>>["config"];
  required: boolean;
  renderResult: Awaited<ReturnType<typeof runRenderCapture>>;
  browserQaResult: Awaited<ReturnType<typeof runBrowserQaPerScreen>>;
  screenContracts: Array<{ screenId: string; route: string }>;
}) {
  let uiFidelity;
  try {
    uiFidelity = await buildUiFidelity({
      root: input.root,
      config: input.config,
      required: input.required,
      renderResult: input.renderResult,
      browserQaResult: input.browserQaResult,
    });
  } catch (error) {
    throw new UiFidelityEvidenceError(
      `UI fidelity evidence construction failed. ${formatError(error)}`,
      { cause: error },
    );
  }

  const built = uiFidelity.uiFidelity;
  if (!built) {
    throw new UiFidelityEvidenceError("UI fidelity evidence is missing.");
  }

  const missingScreens = input.screenContracts.filter(
    (screen) => !built.screens.some((entry) => entry.screenId === screen.screenId),
  );
  const missingRequiredEvidence = uiFidelity.missingRequiredEvidence;
  const hasIncompleteStatus = uiFidelity.status.status !== "completed";
  if (hasIncompleteStatus || missingRequiredEvidence.length > 0 || missingScreens.length > 0) {
    throw new UiFidelityEvidenceError(
      buildUiFidelityEvidenceMessage({
        status: uiFidelity.status.status,
        missingRequiredEvidence,
        missingScreens,
        ...(uiFidelity.status.reason ? { reason: uiFidelity.status.reason } : {}),
      }),
    );
  }

  return {
    uiFidelity: built,
    status: uiFidelity.status,
  };
}

async function buildSpecCoverageOrThrow(input: {
  root: string;
  specsDir: string;
  runtimeObservation: RuntimeObservation;
  renderFilesWritten: string[];
  browserQaResult: Awaited<ReturnType<typeof runBrowserQaPerScreen>>;
}) {
  try {
    return await buildSpecCoverageSummary({
      root: input.root,
      specsDir: input.specsDir,
      runtimeObservation: input.runtimeObservation,
      observedEvidenceRefs: [
        ...input.renderFilesWritten,
        ...collectBrowserQaEvidenceRefs(input.browserQaResult),
      ],
    });
  } catch (error) {
    throw new SpecCoverageBuildError(`Spec coverage construction failed. ${formatError(error)}`, {
      cause: error,
    });
  }
}

async function buildPanelInputsOrThrow(input: {
  root: string;
  uiFidelityScreens: NonNullable<BuiltUiFidelity["uiFidelity"]>["screens"];
  renderResult: Awaited<ReturnType<typeof runRenderCapture>>;
  browserQaSummary: ReturnType<typeof buildBrowserQaSummaryFromResult>;
  uiObservation: Awaited<ReturnType<typeof buildUiObservationSummary>>;
  specCoverage: Awaited<ReturnType<typeof buildSpecCoverageSummary>>;
  runtimeGateEvidence: FullHarnessPanelInputs["runtimeGate"];
}): Promise<FullHarnessPanelInputs> {
  try {
    const discussionAxes = await buildDiscussionAxisInputs(input.root);
    const screenContractInputs = await buildScreenContractInputs(
      input.root,
      input.uiFidelityScreens,
    );
    const trendAlignment = await buildTrendAlignmentInputs(input.root);
    const uiObservation = normalizeUiObservationSummary(input.root, input.uiObservation);

    const panelInputs: FullHarnessPanelInputs = {
      runtimeGate: input.runtimeGateEvidence,
      renderEvidence: {
        totalScreens: input.renderResult.entries.length,
        capturedScreens: input.renderResult.entries.filter((entry) => entry.status === "captured")
          .length,
        failedScreens: input.renderResult.entries.filter((entry) => entry.status === "failed")
          .length,
        viewports: [...new Set(input.renderResult.entries.map((entry) => entry.viewport))],
        evidenceRefs: normalizeEvidenceRefList(input.root, input.renderResult.filesWritten),
      },
      browserQa: {
        ...input.browserQaSummary,
        evidenceRefs: normalizeEvidenceRefList(input.root, input.browserQaSummary.evidenceRefs),
      },
      uiObservation,
      specCoverage: input.specCoverage,
      discussionAxes: {
        ...discussionAxes,
        evidenceRefs: normalizeEvidenceRefList(input.root, discussionAxes.evidenceRefs),
      },
      screenContract: {
        ...screenContractInputs,
        evidenceRefs: normalizeEvidenceRefList(input.root, screenContractInputs.evidenceRefs),
      },
      trendAlignment: {
        ...trendAlignment,
        evidenceRefs: normalizeEvidenceRefList(input.root, trendAlignment.evidenceRefs),
      },
    };
    validatePanelInputs(panelInputs);
    return panelInputs;
  } catch (error) {
    throw new L2EvidenceBuildError(`L2 evidence construction failed. ${formatError(error)}`, {
      cause: error,
    });
  }
}

async function runFullHarnessOrThrow(input: {
  request: PrototypingExecutionRequest;
  reviewer: string;
  supportedSurface: PrototypingSurface;
  resolvedCalibration: ResolvedCalibrationPack;
  configPathForSummary: string;
  renderResult: Awaited<ReturnType<typeof runRenderCapture>>;
  browserQaResult: Awaited<ReturnType<typeof runBrowserQaPerScreen>>;
  screenContracts: Array<{ screenId: string; route: string }>;
  panelInputs: FullHarnessPanelInputs;
}) {
  try {
    return await runFullHarness({
      root: input.request.root,
      reviewer: input.reviewer,
      changeSummary: input.request.changeSummary ?? ["Initial measurement"],
      limitations: input.request.limitations ?? [],
      calibrationPack: input.resolvedCalibration.pack,
      calibrationRef: {
        packPath: input.resolvedCalibration.packPath,
        packVersion: input.resolvedCalibration.pack.version,
        configPath: input.configPathForSummary,
      },
      adapters: {
        surface: input.supportedSurface,
        render: {
          // eslint-disable-next-line @typescript-eslint/require-await
          captureEvidence: async () => input.renderResult,
        },
        browserQa: {
          // eslint-disable-next-line @typescript-eslint/require-await
          runQa: async () => input.browserQaResult,
        },
        observability: createObservabilityAdapter(input.request.root),
      },
      screenContracts: input.screenContracts,
      panelInputs: input.panelInputs,
    });
  } catch (error) {
    throw new FullHarnessRuntimeError(`Full-harness runtime failed. ${formatError(error)}`, {
      cause: error,
    });
  }
}

async function buildCumulativeReviewerLogs(input: {
  root: string;
  reviewer: string;
  fullHarness: Awaited<ReturnType<typeof runFullHarness>>;
}) {
  const previousLogs: Array<{
    iteration: number;
    reviewerId: string;
    verdict: "approve" | "revise" | "reject";
    summary: string;
    evidenceRefs: string[];
  }> = [];
  const previousHistory = await loadHistory(input.root);
  if (previousHistory) {
    try {
      const existingJson = await readFile(
        path.join(input.root, ".qfai", "evidence", "prototyping.json"),
        "utf-8",
      );
      const existingParsed = JSON.parse(existingJson) as Record<string, unknown>;
      const existingFh = existingParsed.fullHarness as Record<string, unknown> | undefined;
      if (existingFh && Array.isArray(existingFh.reviewerLogs)) {
        previousLogs.push(...(existingFh.reviewerLogs as typeof previousLogs));
      }
    } catch {
      // Ignore malformed previous evidence; the current run will write the authoritative bundle.
    }
  }

  const currentLog = {
    iteration: input.fullHarness.iteration.iteration,
    reviewerId: input.reviewer,
    verdict: input.fullHarness.logVerdict,
    summary: `Iteration ${input.fullHarness.iteration.iteration}: decision=${input.fullHarness.iteration.decision} finalDecision=${input.fullHarness.finalDecision} weightedTotal=${input.fullHarness.iteration.weightedTotal.toFixed(3)} limitations=${input.fullHarness.iteration.limitations.length}`,
    evidenceRefs: [
      ...input.fullHarness.iteration.evidenceRefs.render,
      ...input.fullHarness.iteration.evidenceRefs.browserQa,
      ...input.fullHarness.iteration.evidenceRefs.runtimeGate,
      ...input.fullHarness.iteration.evidenceRefs.uiObservation,
      ...input.fullHarness.iteration.evidenceRefs.specCoverage,
      ...input.fullHarness.iteration.evidenceRefs.discussion,
      ...input.fullHarness.iteration.evidenceRefs.screenContract,
      ...input.fullHarness.iteration.evidenceRefs.trend,
    ],
  };
  return [...previousLogs, currentLog];
}

async function writeEvidenceBundlesOrThrow(input: Parameters<typeof writeEvidenceBundles>[0]) {
  try {
    return await writeEvidenceBundles(input);
  } catch (error) {
    throw new EvidenceWriteError(`Evidence bundle write failed. ${formatError(error)}`, {
      cause: error,
    });
  }
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
      declaredRef: string;
      url?: string;
      rendered: boolean;
      browserVisited: boolean;
      httpStatus?: number;
      renderEvidenceRefs: string[];
      browserQaEvidenceRefs: string[];
    }>;
    evidenceRefs: string[];
  };
}): Promise<PrototypingSummaryBundle> {
  const specsDir = path.join(input.root, ".qfai", "specs");
  const perSpecCoverage = await buildPerSpecCoverage(
    specsDir,
    runtimeGateToObservation(input.runtimeGate),
  );
  const perSpecMap = new Map(perSpecCoverage.map((spec) => [spec.specId, spec]));
  const specNames = await safeReadDir(specsDir);
  const specs = specNames
    .filter((name) => name.startsWith("spec-"))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => {
      const perSpec = perSpecMap.get(name);
      if (!perSpec) {
        throw new Error(
          `Spec coverage build failure: spec "${name}" exists but has no coverage data. ` +
            "All specs must have corresponding coverage results.",
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
        coverageRefs: perSpec.coverageRefs.map((coverage) => ({
          route: coverage.route,
          declaredRef: assertSpecDeclarationRef(
            coverage.declaredRef,
            `specs[${name}].coverageRefs[${coverage.route}].declaredRef`,
          ),
          observedRefs: [...coverage.observedRefs],
        })),
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
    ...(input.runtimeGate ? { runtimeGate: input.runtimeGate } : {}),
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
          declaredRef: string;
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

function normalizeBrowserQaEvidenceRef(ref: string): string {
  if (isBrowserQaPassthroughRef(ref)) {
    return ref.trim();
  }
  return normalizeConcreteArtifactRef(ref);
}

function normalizeRuntimeObservationRefs(
  root: string,
  runtimeObservation: RuntimeObservation,
): RuntimeObservation {
  return {
    ui: runtimeObservation.ui.map((entry) => ({
      ...entry,
      declaredRef: normalizeConcreteArtifactRef(entry.declaredRef),
      renderEvidenceRefs: dedupeRefs(
        entry.renderEvidenceRefs.map((ref) => toConcreteArtifactRef(root, ref)),
      ),
      browserQaEvidenceRefs: dedupeRefs(
        entry.browserQaEvidenceRefs.map((ref) => normalizeBrowserQaEvidenceRef(ref)),
      ),
    })),
  };
}

function dedupeRefs(refs: string[]): string[] {
  return Array.from(new Set(refs));
}

function normalizeUiObservationSummary(
  root: string,
  summary: Awaited<ReturnType<typeof buildUiObservationSummary>>,
): Awaited<ReturnType<typeof buildUiObservationSummary>> {
  return {
    ...summary,
    screens: summary.screens.map((screen) => ({
      ...screen,
      htmlCaptureRef: toConcreteArtifactRef(root, screen.htmlCaptureRef),
      browserQaEvidenceRefs: normalizeEvidenceRefList(root, screen.browserQaEvidenceRefs),
    })),
    evidenceRefs: normalizeEvidenceRefList(root, summary.evidenceRefs),
  };
}

function normalizeEvidenceRefList(root: string, refs: string[]): string[] {
  return dedupeRefs(refs.map((ref) => toConcreteArtifactRef(root, ref)));
}

function assertRuntimeGateLeafRefs(
  runtimeGate: NonNullable<PrototypingSummaryBundle["runtimeGate"]>,
): void {
  for (const entry of runtimeGate.ui) {
    if (!isCanonicalScreenContractRef(entry.declaredRef)) {
      throw new Error(
        `runtimeGate.ui[${entry.screenId}].declaredRef must use the canonical screen contract sourceRef.`,
      );
    }
    assertConcreteArtifactRefs(
      `runtimeGate.ui[${entry.screenId}].renderEvidenceRefs`,
      entry.renderEvidenceRefs,
    );
    assertBrowserQaEvidenceRefs(
      `runtimeGate.ui[${entry.screenId}].browserQaEvidenceRefs`,
      entry.browserQaEvidenceRefs,
    );
  }
}

function assertSpecDeclarationRef(ref: string, fieldPath: string): string {
  if (!isSpecDeclarationRef(ref)) {
    throw new Error(`${fieldPath} must point to a spec declaration ref under .qfai/specs/.`);
  }
  return ref;
}

function assertFullHarnessLeafRefs(iterations: FullHarnessIteration[], label: string): void {
  for (const iteration of iterations) {
    const categories = [
      "runtimeGate",
      "specCoverage",
      "render",
      "browserQa",
      "uiObservation",
      "discussion",
      "screenContract",
      "trend",
    ] as const;
    for (const category of categories) {
      assertConcreteArtifactRefs(
        `${label}[${iteration.iteration}].evidenceRefs.${category}`,
        iteration.evidenceRefs[category],
      );
    }
    for (const ref of iteration.evidenceRefs.screenContract) {
      if (!isCanonicalScreenContractRef(ref)) {
        throw new Error(
          `${label}[${iteration.iteration}].evidenceRefs.screenContract must use canonical screen contract refs.`,
        );
      }
    }
    for (const axis of iteration.l1.axes) {
      assertConcreteArtifactRefs(
        `${label}[${iteration.iteration}].l1.axes[${axis.axisId}].evidenceRefs`,
        axis.evidenceRefs,
      );
    }
    for (const axis of iteration.l2.axes) {
      assertConcreteArtifactRefs(
        `${label}[${iteration.iteration}].l2.axes[${axis.axisId}].evidenceRefs`,
        axis.evidenceRefs,
      );
    }
  }
}

function collectBrowserQaEvidenceRefs(
  browserQaResult: Awaited<ReturnType<typeof runBrowserQaPerScreen>>,
): string[] {
  const refs = new Set<string>();
  for (const phase of browserQaResult.phases) {
    for (const ref of phase.evidence_refs) {
      refs.add(ref);
    }
    for (const finding of phase.findings) {
      for (const ref of finding.evidence_refs) {
        refs.add(ref);
      }
    }
  }
  return [...refs];
}

function buildUiFidelityEvidenceMessage(input: {
  status: string;
  reason?: string;
  missingRequiredEvidence: string[];
  missingScreens: Array<{ screenId: string; route: string }>;
}): string {
  const parts = [`UI fidelity evidence is insufficient (status=${input.status}).`];
  if (input.reason) {
    parts.push(input.reason);
  }
  if (input.missingRequiredEvidence.length > 0) {
    parts.push(`missingRequiredEvidence=${input.missingRequiredEvidence.join(", ")}`);
  }
  if (input.missingScreens.length > 0) {
    parts.push(
      `missingScreens=${input.missingScreens.map((screen) => `${screen.screenId}:${screen.route}`).join(", ")}`,
    );
  }
  return parts.join(" ");
}

function assertReviewerIsNotPlaceholder(reviewer: string): void {
  const normalizedReviewer = reviewer.toLowerCase().trim();
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
      `Reviewer identifier "${reviewer}" is a placeholder. ` +
        "Provide a real reviewer identity for full-harness mode.",
    );
  }
}

function toRelativeSummaryPath(root: string, candidate: string): string {
  const relative = path.isAbsolute(candidate) ? path.relative(root, candidate) : candidate;
  return relative.replaceAll("\\", "/");
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
