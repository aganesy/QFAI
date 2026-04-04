/**
 * Smoke phase — validates basic HTML structure and document completeness.
 */
import type { BrowserQaInput, BrowserQaPhaseResult, BrowserQaFinding } from "../types.js";

export async function runSmokePhase(input: BrowserQaInput): Promise<BrowserQaPhaseResult> {
  const findings: BrowserQaFinding[] = [];
  const html = input.htmlContent ?? "";

  if (!html || html.trim().length === 0) {
    return {
      phase: "smoke",
      status: "skipped",
      findings: [],
      skippedReason: "No HTML content provided",
    };
  }

  if (!/<html/i.test(html) && !/<!doctype/i.test(html)) {
    findings.push({
      phase: "smoke",
      severity: "warning",
      message: "Content does not appear to be a complete HTML document.",
      target: "document",
    });
  }

  if (!/<head[\s>]/i.test(html)) {
    findings.push({
      phase: "smoke",
      severity: "warning",
      message: "Missing <head> element.",
      target: "head",
    });
  }

  if (!/<body[\s>]/i.test(html)) {
    findings.push({
      phase: "smoke",
      severity: "error",
      message: "Missing <body> element.",
      target: "body",
    });
  }

  if (!/<title[\s>]/i.test(html)) {
    findings.push({
      phase: "smoke",
      severity: "info",
      message: "Missing <title> element.",
      target: "title",
    });
  }

  return {
    phase: "smoke",
    status: "executed",
    findings,
  };
}
