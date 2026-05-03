/**
 * SKILL.md sidecar-flow ordering validator.
 *
 * Checks that Step 1c (Trend Scan) precedes Step 1d (TRD axis derivation)
 * and that no parallel-execution marker is present between them.
 */

export interface SidecarFlowIssue {
  readonly rule: "SKILL-SIDECAR-FLOW";
  readonly message: string;
}

export function validateSidecarFlowOrdering(skillMdContent: string): SidecarFlowIssue[] {
  const step1cIdx = skillMdContent.indexOf("Step 1c");
  const step1dIdx = skillMdContent.indexOf("Step 1d");

  if (step1cIdx === -1 || step1dIdx === -1) {
    return [];
  }

  if (step1dIdx < step1cIdx) {
    return [
      {
        rule: "SKILL-SIDECAR-FLOW",
        message:
          "Step 1d appears before Step 1c in Sidecar Generation Flow; Step 1c (Trend Scan) MUST precede Step 1d (TRD axis derivation).",
      },
    ];
  }

  // Check the window from Step 1c through the rest of the line after Step 1d
  // (parallel marker may appear on the same line after Step 1d, e.g., "Step 1c and Step 1d may run in parallel")
  const lineEnd1d = skillMdContent.indexOf("\n", step1dIdx);
  const windowEnd = lineEnd1d !== -1 ? lineEnd1d : skillMdContent.length;
  const window = skillMdContent.slice(step1cIdx, windowEnd);
  const parallelPattern =
    /\bparallel\b.*\b(?:1c|1d)\b|\b(?:1c|1d)\b.*\bparallel\b|\bparallel\b|\b(?:concurrent|simultaneously)\b/i;
  if (parallelPattern.test(window)) {
    return [
      {
        rule: "SKILL-SIDECAR-FLOW",
        message:
          "Parallel execution detected between Step 1c and Step 1d; 並列禁止 (no parallel) — Step 1c must complete before Step 1d starts.",
      },
    ];
  }

  return [];
}
