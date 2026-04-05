import { isUiBearingSurfaceType } from "../detection/surfaceType.js";
import { runAccessibilityPhase } from "./phases/accessibility.js";
import { runInteractionPhase } from "./phases/interaction.js";
import { runSmokePhase } from "./phases/smoke.js";
import { runVisualPhase } from "./phases/visual.js";
import type {
  BrowserQaInput,
  BrowserQaPhase,
  BrowserQaPhaseResult,
  BrowserQaProvider,
  BrowserQaRunResult,
  BrowserQaSummary,
} from "./types.js";
import { BROWSER_QA_PHASES } from "./types.js";

function validatePhaseResult(
  phase: BrowserQaPhase,
  result: BrowserQaPhaseResult,
): BrowserQaPhaseResult {
  const checksPerformed = Array.isArray(result.checks_performed) ? result.checks_performed : [];
  const findings = Array.isArray(result.findings) ? result.findings : [];
  const repairSuggestions = Array.isArray(result.repair_suggestions)
    ? result.repair_suggestions
    : [];
  const evidenceRefs = Array.isArray(result.evidence_refs) ? result.evidence_refs : [];
  const normalizedChecks =
    checksPerformed.length > 0 ? checksPerformed : [`provider executed ${phase} checks`];
  const normalizedResult: BrowserQaPhaseResult = {
    phase,
    status: result.status,
    findings,
    repair_suggestions: repairSuggestions,
    evidence_refs: evidenceRefs,
    checks_performed: normalizedChecks,
    ...(result.skippedReason ? { skippedReason: result.skippedReason } : {}),
  };
  const hasEvidence =
    normalizedResult.findings.length > 0 || normalizedResult.checks_performed.length > 0;
  if (!hasEvidence && result.status !== "skipped") {
    return {
      ...result,
      phase,
      status: "failed",
      findings: [
        {
          phase,
          severity: "error",
          summary: "Phase evidence is empty.",
          detail: "A passed or failed Browser QA phase must record findings or checks_performed.",
          evidence_refs: [`phase:${phase}`],
          repair_suggestions: [
            "Record concrete checks_performed for the phase or emit structured findings.",
          ],
        },
      ],
      repair_suggestions: [
        "Record concrete checks_performed for the phase or emit structured findings.",
      ],
      evidence_refs: [`phase:${phase}`],
      checks_performed: normalizedResult.checks_performed,
    };
  }
  return { ...normalizedResult, phase };
}

export async function runBrowserQaOrchestrated(
  input: BrowserQaInput,
  provider?: BrowserQaProvider,
): Promise<BrowserQaRunResult> {
  const timestamp = new Date().toISOString();

  if (!isUiBearingSurfaceType(input.surface)) {
    return {
      phases: BROWSER_QA_PHASES.map((phase) => ({
        phase,
        status: "skipped" as const,
        findings: [],
        repair_suggestions: [],
        evidence_refs: [`surface:${input.surface}`],
        checks_performed: [
          `skipped Browser QA because surface '${input.surface}' is not UI-bearing`,
        ],
        skippedReason: `surface '${input.surface}' does not require Browser QA`,
      })),
      provider: "none",
      timestamp,
    };
  }

  const hasHtml = typeof input.htmlContent === "string" && input.htmlContent.trim().length > 0;
  const hasTargetUrl = typeof input.targetUrl === "string" && input.targetUrl.trim().length > 0;
  if (!hasHtml && !hasTargetUrl) {
    const smoke = await runSmokePhase(input);
    return {
      phases: [
        smoke,
        ...(["interaction", "visual", "accessibility"] as const).map((phase) => ({
          phase,
          status: "skipped" as const,
          findings: [],
          repair_suggestions: [],
          evidence_refs: ["input:htmlContent", "input:targetUrl"],
          checks_performed: ["skipped because smoke failed on missing Browser QA input"],
          skippedReason: "smoke phase failed due to missing Browser QA input",
        })),
      ],
      provider: provider?.providerId ?? "qfai-builtin",
      timestamp,
    };
  }

  if (provider && !provider.canRun(input.surface)) {
    return {
      phases: BROWSER_QA_PHASES.map((phase) => ({
        phase,
        status: "skipped" as const,
        findings: [],
        repair_suggestions: [],
        evidence_refs: [`provider:${provider.providerId}`],
        checks_performed: [
          `provider '${provider.providerId}' cannot run on surface '${input.surface}'`,
        ],
        skippedReason: `provider '${provider.providerId}' cannot run on surface '${input.surface}'`,
      })),
      provider: provider.providerId,
      timestamp,
    };
  }

  return provider
    ? runProviderPhases(input, provider, timestamp)
    : runBuiltinPhases(input, timestamp);
}

