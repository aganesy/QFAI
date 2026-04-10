import { readFile } from "node:fs/promises";

import { runBrowserQaOrchestrated } from "../browserQa/runner.js";
import type { BrowserQaInput, BrowserQaProvider, BrowserQaRunResult } from "../browserQa/types.js";
import type { SurfaceType } from "../detection/surfaceType.js";
import type { RenderRunnerResult } from "../evidence/types.js";

import type { CanonicalScreenContract } from "./screenContracts.js";

export async function runBrowserQaPerScreen(input: {
  surface: SurfaceType;
  required: boolean;
  screenContracts: CanonicalScreenContract[];
  renderResult?: RenderRunnerResult;
  targetUrl?: string;
  provider?: BrowserQaProvider;
}): Promise<BrowserQaRunResult> {
  const allPhases: BrowserQaRunResult["phases"] = [];
  const providerId = input.provider?.providerId ?? "qfai-builtin";
  const timestamp = new Date().toISOString();

  for (const screen of input.screenContracts) {
    const screenInput = await buildBrowserQaInputForScreen({
      surface: input.surface,
      required: input.required,
      screen,
      ...(input.renderResult ? { renderResult: input.renderResult } : {}),
      ...(input.targetUrl ? { targetUrl: input.targetUrl } : {}),
    });
    const result = await runBrowserQaOrchestrated(screenInput, input.provider);
    for (const phase of result.phases) {
      allPhases.push({
        ...phase,
        findings: phase.findings.map((finding) => ({
          ...finding,
          route: finding.route ?? screen.route,
          screen_id: finding.screen_id ?? screen.screenId,
        })),
        evidence_refs: [...phase.evidence_refs],
      });
    }
  }

  return {
    phases: allPhases,
    provider: providerId,
    timestamp,
  };
}

async function buildBrowserQaInputForScreen(input: {
  surface: SurfaceType;
  required: boolean;
  screen: CanonicalScreenContract;
  renderResult?: RenderRunnerResult;
  targetUrl?: string;
}): Promise<BrowserQaInput> {
  const htmlPath = input.renderResult?.entries.find(
    (entry) =>
      entry.status === "captured" &&
      typeof entry.html_path === "string" &&
      (entry.target === input.screen.route || entry.target === input.screen.screenId),
  )?.html_path;
  const htmlContent = htmlPath ? await readFile(htmlPath, "utf-8") : undefined;

  return {
    surface: input.surface,
    required: input.required,
    routes: [input.screen.route],
    ...(htmlContent ? { htmlContent, executionSource: "html" as const } : {}),
    ...(!htmlContent && input.targetUrl
      ? {
          targetUrl: new URL(input.screen.route, ensureTrailingSlash(input.targetUrl)).toString(),
          executionSource: "url" as const,
        }
      : {}),
    ...(!htmlContent && !input.targetUrl ? { executionSource: "none" as const } : {}),
    screenContracts: [
      {
        screen_id: input.screen.screenId,
        route: input.screen.route,
        ...(input.screen.primaryTasks.length > 0
          ? { primary_tasks: [...input.screen.primaryTasks] }
          : {}),
      },
    ],
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
