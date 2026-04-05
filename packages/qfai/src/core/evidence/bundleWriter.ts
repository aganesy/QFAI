import { mkdir } from "node:fs/promises";
import path from "node:path";

import { writeEvidenceFile } from "./fsEvidenceWriter.js";
import type { RenderRunnerResult } from "./types.js";
import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { PrototypingMode, PrototypingSurface } from "../prototyping/types.js";

export type PrototypingSummaryBundle = {
  surface: PrototypingSurface;
  specs: Array<{
    specId: string;
    declared: { uiRoutes: number; apiEndpoints: number; dbObjects: number };
    checked: { uiOk: number; apiNon404: number; dbPresent: number };
    missing: { uiRoutes: string[]; apiEndpoints: string[]; dbObjects: string[] };
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
    status: "completed" | "failed" | "n/a";
    reason?: string;
  };
  missingRequiredEvidence?: string[];
  runtimeGate?: {
    ui: Array<{ route: string; status: number }>;
    api: Array<{ method: string; path: string; status: number }>;
  };
  uiFidelity?: {
    mode: "interactive" | "skeleton";
    screens: Array<unknown>;
  };
  fullHarness?: {
    enabled: true;
    available: boolean;
    runId: string;
    iterationCount: number;
    bestIteration: number;
    terminationReason: string;
    reviewerSignoff: {
      status: string;
      reviewer: string;
      timestamp: string;
    };
    scoringTrace: Array<{ iteration: number; weightedTotal: number; decision: string }>;
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

function buildBrowserQaBundle(
  result: BrowserQaRunResult,
  mode: PrototypingMode,
): Record<string, unknown> {
  const summary: Record<string, { passed: number; failed: number }> = {};
  let executed = false;
  const findings: Array<Record<string, unknown>> = [];
  for (const phase of result.phases) {
    summary[phase.phase] = {
      passed: phase.status === "executed" ? 1 : 0,
      failed: phase.status === "failed" ? 1 : 0,
    };
    if (phase.status === "executed") {
      executed = true;
    }
    for (const finding of phase.findings) {
      findings.push({
        category: phase.phase,
        severity: finding.severity,
        message: finding.message,
        ...(finding.route ? { route: finding.route } : {}),
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