async function runBuiltinPhases(
  input: BrowserQaInput,
  timestamp: string,
): Promise<BrowserQaRunResult> {
  const phases: BrowserQaPhaseResult[] = [];
  const smoke = validatePhaseResult("smoke", await runSmokePhase(input));
  phases.push(smoke);
  if (smoke.status === "failed") {
    for (const phase of ["interaction", "visual", "accessibility"] as const) {
      phases.push({
        phase,
        status: "skipped",
        findings: [],
        repair_suggestions: [],
        evidence_refs: [`phase:${phase}`],
        checks_performed: ["skipped because smoke phase failed"],
        skippedReason: "smoke phase failed",
      });
    }
    return { phases, provider: "qfai-builtin", timestamp };
  }

  phases.push(validatePhaseResult("interaction", await runInteractionPhase(input)));
  phases.push(validatePhaseResult("visual", await runVisualPhase(input)));
  phases.push(validatePhaseResult("accessibility", await runAccessibilityPhase(input)));
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
        repair_suggestions: [],
        evidence_refs: [`phase:${phase}`],
        checks_performed: ["skipped because a previous phase failed"],
        skippedReason: "previous phase failed",
      });
      continue;
    }

    try {
      const result = validatePhaseResult(phase, await run(input));
      phases.push(result);
      previousFailed = result.status === "failed";
    } catch (error) {
      phases.push({
        phase,
        status: "failed",
        findings: [
          {
            phase,
            severity: "error",
            summary: "Provider phase execution failed.",
            detail: error instanceof Error ? error.message : String(error),
            evidence_refs: [`provider:${provider.providerId}`],
            repair_suggestions: ["Fix the provider error and rerun Browser QA."],
          },
        ],
        repair_suggestions: ["Fix the provider error and rerun Browser QA."],
        evidence_refs: [`provider:${provider.providerId}`],
        checks_performed: [`provider '${provider.providerId}' threw during ${phase}`],
      });
      previousFailed = true;
    }
  }

  return { phases, provider: provider.providerId, timestamp };
}

export function summarizeBrowserQaResult(result: BrowserQaRunResult): BrowserQaSummary {
  const phaseMap = {} as BrowserQaSummary["phases"];
  let totalFindings = 0;
  let totalRepairs = 0;
  const skippedReasons: string[] = [];

  for (const phaseResult of result.phases) {
    phaseMap[phaseResult.phase] = {
      status: phaseResult.status,
      findingsCount: phaseResult.findings.length,
      checksCount: phaseResult.checks_performed.length,
      passed: phaseResult.status === "passed" || phaseResult.status === "executed" ? 1 : 0,
      failed: phaseResult.status === "failed" ? 1 : 0,
    };
    totalFindings += phaseResult.findings.length;
    totalRepairs += phaseResult.repair_suggestions.length;
    if (phaseResult.status === "skipped" && phaseResult.skippedReason) {
      skippedReasons.push(`${phaseResult.phase}: ${phaseResult.skippedReason}`);
    }
  }

  return {
    providerId: result.provider,
    phases: phaseMap,
    totalFindings,
    totalRepairs,
    skippedReasons,
  };
}
