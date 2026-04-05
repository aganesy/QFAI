/**
 * Accessibility phase — validates a11y fundamentals.
 */
import type { BrowserQaInput, BrowserQaPhaseResult, BrowserQaFinding } from "../types.js";

export function runAccessibilityPhase(input: BrowserQaInput): Promise<BrowserQaPhaseResult> {
  const findings: BrowserQaFinding[] = [];
  const html = input.htmlContent ?? "";

  if (!html || html.trim().length === 0) {
    return Promise.resolve({
      phase: "accessibility",
      status: "skipped",
      findings: [],
      skippedReason: "No HTML content provided",
    });
  }

  // Check for images without alt
  if (/<img(?![^>]*\balt=)[^>]*>/i.test(html)) {
    findings.push({
      phase: "accessibility",
      severity: "warning",
      message: "One or more <img> tags may be missing alt attributes.",
      selector: "img",
    });
  }

  // Check for lang attribute on html element
  if (/<html(?![^>]*\blang=)[^>]*>/i.test(html)) {
    findings.push({
      phase: "accessibility",
      severity: "warning",
      message: "HTML element missing lang attribute.",
      selector: "html",
    });
  }

  // Check for skip navigation link
  if (!/<a[^>]*href=["']#/i.test(html) && /<nav/i.test(html)) {
    findings.push({
      phase: "accessibility",
      severity: "info",
      message: "Navigation present but no skip-to-content link detected.",
      selector: "nav",
    });
  }

  // Check for heading hierarchy
  if (/<h[2-6]/i.test(html) && !/<h1/i.test(html)) {
    findings.push({
      phase: "accessibility",
      severity: "warning",
      message: "Sub-headings found without an h1 element.",
      selector: "h1",
    });
  }

  return Promise.resolve({
    phase: "accessibility",
    status: "executed",
    findings,
  });
}
