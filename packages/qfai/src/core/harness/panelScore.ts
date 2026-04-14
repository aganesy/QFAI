/**
 * Panel scoring — v1.7.15
 *
 * L1 = implementation fidelity panel (runtime gate, render, browser QA blocking, screen contract, spec coverage)
 * L2 = product experience panel (discussion axes, screen contract fidelity, trend, visual, browser QA experience)
 * weightedTotal = min(L1.total, L2.total)
 *
 * Scores are computed from real evidence inputs only.
 * Pre-scored metadata.dimensionScores flow-through is prohibited.
 */

import type { FullHarnessPanelScore } from "./types.js";
import type { Decision } from "../calibration/types.js";
import type { FullHarnessPanelInputs } from "./panelInputs.js";
import { assertConcreteArtifactRef } from "../prototyping/pathUtils.js";

export function scoreL1(inputs: FullHarnessPanelInputs): FullHarnessPanelScore {
  const axes: FullHarnessPanelScore["axes"] = [];

  // Runtime gate score
  const rg = inputs.runtimeGate;
  const totalRgChecks = rg.uiRoutes.length;
  const rgOk = rg.uiRoutes.filter(
    (r) =>
      r.browserVisited ||
      r.rendered ||
      (r.httpStatus !== undefined && r.httpStatus >= 200 && r.httpStatus < 400),
  ).length;
  const rgScore = totalRgChecks > 0 ? rgOk / totalRgChecks : 0;
  axes.push({
    axisId: "runtime-gate",
    score: rgScore,
    rationale: `${rgOk}/${totalRgChecks} runtime gate checks passed`,
    evidenceRefs: rg.evidenceRefs,
  });

  // Render coverage score
  const re = inputs.renderEvidence;
  const renderScore = re.totalScreens > 0 ? re.capturedScreens / re.totalScreens : 0;
  axes.push({
    axisId: "render-coverage",
    score: renderScore,
    rationale: `${re.capturedScreens}/${re.totalScreens} screens captured`,
    evidenceRefs: re.evidenceRefs,
  });

  // Browser QA blocking findings
  const bqa = inputs.browserQa;
  const blockingScore =
    bqa.blockingFindings === 0 ? 1.0 : Math.max(0, 1.0 - bqa.blockingFindings * 0.2);
  axes.push({
    axisId: "browser-qa-blocking",
    score: blockingScore,
    rationale: `${bqa.blockingFindings} blocking findings`,
    evidenceRefs: bqa.evidenceRefs,
  });

  // Screen contract coverage
  const sc = inputs.screenContract;
  const scScore = sc.totalContracts > 0 ? sc.coveredContracts / sc.totalContracts : 0;
  axes.push({
    axisId: "screen-contract-coverage",
    score: scScore,
    rationale: `${sc.coveredContracts}/${sc.totalContracts} contracts covered`,
    evidenceRefs: sc.evidenceRefs,
  });

  // Spec coverage
  const spc = inputs.specCoverage;
  const totalDeclared = spc.declared.uiRoutes;
  const totalChecked = spc.checked.uiOk;
  const spcScore = totalDeclared > 0 ? totalChecked / totalDeclared : 0;
  axes.push({
    axisId: "spec-coverage",
    score: spcScore,
    rationale: `${totalChecked}/${totalDeclared} spec artifacts checked`,
    evidenceRefs: spc.evidenceRefs,
  });

  const total = axes.length > 0 ? axes.reduce((sum, a) => sum + a.score, 0) / axes.length : 0;

  return { panel: "L1", total: clamp01(total), axes };
}

export function scoreL2(inputs: FullHarnessPanelInputs): FullHarnessPanelScore {
  const axes: FullHarnessPanelScore["axes"] = [];
  const degradedScoring =
    inputs.discussionAxes.degradedScoring === true ||
    inputs.screenContract.degradedScoring === true ||
    inputs.trendAlignment.degradedScoring === true;

  // Discussion 3-layer axes
  const da = inputs.discussionAxes;
  const totalAxes = da.invariantAxes + da.trendDerivedAxes + da.productSpecificAxes;
  const daScore = totalAxes > 0 ? da.aggregateScore : 0;
  axes.push({
    axisId: "discussion-axes",
    score: clamp01(daScore),
    rationale: `${totalAxes} axes evaluated, aggregate=${da.aggregateScore.toFixed(2)}`,
    evidenceRefs: da.evidenceRefs,
  });

  // Screen contract fidelity
  const sc = inputs.screenContract;
  axes.push({
    axisId: "screen-contract-fidelity",
    score: clamp01(sc.fidelityScore),
    rationale: `fidelity=${sc.fidelityScore.toFixed(2)} across ${sc.totalContracts} contracts`,
    evidenceRefs: sc.evidenceRefs,
  });

  // Trend/competitive translation consistency
  const ta = inputs.trendAlignment;
  const taScore =
    ta.trendSourcesChecked > 0
      ? (ta.translationConsistency + (ta.competitiveGapsCovered > 0 ? 0.5 : 0)) / 1.5
      : 0;
  axes.push({
    axisId: "trend-alignment",
    score: clamp01(taScore),
    rationale: `${ta.trendSourcesChecked} sources, consistency=${ta.translationConsistency.toFixed(2)}`,
    evidenceRefs: ta.evidenceRefs,
  });

  // Visual findings
  const bqa = inputs.browserQa;
  const visualScore = bqa.visualFindings === 0 ? 1.0 : Math.max(0, 1.0 - bqa.visualFindings * 0.15);
  axes.push({
    axisId: "visual-findings",
    score: clamp01(visualScore),
    rationale: `${bqa.visualFindings} visual findings`,
    evidenceRefs: bqa.evidenceRefs,
  });

  // Browser QA experience findings
  const expScore =
    bqa.experienceFindings === 0 ? 1.0 : Math.max(0, 1.0 - bqa.experienceFindings * 0.1);
  axes.push({
    axisId: "browser-qa-experience",
    score: clamp01(expScore),
    rationale: `${bqa.experienceFindings} experience findings`,
    evidenceRefs: bqa.evidenceRefs,
  });

  const total = axes.length > 0 ? axes.reduce((sum, a) => sum + a.score, 0) / axes.length : 0;

  return {
    panel: "L2",
    total: clamp01(total),
    ...(degradedScoring ? { degradedScoring: true } : {}),
    axes,
  };
}

