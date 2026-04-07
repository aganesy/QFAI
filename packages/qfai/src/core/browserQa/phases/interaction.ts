import { createBrowserQaFinding } from "../findings.js";
import { collectRepairSuggestions } from "../repairSuggestions.js";
import type { BrowserQaInput, BrowserQaPhaseResult } from "../types.js";

export function runInteractionPhase(input: BrowserQaInput): Promise<BrowserQaPhaseResult> {
  const html = input.htmlContent ?? "";

  // DOM-based checks require htmlContent; skip when only targetUrl is provided.
  if (!html.trim()) {
    return Promise.resolve({
      phase: "interaction",
      status: "skipped",
      findings: [],
      repair_suggestions: [],
      evidence_refs: [],
      checks_performed: [],
      skippedReason: "htmlContent not provided; DOM-based interaction checks cannot run",
    });
  }

  const findings = [];
  const checksPerformed = [
    "checked forms for action wiring",
    "checked buttons for explicit type",
    "checked inputs for labeling",
  ];

  if (/<form(?![^>]*\baction=)[^>]*>/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "interaction",
        severity: "warning",
        summary: "Form action wiring is missing.",
        detail:
          "A form element was detected without an action attribute, which may break primary task completion.",
        selector: "form",
        evidenceRefs: ["html:form"],
        repairSuggestions: [
          "Provide a concrete action or an equivalent wired submit handler for the form.",
        ],
      }),
    );
  }
  if (/<button(?![^>]*\btype=)[^>]*>/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "interaction",
        severity: "info",
        summary: "Button type is implicit.",
        detail: "A button was found without an explicit type attribute.",
        selector: "button",
        evidenceRefs: ["html:button"],
        repairSuggestions: ["Add explicit type attributes to interactive buttons."],
      }),
    );
  }
  if (/<input/i.test(html) && !/<label/i.test(html)) {
    findings.push(
      createBrowserQaFinding(input, {
        phase: "interaction",
        severity: "warning",
        summary: "Inputs are missing labels.",
        detail: "Input elements were detected but no label elements were found.",
        selector: "input",
        evidenceRefs: ["html:input", "html:label"],
        repairSuggestions: ["Associate every input with a visible label or accessible name."],
      }),
    );
  }

  return Promise.resolve({
    phase: "interaction",
    status: findings.some((finding) => finding.severity === "error") ? "failed" : "executed",
    repair_suggestions: collectRepairSuggestions(findings),
    evidence_refs: Array.from(new Set(findings.flatMap((finding) => finding.evidence_refs))),
    checks_performed: checksPerformed,
    findings,
  });
}
