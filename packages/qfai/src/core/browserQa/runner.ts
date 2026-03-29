/**
 * Browser QA orchestrator.
 *
 * Dispatches to sub-phase runners via provider. Each phase is independently
 * skippable based on provider capabilities and expectation tier.
 */

import type { ProviderRegistry } from "../providers/index.js";
import type { ProviderCapability } from "../providers/types.js";
import {
  BROWSER_QA_PHASES,
  type BrowserQaConfig,
  type BrowserQaPhase,
  type BrowserQaPhaseResult,
  type BrowserQaResult,
} from "./types.js";

const PHASE_REQUIRED_CAPABILITIES: Record<BrowserQaPhase, ProviderCapability[]> = {
  smoke: ["screenshot"],
  interaction: ["interaction"],
  visual: ["visual"],
  accessibility: ["accessibility"],
};

const TIER_PHASES: Record<string, BrowserQaPhase[]> = {
  standard: ["smoke"],
  "low-cost": ["smoke", "interaction"],
  "full-harness": ["smoke", "interaction", "visual", "accessibility"],
};

export function runBrowserQa(
  registry: ProviderRegistry,
  providerName: string,
  config: BrowserQaConfig,
): Promise<BrowserQaResult> {
  return Promise.resolve(runBrowserQaSync(registry, providerName, config));
}

function runBrowserQaSync(
  registry: ProviderRegistry,
  providerName: string,
  config: BrowserQaConfig,
): BrowserQaResult {
  const lookup = registry.getOrSkip(providerName);
  const activePhasesForTier = TIER_PHASES[config.tier] ?? BROWSER_QA_PHASES;

  if (lookup.status === "skipped") {
    return {
      phases: BROWSER_QA_PHASES.map((phase) => ({
        phase,
        status: "skipped" as const,
        findings: [],
      })),
    };
  }

  const provider = lookup.provider;
  const phases: BrowserQaPhaseResult[] = [];

  for (const phase of BROWSER_QA_PHASES) {
    if (!activePhasesForTier.includes(phase)) {
      phases.push({ phase, status: "skipped", findings: [] });
      continue;
    }

    const requiredCaps = PHASE_REQUIRED_CAPABILITIES[phase];
    const hasAllCaps = requiredCaps.every((cap) => provider.capabilities.includes(cap));

    if (!hasAllCaps) {
      phases.push({ phase, status: "skipped", findings: [] });
      continue;
    }

    // Phase executes — for now, no actual findings are produced (provider abstraction only)
    phases.push({ phase, status: "executed", findings: [] });
  }

  return { phases };
}
