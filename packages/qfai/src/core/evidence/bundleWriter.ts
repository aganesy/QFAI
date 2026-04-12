import { mkdir } from "node:fs/promises";
import path from "node:path";

import { writeEvidenceFile } from "./fsEvidenceWriter.js";
import type { RenderRunnerResult } from "./types.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { BrowserQaBundle } from "../browserQa/index.js";
import type { PrototypingMode, PrototypingSurface } from "../prototyping/types.js";
import type { FakeUiDetectionResult } from "../harness/fakeUiDetection.js";
import type { FullHarnessHandoff } from "../harness/handoff.js";
import type { FullHarnessExitReason } from "../harness/exitReason.js";
import type {
  FullHarnessIteration,
  FullHarnessCalibrationRef,
  TerminationReason,
  FinalDecision,
  ReviewerLogVerdict,
  ReviewerSignoffStatus,
} from "../harness/types.js";

export type PrototypingSummaryBundle = {
  surface: PrototypingSurface;
  specs: Array<{
    specId: string;
    declared: { uiRoutes: number; apiEndpoints: number; dbObjects: number };
    checked: { uiOk: number; apiNon404: number; dbPresent: number };
    missing: { uiRoutes: string[]; apiEndpoints: string[]; dbObjects: string[] };
    coverageRefs?: Array<{
      route: string;
      declaredRef: string;
      observedRefs: string[];
    }>;
  }>;
  mode: {
    requested?: PrototypingMode;
    effective: PrototypingMode;
    source: string;
    rationale: string;
  };
  meta: {
    generatedAt: string;
    toolVersion: string;
    commands: string[];
    generatedBy: string;
    providerIds: string[];
    targetUrl?: string;
  };
  uiFidelityStatus?: {
    required: boolean;
    status: "completed" | "failed" | "insufficient-evidence" | "n/a";
    reason?: string;
  };
  missingRequiredEvidence?: string[];
  runtimeGate?: {
    ui: Array<{
      screenId: string;
      route: string;
      declaredRef?: string;
      url?: string;
      rendered: boolean;
      browserVisited: boolean;
      httpStatus?: number;
      renderEvidenceRefs: string[];
      browserQaEvidenceRefs: string[];
    }>;
    evidenceRefs: string[];
  };
  uiFidelity?: {
    mode: "interactive" | "skeleton";
    screens: Array<unknown>;
  };
  fullHarness?: {
    enabled: true;
    runId: string;
    calibrationRef: FullHarnessCalibrationRef;
    iterationCount: number;
    bestIteration: number;
    status: "in-progress" | "completed";
    terminationReason?: TerminationReason;
    finalDecision: FinalDecision;
    reviewerSignoff: {
      reviewerId: string;
      status: ReviewerSignoffStatus;
      timestamp: string;
      source: "cli";
    };
    reviewerLogs: Array<{
      iteration: number;
      reviewerId: string;
      verdict: ReviewerLogVerdict;
      summary: string;
      evidenceRefs: string[];
    }>;
    iterations: FullHarnessIteration[];
    scoringTrace: Array<{
      iteration: number;
      l1Total: number;
      l2Total: number;
      weightedTotal: number;
      deltaFromPrevious: number | null;
      decision: "accept" | "refine" | "reject";
      commitSha: string;
    }>;
    limitations: string[];
  };
};

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

export async function writeEvidenceBundles(input: {
  root: string;
  render?: {
    result: RenderRunnerResult;
    surface: PrototypingSurface;
    mode: PrototypingMode;
    generatedAt: string;
  };
  browserQa?: { result: BrowserQaRunResult; mode: PrototypingMode };
  prototyping: PrototypingSummaryBundle;
  fullHarnessArtifacts?: {
    fakeUiDetection: FakeUiDetectionResult;
    handoff: FullHarnessHandoff;
    exitReason: FullHarnessExitReason;
  };
}): Promise<{
  prototypingPath: string;
  renderPath: string;
  browserQaPath: string;
}> {
  const evidenceRoot = path.join(input.root, ".qfai", "evidence");
  const renderAssetRoot = path.join(evidenceRoot, "render");
  await mkdir(renderAssetRoot, { recursive: true });

  const prototypingPath = path.join(evidenceRoot, "prototyping.json");
  const renderPath = path.join(evidenceRoot, "render.json");
  const browserQaPath = path.join(evidenceRoot, "browser-qa.json");
  const browserQaSummaryPath = path.join(evidenceRoot, "browserQa.summary.json");
  const browserQaFindingsPath = path.join(evidenceRoot, "browserQa.findings.json");
  const browserQaRepairsPath = path.join(evidenceRoot, "browserQa.repairs.json");

  const renderBundle =
    input.render === undefined
      ? {
          renderEvidence: {
            status: "skipped",
            requested: false,
            skippedReason: "render execution not requested",
            outputPath: ".qfai/evidence/render.json",
          },
          screens: [],
        }
      : buildRenderBundle(input.root, input.render);

  const browserQaBundle =
    input.browserQa === undefined
      ? {
          browserQa: {
            executed: false,
            status: "skipped",
            summary: undefined,
          },
          findings: [],
          repairs: [],
        }
      : buildBrowserQaBundle(input.browserQa.result, input.browserQa.mode);

  await Promise.all([
    writeEvidenceFile(prototypingPath, JSON.stringify(input.prototyping, null, 2)),
    writeEvidenceFile(
      path.join(evidenceRoot, "prototyping.md"),
      buildPrototypingMarkdown(input.prototyping),
    ),
    writeEvidenceFile(renderPath, JSON.stringify(renderBundle, null, 2)),
    writeEvidenceFile(browserQaPath, JSON.stringify(browserQaBundle, null, 2)),
    writeEvidenceFile(
      browserQaSummaryPath,
      JSON.stringify(browserQaBundle.browserQa.summary ?? {}, null, 2),
    ),
    writeEvidenceFile(
      browserQaFindingsPath,
      JSON.stringify(browserQaBundle.findings ?? [], null, 2),
    ),
    writeEvidenceFile(browserQaRepairsPath, JSON.stringify(browserQaBundle.repairs ?? [], null, 2)),
    ...(input.fullHarnessArtifacts
      ? [
          writeEvidenceFile(
            path.join(evidenceRoot, "fullHarness.fakeUiDetection.json"),
            JSON.stringify(input.fullHarnessArtifacts.fakeUiDetection, null, 2),
          ),
          writeEvidenceFile(
            path.join(evidenceRoot, "fullHarness.handoff.json"),
            JSON.stringify(input.fullHarnessArtifacts.handoff, null, 2),
          ),
          writeEvidenceFile(
            path.join(evidenceRoot, "fullHarness.exit.json"),
            JSON.stringify({ exit_reason: input.fullHarnessArtifacts.exitReason }, null, 2),
          ),
        ]
      : []),
  ]);

  return { prototypingPath, renderPath, browserQaPath };
}

