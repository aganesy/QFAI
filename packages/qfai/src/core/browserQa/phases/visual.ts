/**
 * Visual phase — validates visual consistency and layout concerns.
 */
import type { BrowserQaInput, BrowserQaPhaseResult, BrowserQaFinding } from "../types.js";

export async function runVisualPhase(input: BrowserQaInput): Promise<BrowserQaPhaseResult> {
  const findings: BrowserQaFinding[] = [];
  const html = input.htmlContent ?? "";

  if (!html || html.trim().length === 0) {
    return {
      phase: "visual",
      status: "skipped",
      findings: [],
      skippedReason: "No HTML content provided",
    };
  }

  // Check for inline styles (which hinder visual consistency)
  const inlineStyleCount = (html.match(/\bstyle="[^"]*"/gi) ?? []).length;
  if (inlineStyleCount > 5) {
    findings.push({
      phase: "visual",
      severity: "warning",
      message: `Excessive inline styles detected (${inlineStyleCount}). Consider using CSS classes for visual consistency.`,
      target: "document",
    });
  }

  // Check for viewport meta tag
  if (!/<meta[^>]*name=["']viewport["'][^>]*>/i.test(html)) {
    findings.push({
      phase: "visual",
      severity: "warning",
      message: "Missing viewport meta tag — may cause layout issues on mobile devices.",
      selector: "meta[name=viewport]",
    });
  }

  return {
    phase: "visual",
    status: "executed",
    findings,
  };
}
