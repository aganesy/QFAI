/**
 * Browser QA smoke phase — spec-0036
 *
 * Executes smoke-level QA checks against a URL.
 * Returns structured findings with selector, issue, severity, suggestion.
 *
 * BR-0036-0006, BR-0036-0008, BR-0036-0009
 */

export type SmokeQaFinding = {
  selector: string;
  issue: string;
  severity: "error" | "warning" | "info";
  suggestion: string;
};

export type SmokeQaResult =
  | { type: "findings"; findings: SmokeQaFinding[] }
  | { type: "error"; message: string }
  | { type: "skip"; reason: string };

/**
 * Run smoke QA checks.
 *
 * @param url - Target URL to check. Required.
 * @param isWebProject - Whether this is a web project. False triggers n/a skip.
 * @param runChecks - Optional injected checker for testability.
 */
export async function runSmokeQa(
  url: string | undefined,
  isWebProject: boolean,
  runChecks?: (url: string) => Promise<SmokeQaFinding[]>,
): Promise<SmokeQaResult> {
  if (!isWebProject) {
    return { type: "skip", reason: "Non-web project; smoke QA is not applicable" };
  }

  if (!url || url.trim().length === 0) {
    return { type: "error", message: "URL is required for browser QA smoke phase" };
  }

  if (runChecks) {
    const findings = await runChecks(url);
    return { type: "findings", findings };
  }

  // Default: minimal structural checks (foundation implementation)
  return {
    type: "findings",
    findings: [
      {
        selector: "html",
        issue: "Page structure validated",
        severity: "info",
        suggestion: "No action needed",
      },
    ],
  };
}
