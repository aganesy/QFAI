import { createBrowserQaFinding } from "../findings.js";
import { collectRepairSuggestions } from "../repairSuggestions.js";
import type { BrowserQaInput, BrowserQaPhaseResult } from "../types.js";

export function runAccessibilityPhase(input: BrowserQaInput): Promise<BrowserQaPhaseResult> {
  const html = input.htmlContent ?? "";
  const findings = [];
  const checksPerformed = [
    "checked image alt coverage",
    "checked html lang attribute",
    "checked skip-link presence when navigation exists",
    "checked heading hierarchy",
  ];

  if (/<img(?![^>]*\balt=)[^>]*>/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "accessibility",
        severity: "warning",
        summary: "Image alt text is missing.",
        detail: "One or more img elements appear without alt attributes.",
        selector: "img",
        evidenceRefs: ["html:img"],
        repairSuggestions: [
          "Add meaningful alt text or explicit decorative handling for every image.",
        ],
      }),
    );
  }
  if (/<html(?![^>]*\blang=)[^>]*>/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "accessibility",
        severity: "warning",
        summary: "Document language is missing.",
        detail: "The html element does not include a lang attribute.",
        selector: "html",
        evidenceRefs: ["html:lang"],
        repairSuggestions: ["Set the html lang attribute to the correct document language."],
      }),
    );
  }
  if (!/<a[^>]*href=["']#/i.test(html) && /<nav/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "accessibility",
        severity: "info",
        summary: "Skip link is missing.",
        detail: "Navigation is present but no skip-to-content link was detected.",
        selector: "nav",
        evidenceRefs: ["html:nav"],
        repairSuggestions: ["Add a skip-to-content link before the main navigation."],
      }),
    );
  }
  if (/<h[2-6]/i.test(html) && !/<h1/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "accessibility",
        severity: "warning",
        summary: "Heading hierarchy starts below h1.",
        detail: "Subheadings exist without an h1 element, which weakens document structure.",
        selector: "h1",
        evidenceRefs: ["html:heading-structure"],
        repairSuggestions: ["Add a single h1 that reflects the screen's primary purpose."],
      }),
    );
  }

  return Promise.resolve({
    phase: "accessibility",
    status: findings.some((finding) => finding.severity === "error") ? "failed" : "executed",
    repair_suggestions: collectRepairSuggestions(findings),
    evidence_refs: Array.from(new Set(findings.flatMap((finding) => finding.evidence_refs))),
    checks_performed: checksPerformed,
    findings,
  });
}
