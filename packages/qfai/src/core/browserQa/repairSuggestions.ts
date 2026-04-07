import type { BrowserQaFinding } from "./types.js";

export function collectRepairSuggestions(findings: BrowserQaFinding[]): string[] {
  return Array.from(
    new Set(
      findings
        .flatMap((finding) => finding.repair_suggestions)
        .filter((value) => value.trim().length > 0),
    ),
  );
}
