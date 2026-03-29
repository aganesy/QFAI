/**
 * Browser QA orchestrator — foundation-only (v1.7.5).
 *
 * Gates phases by provider capabilities and expectation tier.
 * Actual phase execution logic (sub-phase runners) is deferred to v1.7.6;
 * executed phases currently return empty findings.
 */

import type { ProviderRegistry } from "../providers/index.js";
import type { ProviderCapability } from "../providers/types.js";
import {
  BROWSER_QA_PHASES,
  type BrowserQaConfig,
  type BrowserQaPhase,
  type BrowserQaPhaseResult,
  type BrowserQaResult,
  type ExpectationTier,
} from "./types.js";

const PHASE_REQUIRED_CAPABILITIES: Record<BrowserQaPhase, ProviderCapability[]> = {
  smoke: ["screenshot"],
  interaction: ["interaction"],
  visual: ["visual"],
  accessibility: ["accessibility"],
};

const TIER_PHASES: Record<ExpectationTier, readonly BrowserQaPhase[]> = {
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
  const activePhasesForTier = TIER_PHASES[config.tier];

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

    // Foundation-only: phase gating is complete, actual phase execution deferred to v1.7.6
    phases.push({ phase, status: "executed", findings: [] });
  }

  return { phases };
}
