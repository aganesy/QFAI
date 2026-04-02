/**
 * UIX-VAL trend scan validator — spec-0034
 *
 * Validates that 04_Sources.md contains a Trend Scan section
 * with freshness metadata (confidence, freshness_date, source_translation).
 *
 * BR-0034-0005, BR-0034-0006, BR-0034-0007, BR-0034-0008
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

function trendIssue(
  code: string,
  message: string,
  severity: IssueSeverity,
  suggestedAction: string,
): Issue {
  return {
    code,
    severity,
    category: "compatibility",
    message,
    file: "04_Sources.md",
    suggested_action: suggestedAction,
  };
}

export async function validateTrendScan(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const sourcesPath = path.join(root, "04_Sources.md");
  const content = await readSafe(sourcesPath);

  if (!content) return [];

  // Check for Trend Scan section
  if (!/^##\s+Trend\s+Scan/im.test(content)) {
    return [
      trendIssue(
        "UIX-VAL-TREND-SCAN-MISSING",
        "04_Sources.md is missing the Trend Scan section.",
        "error",
        "Add a '## Trend Scan' section to 04_Sources.md with trend references.",
      ),
    ];
  }

  // Extract the Trend Scan section content
  const lines = content.split("\n");
  let inSection = false;
  const sectionLines: string[] = [];
  for (const line of lines) {
    if (/^##\s+Trend\s+Scan/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s/.test(line)) break;
    if (inSection) sectionLines.push(line);
  }

  const sectionContent = sectionLines.join("\n");

  const issues: Issue[] = [];

  // Check for source_translation in the section
  if (!/source_translation/i.test(sectionContent)) {
    issues.push(
      trendIssue(
        "UIX-VAL-TREND-FRESHNESS-MISSING",
        "Trend scan references are missing source_translation metadata.",
        "error",
        "Add source_translation to each trend reference in the Trend Scan section.",
      ),
    );
  }

  // Check for freshness_date
  if (!/freshness_date/i.test(sectionContent)) {
    issues.push(
      trendIssue(
        "UIX-VAL-TREND-FRESHNESS-MISSING",
        "Trend scan references are missing freshness_date metadata.",
        "error",
        "Add freshness_date to each trend reference in the Trend Scan section.",
      ),
    );
  }

  // Check for confidence
  if (!/confidence/i.test(sectionContent)) {
    issues.push(
      trendIssue(
        "UIX-VAL-TREND-FRESHNESS-MISSING",
        "Trend scan references are missing confidence metadata.",
        "error",
        "Add confidence to each trend reference in the Trend Scan section.",
      ),
    );
  }

  return issues;
}
