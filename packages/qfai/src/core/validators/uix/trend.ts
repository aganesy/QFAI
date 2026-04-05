import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

const REQUIRED_TREND_CATEGORIES = [
  "Visual Tone Trends",
  "Layout / Composition Trends",
  "Density / Hierarchy Trends",
  "Interaction / Motion Trends",
  "Component Styling Trends",
  "Stale / Overused AI Slop Patterns",
] as const;
const REQUIRED_ENTRY_FIELDS = [
  "reference",
  "observation",
  "freshness_date",
  "confidence",
  "source_translation",
  "local_implication",
] as const;
const PLACEHOLDER_RE = /^(?:tbd|todo|example|lorem|placeholder|n\/a|none)$/i;

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

function extractTrendSection(content: string): string | null {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => /^##\s+Trend\s+Scan\b/i.test(line));
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index] ?? "")) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function extractCategoryBody(section: string, heading: string): string | null {
  const lines = section.split("\n");
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `### ${heading}`.toLowerCase(),
  );
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^###\s+/.test(lines[index] ?? "") || /^##\s+/.test(lines[index] ?? "")) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function parseEntries(categoryBody: string): string[] {
  return categoryBody
    .split(/(?=^####\s+)/m)
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith("#### "));
}

function extractField(entry: string, field: string): string | undefined {
  const re = new RegExp(`^\\s*-\\s*${field}\\s*:\\s*(.*)$`, "im");
  return re.exec(entry)?.[1]?.trim();
}

export async function validateTrendScan(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) return [];

  const sourcesPath = path.join(root, "04_Sources.md");
  const content = await readSafe(sourcesPath);
  if (!content) return [];

  const section = extractTrendSection(content);
  if (!section) {
    return [
      trendIssue(
        "UIX-VAL-TREND-SCAN-MISSING",
        "04_Sources.md is missing the Trend Scan section.",
        "error",
        "Add a '## Trend Scan' section with all six required trend categories.",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const category of REQUIRED_TREND_CATEGORIES) {
    const body = extractCategoryBody(section, category);
    if (!body) {
      issues.push(
        trendIssue(
          "UIX-VAL-TREND-CATEGORY-MISSING",
          `Trend Scan is missing required category '${category}'.`,
          "error",
          `Add '### ${category}' to 04_Sources.md with at least one complete entry.`,
        ),
      );
      continue;
    }

    const entries = parseEntries(body);
    if (entries.length === 0) {
      issues.push(
        trendIssue(
          "UIX-VAL-TREND-ENTRY-MISSING",
          `Trend category '${category}' must contain at least one complete entry.`,
          "error",
          `Add at least one '#### Entry' block under '${category}'.`,
        ),
      );
      continue;
    }

    for (const entry of entries) {
      for (const field of REQUIRED_ENTRY_FIELDS) {
        const value = extractField(entry, field);
        if (!value || PLACEHOLDER_RE.test(value)) {
          issues.push(
            trendIssue(
              "UIX-VAL-TREND-FIELD-MISSING",
              `Trend entry in '${category}' is missing required field '${field}' or uses placeholder content.`,
              "error",
              `Populate '${field}' in the '${category}' entry with concrete, project-specific content.`,
            ),
          );
        }
      }
    }
  }

  return issues;
}