function buildRenderBundle(
  root: string,
  input: {
    result: RenderRunnerResult;
    surface: PrototypingSurface;
    mode: PrototypingMode;
    generatedAt: string;
  },
): Record<string, unknown> {
  const screens = input.result.entries.map((entry) => ({
    route: entry.target,
    viewport: entry.viewport,
    status: entry.status,
    width: 1440,
    height: 900,
    ...(entry.screenshot_path ? { imagePath: toPosixRelative(root, entry.screenshot_path) } : {}),
    ...(entry.html_path ? { htmlPath: toPosixRelative(root, entry.html_path) } : {}),
    ...(entry.reason
      ? entry.status === "failed"
        ? { error: entry.reason }
        : { skippedReason: entry.reason }
      : {}),
  }));
  const topStatus = screens.some((screen) => screen.status === "captured")
    ? "captured"
    : screens.some((screen) => screen.status === "failed")
      ? "failed"
      : "skipped";

  return {
    renderEvidence: {
      status: topStatus,
      requested: true,
      ...(topStatus === "skipped" ? { skippedReason: "render adapter not available" } : {}),
      ...(topStatus === "failed" ? { error: "render capture failed" } : {}),
      viewports: Array.from(new Set(input.result.entries.map((entry) => entry.viewport))),
      outputPath: ".qfai/evidence/render.json",
      surface: input.surface,
      mode: input.mode,
      generatedAt: input.generatedAt,
      coverageSummary: {
        total: input.result.entries.length,
        captured: input.result.entries.filter((entry) => entry.status === "captured").length,
      },
    },
    screens,
  };
}

function buildBrowserQaBundle(result: BrowserQaRunResult, mode: PrototypingMode): BrowserQaBundle {
  const summary: NonNullable<BrowserQaBundle["browserQa"]["summary"]> = {
    smoke: { status: "skipped", findingsCount: 0, checksCount: 0, passed: 0, failed: 0 },
    interaction: { status: "skipped", findingsCount: 0, checksCount: 0, passed: 0, failed: 0 },
    visual: { status: "skipped", findingsCount: 0, checksCount: 0, passed: 0, failed: 0 },
    accessibility: { status: "skipped", findingsCount: 0, checksCount: 0, passed: 0, failed: 0 },
  };
  let executed = false;
  const findings: NonNullable<BrowserQaBundle["findings"]> = [];
  const repairs = new Set<string>();
  for (const phase of result.phases) {
    summary[phase.phase] = {
      status: phase.status,
      findingsCount: phase.findings.length,
      checksCount: phase.checks_performed.length,
      passed: phase.status === "executed" || phase.status === "passed" ? 1 : 0,
      failed: phase.status === "failed" ? 1 : 0,
    };
    if (phase.status === "executed" || phase.status === "passed") {
      executed = true;
    }
    phase.repair_suggestions.forEach((repair) => repairs.add(repair));
    for (const finding of phase.findings) {
      findings.push({
        category: phase.phase,
        phase: phase.phase,
        severity: finding.severity,
        summary: finding.summary,
        detail: finding.detail,
        message: finding.message ?? finding.summary,
        ...(finding.route ? { route: finding.route } : {}),
        ...(finding.screen_id ? { screen_id: finding.screen_id } : {}),
        ...(finding.selector ? { selector: finding.selector } : {}),
        evidence_refs: finding.evidence_refs,
        repair_suggestions: finding.repair_suggestions,
      });
    }
  }

  return {
    browserQa: {
      executed,
      status: executed ? "completed" : "skipped",
      mode,
      summary,
    },
    findings,
    repairs: Array.from(repairs),
  };
}

function buildPrototypingMarkdown(bundle: PrototypingSummaryBundle): string {
  return [
    "# Prototyping Evidence",
    "",
    `- generatedAt: ${bundle.meta.generatedAt}`,
    `- generatedBy: ${bundle.meta.generatedBy}`,
    `- surface: ${bundle.surface}`,
    `- mode: ${bundle.mode.effective}`,
    `- uiFidelityStatus: ${bundle.uiFidelityStatus?.status ?? "n/a"}`,
  ].join("\n");
}
