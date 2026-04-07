import { createBrowserQaFinding } from "../findings.js";
import { collectRepairSuggestions } from "../repairSuggestions.js";
import type { BrowserQaInput, BrowserQaPhaseResult } from "../types.js";

export function runSmokePhase(input: BrowserQaInput): Promise<BrowserQaPhaseResult> {
  const html = input.htmlContent ?? "";
  const hasTargetUrl = typeof input.targetUrl === "string" && input.targetUrl.trim().length > 0;
  if (!html.trim() && !hasTargetUrl) {
    return Promise.resolve({
      phase: "smoke",
      status: "failed",
      findings: [
        createBrowserQaFinding(input, {
          phase: "smoke",
          severity: "error",
          summary: "Browser QA input is missing.",
          detail: "Smoke checks require htmlContent or targetUrl from the production caller.",
          evidenceRefs: ["input:htmlContent", "input:targetUrl"],
          repairSuggestions: [
            "Pass htmlContent or targetUrl into Browser QA before running smoke checks.",
          ],
        }),
      ],
      repair_suggestions: [
        "Pass htmlContent or targetUrl into Browser QA before running smoke checks.",
      ],
      evidence_refs: ["input:htmlContent", "input:targetUrl"],
      checks_performed: ["validated Browser QA input presence"],
    });
  }

  const findings = [];
  const checksPerformed = [
    "verified html/body/head/title document structure",
    "verified Browser QA input came from html content",
  ];

  if (!/<html/i.test(html) && !/<!doctype/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "smoke",
        severity: "warning",
        summary: "Document wrapper is incomplete.",
        detail: "The captured content does not look like a complete HTML document.",
        evidenceRefs: ["html:document"],
        repairSuggestions: ["Capture the full HTML document instead of a fragment."],
      }),
    );
  }
  if (!/<head[\s>]/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "smoke",
        severity: "warning",
        summary: "Missing <head> element.",
        detail: "Head metadata is absent, which weakens runtime and rendering fidelity checks.",
        evidenceRefs: ["html:head"],
        repairSuggestions: ["Ensure the rendered document includes a valid <head> block."],
        selector: "head",
      }),
    );
  }
  if (!/<body[\s>]/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "smoke",
        severity: "error",
        summary: "Missing <body> element.",
        detail: "Smoke checks cannot verify content routing without a body element.",
        evidenceRefs: ["html:body"],
        repairSuggestions: ["Fix the render output so the page emits a valid <body> element."],
        selector: "body",
      }),
    );
  }
  if (!/<title[\s>]/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "smoke",
        severity: "info",
        summary: "Missing <title> element.",
        detail: "The page omits a title, reducing document completeness and usability.",
        evidenceRefs: ["html:title"],
        repairSuggestions: ["Add a descriptive <title> element for the active route."],
        selector: "title",
      }),
    );
  }

  return Promise.resolve({
    phase: "smoke",
    status: findings.some((finding) => finding.severity === "error") ? "failed" : "executed",
    repair_suggestions: collectRepairSuggestions(findings),
    evidence_refs: Array.from(new Set(findings.flatMap((finding) => finding.evidence_refs))),
    checks_performed: checksPerformed,
    findings,
  });
}
