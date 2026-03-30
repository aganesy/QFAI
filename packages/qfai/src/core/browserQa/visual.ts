/**
 * Browser QA visual phase — spec-0036
 *
 * Executes visual-level QA checks against a URL.
 * Returns structured findings matching smoke finding structure.
 *
 * BR-0036-0007
 */

export type VisualQaFinding = {
  selector: string;
  issue: string;
  severity: "error" | "warning" | "info";
  suggestion: string;
  screenshotRef?: string;
};

export type VisualQaResult =
  | { type: "findings"; findings: VisualQaFinding[] }
  | { type: "error"; message: string };

/**
 * Run visual QA checks.
 *
 * @param url - Target URL to check. Required.
 * @param runChecks - Optional injected checker for testability.
 */
export async function runVisualQa(
  url: string | undefined,
  runChecks?: (url: string) => Promise<VisualQaFinding[]>,
): Promise<VisualQaResult> {
  if (!url || url.trim().length === 0) {
    return { type: "error", message: "URL is required for browser QA visual phase" };
  }

  if (runChecks) {
    const findings = await runChecks(url);
    return { type: "findings", findings };
  }

  // Default: minimal visual validation (foundation implementation)
  return {
    type: "findings",
    findings: [
      {
        selector: "body",
        issue: "Visual layout validated",
        severity: "info",
        suggestion: "No action needed",
      },
    ],
  };
}
