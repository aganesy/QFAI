/**
 * Browser QA runner — WS-B
 *
 * Orchestrates the canonical 4-phase Browser QA execution model.
 * Provider resolution → phase execution → truthful skip/fail handling.
 */

import { isUiBearingSurfaceType } from "../detection/surfaceType.js";
import { runSmokePhase } from "./phases/smoke.js";
import { runInteractionPhase } from "./phases/interaction.js";
import { runVisualPhase } from "./phases/visual.js";
import { runAccessibilityPhase } from "./phases/accessibility.js";
import type {
  BrowserQaInput,
  BrowserQaPhaseResult,
  BrowserQaProvider,
  BrowserQaRunResult,
  BrowserQaSummary,
  BrowserQaPhase,
} from "./types.js";
import { BROWSER_QA_PHASES } from "./types.js";

/**
 * Run the canonical 4-phase Browser QA.
 *
 * - provider resolved → delegate to provider methods
 * - no provider → use built-in static analysis phases
 * - non-ui surface → all phases skipped
 */
export async function runBrowserQaOrchestrated(
  input: BrowserQaInput,
  provider?: BrowserQaProvider,
): Promise<BrowserQaRunResult> {
  const timestamp = new Date().toISOString();

  // Non-UI surface → skip all phases
  if (!isUiBearingSurfaceType(input.surface)) {
    return {
      phases: BROWSER_QA_PHASES.map((phase) => ({
        phase,
        status: "skipped" as const,
        findings: [],
        skippedReason: `non-ui surface '${input.surface}' — Browser QA not applicable`,
      })),
      provider: "none",
      timestamp,
    };
  }

  // Provider registered but cannot run for this surface
  if (provider && !provider.canRun(input.surface)) {
    return {
      phases: BROWSER_QA_PHASES.map((phase) => ({
        phase,
        status: "skipped" as const,
        findings: [],
        skippedReason: `provider '${provider.providerId}' cannot run on surface '${input.surface}'`,
      })),
      provider: provider.providerId,
      timestamp,
    };
  }

  // No provider → use built-in static analysis
  if (!provider) {
    return runBuiltinPhases(input, timestamp);
  }

  // Provider registered → delegate
  return runProviderPhases(input, provider, timestamp);
}

async function runBuiltinPhases(
  input: BrowserQaInput,
  timestamp: string,
): Promise<BrowserQaRunResult> {
  const phases: BrowserQaPhaseResult[] = [];

  // smoke
  const smoke = await runSmokePhase(input);
  phases.push(smoke);

  // If smoke hard-fails, skip remaining
  if (smoke.status === "failed") {
    for (const phase of ["interaction", "visual", "accessibility"] as const) {
      phases.push({
        phase,
        status: "skipped",
        findings: [],
        skippedReason: "smoke phase failed — subsequent phases skipped",
      });
    }
    return { phases, provider: "qfai-builtin", timestamp };
  }

  // interaction
  phases.push(await runInteractionPhase(input));

  // visual
  phases.push(await runVisualPhase(input));

  // accessibility
  phases.push(await runAccessibilityPhase(input));

  return { phases, provider: "qfai-builtin", timestamp };
}

async function runProviderPhases(
  input: BrowserQaInput,
  provider: BrowserQaProvider,
  timestamp: string,
): Promise<BrowserQaRunResult> {
  const phases: BrowserQaPhaseResult[] = [];

  const phaseMethods: Array<{
    phase: BrowserQaPhase;
    run: (i: BrowserQaInput) => Promise<BrowserQaPhaseResult>;
  }> = [
    { phase: "smoke", run: (i) => provider.runSmoke(i) },
    { phase: "interaction", run: (i) => provider.runInteraction(i) },
    { phase: "visual", run: (i) => provider.runVisual(i) },
    { phase: "accessibility", run: (i) => provider.runAccessibility(i) },
  ];

  let previousFailed = false;
  for (const { phase, run } of phaseMethods) {
    if (previousFailed) {
      phases.push({
        phase,
        status: "skipped",
        findings: [],
        skippedReason: "previous phase failed — subsequent phases skipped",
      });
      continue;
    }

    try {
      const result = await run(input);
      phases.push({ ...result, phase });
      if (result.status === "failed") {
        previousFailed = true;
      }
    } catch (error) {
      phases.push({
        phase,
        status: "failed",
        findings: [],
        skippedReason: `phase execution error: ${error instanceof Error ? error.message : String(error)}`,
      });
      previousFailed = true;
    }
  }

  return { phases, provider: provider.providerId, timestamp };
}

/**
 * Summarize a BrowserQaRunResult for report output.
 */
export function summarizeBrowserQaResult(result: BrowserQaRunResult): BrowserQaSummary {
  const phaseMap = {} as Record<BrowserQaPhase, { status: string; findingsCount: number }>;
  let totalFindings = 0;
  const skippedReasons: string[] = [];

  for (const phaseResult of result.phases) {
    phaseMap[phaseResult.phase] = {
      status: phaseResult.status,
      findingsCount: phaseResult.findings.length,
    };
    totalFindings += phaseResult.findings.length;
    if (phaseResult.status === "skipped" && phaseResult.skippedReason) {
      skippedReasons.push(`${phaseResult.phase}: ${phaseResult.skippedReason}`);
    }
  }

  return {
    providerId: result.provider,
    phases: phaseMap as BrowserQaSummary["phases"],
    totalFindings,
    skippedReasons,
  };
}
