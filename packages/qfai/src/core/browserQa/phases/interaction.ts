/**
 * Interaction phase — validates interactive elements and form semantics.
 */
import type { BrowserQaInput, BrowserQaPhaseResult, BrowserQaFinding } from "../types.js";

export function runInteractionPhase(input: BrowserQaInput): Promise<BrowserQaPhaseResult> {
  const findings: BrowserQaFinding[] = [];
  const html = input.htmlContent ?? "";

  if (!html || html.trim().length === 0) {
    return Promise.resolve({
      phase: "interaction",
      status: "skipped",
      findings: [],
      skippedReason: "No HTML content provided",
    });
  }

  // Check for forms without action
  if (/<form(?![^>]*\baction=)[^>]*>/i.test(html)) {
    findings.push({
      phase: "interaction",
      severity: "warning",
      message: "Form element found without an action attribute.",
      selector: "form",
    });
  }

  // Check for buttons without type
  if (/<button(?![^>]*\btype=)[^>]*>/i.test(html)) {
    findings.push({
      phase: "interaction",
      severity: "info",
      message: "Button element found without explicit type attribute.",
      selector: "button",
    });
  }

  // Check for inputs without labels
  if (/<input/i.test(html) && !/<label/i.test(html)) {
    findings.push({
      phase: "interaction",
      severity: "warning",
      message: "Input elements found but no label elements detected.",
      selector: "input",
    });
  }

  return Promise.resolve({
    phase: "interaction",
    status: "executed",
    findings,
  });
}
