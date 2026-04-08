/**
 * Panel scoring — v1.7.15
 *
 * L1 = implementation fidelity panel
 * L2 = product experience panel
 * weightedTotal = min(L1.total, L2.total)
 */

import type { FullHarnessPanelScore } from "./types.js";
import type { Decision } from "../calibration/types.js";

export function computeWeightedTotal(l1: FullHarnessPanelScore, l2: FullHarnessPanelScore): number {
  return Math.min(l1.total, l2.total);
}

export function determineDecision(
  weightedTotal: number,
  thresholds: { accept: number; refine: number },
): Decision {
  if (weightedTotal >= thresholds.accept) return "accept";
  if (weightedTotal >= thresholds.refine) return "refine";
  return "pivot";
}

export function validatePanelScore(panel: FullHarnessPanelScore): string[] {
  const errors: string[] = [];
  if (typeof panel.total !== "number" || panel.total < 0 || panel.total > 1) {
    errors.push(`Panel ${panel.panel} total must be between 0 and 1, got ${panel.total}`);
  }
  for (const axis of panel.axes) {
    if (typeof axis.score !== "number" || axis.score < 0 || axis.score > 1) {
      errors.push(`Axis ${axis.axisId} score must be between 0 and 1`);
    }
    if (!axis.rationale || axis.rationale.trim().length === 0) {
      errors.push(`Axis ${axis.axisId} must have a non-empty rationale`);
    }
  }
  return errors;
}
