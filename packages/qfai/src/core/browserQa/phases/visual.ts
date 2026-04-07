import { createBrowserQaFinding } from "../findings.js";
import { collectRepairSuggestions } from "../repairSuggestions.js";
import type { BrowserQaInput, BrowserQaPhaseResult } from "../types.js";

export function runVisualPhase(input: BrowserQaInput): Promise<BrowserQaPhaseResult> {
  const html = input.htmlContent ?? "";

  // Content-based visual checks require htmlContent; skip when only targetUrl is provided.
  if (!html.trim()) {
    return Promise.resolve({
      phase: "visual",
      status: "skipped",
      findings: [],
      repair_suggestions: [],
      evidence_refs: [],
      checks_performed: [],
      skippedReason: "htmlContent not provided; visual content checks cannot run",
    });
  }

  const findings = [];
  const checksPerformed = ["checked inline style density", "checked viewport meta tag"];

  const inlineStyleCount = (html.match(/\bstyle="[^"]*"/gi) ?? []).length;
  if (inlineStyleCount > 5) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "visual",
        severity: "warning",
        summary: "Inline style usage is excessive.",
        detail: `Detected ${inlineStyleCount} inline style attributes, which weakens visual consistency.`,
        evidenceRefs: ["html:style-attributes"],
        repairSuggestions: ["Move repeated visual styling into shared CSS classes or tokens."],
      }),
    );
  }
  if (!/<meta[^>]*name=["']viewport["'][^>]*>/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "visual",
        severity: "warning",
        summary: "Viewport meta tag is missing.",
        detail: "Responsive rendering checks are unreliable without a viewport meta tag.",
        selector: "meta[name=viewport]",
        evidenceRefs: ["html:meta-viewport"],
        repairSuggestions: ["Add a responsive viewport meta tag to the rendered document."],
      }),
    );
  }

  return Promise.resolve({
    phase: "visual",
    status: findings.some((finding) => finding.severity === "error") ? "failed" : "executed",
    repair_suggestions: collectRepairSuggestions(findings),
    evidence_refs: Array.from(new Set(findings.flatMap((finding) => finding.evidence_refs))),
    checks_performed: checksPerformed,
    findings,
  });
}
