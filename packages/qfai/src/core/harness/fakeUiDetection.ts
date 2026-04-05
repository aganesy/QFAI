import type { BrowserQaRunResult } from "../browserQa/types.js";
import type { RenderRunnerResult } from "../evidence/types.js";

export interface FakeUiDetectionResult {
  detected: boolean;
  reasons: string[];
  evidence_refs: string[];
  confidence: "low" | "medium" | "high";
}

export function detectFakeUi(input: {
  renderResults: RenderRunnerResult[];
  browserQaResults: BrowserQaRunResult[];
}): FakeUiDetectionResult {
  const reasons: string[] = [];
  const evidenceRefs: string[] = [];

  const capturedRenderCount = input.renderResults
    .flatMap((result) => result.entries)
    .filter((entry) => entry.status === "captured").length;
  if (capturedRenderCount === 0) {
    reasons.push("render evidence did not confirm any captured UI state");
    evidenceRefs.push("render:none-captured");
  }

  const interactionFindings = input.browserQaResults
    .flatMap((result) => result.phases)
    .filter((phase) => phase.phase === "interaction")
    .flatMap((phase) => phase.findings);
  if (interactionFindings.length === 0) {
    reasons.push("Browser QA interaction phase did not confirm actionable behavior");
    evidenceRefs.push("browserQa:interaction-empty");
  }

  const detected = reasons.length >= 2;
  return {
    detected,
    reasons,
    evidence_refs: evidenceRefs,
    confidence: detected ? "high" : reasons.length === 1 ? "medium" : "low",
  };
}
