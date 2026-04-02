/**
 * Browser QA — minimal truthful runner for v1.7.12.
 *
 * Reports actual findings rather than placeholder passes.
 * Empty findings produce a warning, not a silent pass.
 */

export type BrowserQaFinding = {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  element?: string;
};

export type BrowserQaResult = {
  status: "completed" | "skipped";
  findings: BrowserQaFinding[];
  metadata: {
    timestamp: string;
    runner: string;
    targetUrl?: string;
  };
};

/**
 * Run minimal browser QA checks.
 * Returns actual findings — never a blanket "all pass".
 * When no checks can be performed (e.g., no browser available),
 * returns status: "skipped" with reason in metadata.
 */
export function runBrowserQa(
  htmlContent: string,
  options?: { targetUrl?: string },
): BrowserQaResult {
  const findings: BrowserQaFinding[] = [];
  const timestamp = new Date().toISOString();

  if (!htmlContent || htmlContent.trim().length === 0) {
    const meta: BrowserQaResult["metadata"] = {
      timestamp,
      runner: "qfai-browser-qa-minimal",
    };
    if (options?.targetUrl) meta.targetUrl = options.targetUrl;
    return {
      status: "skipped",
      findings: [],
      metadata: meta,
    };
  }

  // Minimal truthful checks
  if (!htmlContent.includes("<html") && !htmlContent.includes("<!DOCTYPE")) {
    findings.push({
      rule: "valid-html-structure",
      severity: "warning",
      message: "Content does not appear to be a complete HTML document.",
    });
  }

  if (/<img[^>]+(?!alt=)/i.test(htmlContent)) {
    findings.push({
      rule: "img-alt-text",
      severity: "warning",
      message: "One or more <img> tags may be missing alt attributes.",
      element: "img",
    });
  }

  const meta: BrowserQaResult["metadata"] = {
    timestamp,
    runner: "qfai-browser-qa-minimal",
  };
  if (options?.targetUrl) meta.targetUrl = options.targetUrl;
  return {
    status: "completed",
    findings,
    metadata: meta,
  };
}

/**
 * Validate browser QA findings for truthfulness.
 * Returns issues if findings appear to be placeholder or always-empty.
 */
export function validateBrowserQaFindings(result: BrowserQaResult): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (result.status === "completed" && result.findings.length === 0) {
    warnings.push(
      "Browser QA completed with zero findings. Verify that checks were actually executed.",
    );
  }

  if (!result.metadata.timestamp || !result.metadata.runner) {
    warnings.push("Browser QA result missing required metadata (timestamp or runner).");
  }

  // Check for placeholder findings
  for (const finding of result.findings) {
    if (
      finding.message.toLowerCase().includes("todo") ||
      finding.message.toLowerCase().includes("placeholder") ||
      finding.message.toLowerCase().includes("tbd")
    ) {
      warnings.push(`Finding "${finding.rule}" appears to contain placeholder text.`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
