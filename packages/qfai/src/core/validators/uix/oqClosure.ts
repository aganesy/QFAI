/**
 * Canonical UIX OQ closure validator — v1.7.14
 *
 * Validates that no critical/blocking OQs remain open.
 * Moved from legacy/uixCompatibility.ts to establish canonical ownership.
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

// ---------------------------------------------------------------------------
// Canonical issue helper
// ---------------------------------------------------------------------------

function canonicalIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file: string,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "canonical",
    message,
    file,
    suggested_action: suggestedAction,
  };
}

// ---------------------------------------------------------------------------
// validateOqClosure
// ---------------------------------------------------------------------------

export async function validateOqClosure(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const rootOqPath = path.join(root, "11_OQ-Register.md");
  const uiuxOqPath = path.join(root, "uiux", "11_OQ-Register.md");
  const rootContent = await readSafe(rootOqPath);
  const content = rootContent || (await readSafe(uiuxOqPath));
  if (!content) return [];

  const issues: Issue[] = [];
  const relPath = rootContent ? "11_OQ-Register.md" : "uiux/11_OQ-Register.md";

  const oqBlocks = content.split(/(?=^##\s+OQ-\d{4})/m);
  for (const block of oqBlocks) {
    const idMatch = /^##\s+(OQ-\d{4})/m.exec(block);
    if (!idMatch?.[1]) continue;

    const oqId = idMatch[1];
    const isOpen = /status\s*:\s*open/i.test(block);
    const isCritical = /severity\s*:\s*(?:critical|blocking)/i.test(block);

    if (isOpen && isCritical) {
      issues.push(
        canonicalIssue(
          "UIX-VAL-OQ-OPEN-CRITICAL",
          `Open critical OQ found: ${oqId}. Must be resolved before proceeding.`,
          "error",
          relPath,
          `Resolve or downgrade ${oqId} in uiux/11_OQ-Register.md before validation can pass.`,
        ),
      );
    }
  }

  const tableRowRegex = /^\s*\|\s*(OQ-\d{4})\s*\|/;
  for (const line of content.split("\n")) {
    const rowMatch = tableRowRegex.exec(line);
    if (!rowMatch?.[1]) continue;
    const oqId = rowMatch[1];
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    const disposition = cols[3]?.toLowerCase();
    if (disposition === "open") {
      const fullRow = line.toLowerCase();
      if (/critical|blocking/i.test(fullRow)) {
        issues.push(
          canonicalIssue(
            "UIX-VAL-OQ-OPEN-CRITICAL",
            `Open critical OQ found: ${oqId}. Must be resolved before proceeding.`,
            "error",
            relPath,
            `Resolve or downgrade ${oqId} in ${relPath} before validation can pass.`,
          ),
        );
      }
    }
  }

  return issues;
}