export function computeWeightedTotal(l1: FullHarnessPanelScore, l2: FullHarnessPanelScore): number {
  return Math.min(l1.total, l2.total);
}

export function scorePanelsFromInputs(inputs: FullHarnessPanelInputs): {
  l1: FullHarnessPanelScore;
  l2: FullHarnessPanelScore;
  weightedTotal: number;
} {
  // REQ-0067: panelScore double defense — reject bad inputs even if upstream missed them
  validateScoringPreconditions(inputs);

  const l1 = scoreL1(inputs);
  const l2 = scoreL2(inputs);
  return { l1, l2, weightedTotal: computeWeightedTotal(l1, l2) };
}

/**
 * REQ-0067: Double defense precondition checks.
 * These duplicate upstream guards in l2Evidence/panelInputs to ensure
 * panelScore never silently produces scores from invalid inputs.
 */
function validateScoringPreconditions(inputs: FullHarnessPanelInputs): void {
  // aggregateScore must be 0-1
  if (inputs.discussionAxes.aggregateScore < 0 || inputs.discussionAxes.aggregateScore > 1) {
    throw new Error(
      `panelScore: aggregateScore must be 0-1, got ${inputs.discussionAxes.aggregateScore}`,
    );
  }

  // trendSourcesChecked === 0 is a scoring precondition failure
  if (inputs.trendAlignment.trendSourcesChecked === 0) {
    throw new Error("panelScore: trend sources required (trendSourcesChecked === 0)");
  }

  // fidelityScore === 0 with contracts > 0 is a scoring precondition failure
  if (inputs.screenContract.totalContracts > 0 && inputs.screenContract.fidelityScore === 0) {
    throw new Error(
      "panelScore: fidelity score required when contracts exist (fidelityScore === 0 with totalContracts > 0)",
    );
  }
}

export function determineDecision(
  weightedTotal: number,
  thresholds: { accept: number; refine: number },
): Decision {
  if (weightedTotal >= thresholds.accept) return "accept";
  if (weightedTotal >= thresholds.refine) return "refine";
  return "reject";
}

/**
 * rev11 strictness:
 * - axes length >= 1 (empty axes are rejected).
 * - per-axis: score range, rationale non-empty, evidenceRefs non-empty and
 *   every ref must be a concrete artifact ref under `.qfai/`.
 *
 * Validation order (per axis): score -> rationale -> evidenceRefs.
 * Errors accumulate; a non-empty result means the panel MUST NOT be used.
 */
export function validatePanelScore(panel: FullHarnessPanelScore): string[] {
  const errors: string[] = [];
  if (typeof panel.total !== "number" || panel.total < 0 || panel.total > 1) {
    errors.push(`Panel ${panel.panel} total must be between 0 and 1, got ${panel.total}`);
  }
  if (panel.axes.length === 0) {
    errors.push(`Panel ${panel.panel} must have at least one axis`);
  }
  for (const axis of panel.axes) {
    const axisLabel = `Panel ${panel.panel} axis ${axis.axisId}`;
    if (typeof axis.score !== "number" || axis.score < 0 || axis.score > 1) {
      errors.push(`${axisLabel} score must be between 0 and 1`);
    }
    if (!axis.rationale || axis.rationale.trim().length === 0) {
      errors.push(`${axisLabel} must have a non-empty rationale`);
    }
    if (!Array.isArray(axis.evidenceRefs) || axis.evidenceRefs.length === 0) {
      errors.push(`${axisLabel} must have at least one evidenceRef`);
    } else {
      for (const ref of axis.evidenceRefs) {
        if (typeof ref !== "string" || ref.trim().length === 0) {
          errors.push(`${axisLabel} evidenceRef must be a non-empty string`);
          continue;
        }
        try {
          assertConcreteArtifactRef(ref);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          errors.push(`${axisLabel} evidenceRef is not a concrete artifact ref: ${reason}`);
        }
      }
    }
  }
  return errors;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
