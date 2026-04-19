import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue, IssueSeverity } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

const REQUIRED_CATEGORIES = [
  "user expectation / market norm",
  "product neighbor / comparable flow",
  "platform convention",
  "accessibility / compliance relevant signal",
] as const;

const REQUIRED_ENTRY_FIELDS = [
  "reference",
  "observation",
  "decision_connection",
  "evaluation_connection",
  "local_implication",
] as const;
const GUIDELINE_REQUIRED_FIELDS = [
  "source_id",
  "guideline_name",
  "rule_refs",
  "local_translation",
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
    category: "canonical",
    message,
    file: "04_Sources.md",
    suggested_action: suggestedAction,
  };
}

function extractTrendScanSection(content: string): string | null {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim().toLowerCase() === "## trend scan");
  if (start === -1) {
    return null;
  }
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index] ?? "") && !/^###/.test(lines[index] ?? "")) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function extractCategoryBody(content: string, category: string): string | null {
  const lines = content.split("\n");
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `### ${category}`.toLowerCase(),
  );
  if (start === -1) {
    return null;
  }
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^###\s+/.test(lines[index] ?? "")) {
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
  const match = new RegExp(`^\\s*-\\s*${field}\\s*:\\s*(.*)$`, "im").exec(entry);
  return match?.[1]?.trim();
}

export async function validateTrendScan(root: string, _config: QfaiConfig): Promise<Issue[]> {
  if (!(await isUiBearingSpec(root))) {
    return [];
  }

  const sourcesPath = path.join(root, "04_Sources.md");
  const content = await readSafe(sourcesPath);
  if (!content) {
    return [
      trendIssue(
        "UIX-VAL-TREND-SCAN-MISSING",
        "04_Sources.md is required for UI-bearing packs.",
        "error",
        "Add 04_Sources.md with a '## Trend Scan' section containing all required categories.",
      ),
    ];
  }

  const trendSection = extractTrendScanSection(content);
  if (!trendSection) {
    return [
      trendIssue(
        "UIX-VAL-TREND-SCAN-MISSING",
        "04_Sources.md must contain a '## Trend Scan' section for UI-bearing packs.",
        "error",
        "Add '## Trend Scan' section to 04_Sources.md with all required categories.",
      ),
    ];
  }

  const issues: Issue[] = [];
  for (const category of REQUIRED_CATEGORIES) {
    const categoryBody = extractCategoryBody(trendSection, category);
    if (!categoryBody) {
      issues.push(
        trendIssue(
          "UIX-VAL-TREND-CATEGORY-MISSING",
          `Trend scan is missing required category '${category}'.`,
          "error",
          `Add '### ${category}' under '## Trend Scan' with at least one complete entry.`,
        ),
      );
      continue;
    }

    const entries = parseEntries(categoryBody);
    if (entries.length === 0) {
      issues.push(
        trendIssue(
          "UIX-VAL-TREND-ENTRY-MISSING",
          `Category '${category}' must contain at least one complete entry.`,
          "error",
          `Add at least one '#### Entry' block under '### ${category}'.`,
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
              `Trend entry in '${category}' is missing '${field}' or uses placeholder content.`,
              "error",
              `Populate '${field}' in '${category}' with project-specific content.`,
            ),
          );
        }
      }
    }
  }

  const guidelineCategory = extractCategoryBody(trendSection, "design_guideline_research");
  const guidelineEntries = guidelineCategory ? parseEntries(guidelineCategory) : [];
  const hasConcreteGuidelineEntry = guidelineEntries.some((entry) =>
    GUIDELINE_REQUIRED_FIELDS.every((field) => {
      const value = extractField(entry, field);
      return Boolean(value) && !PLACEHOLDER_RE.test(value ?? "");
    }),
  );

  if (!hasConcreteGuidelineEntry) {
    issues.push(
      trendIssue(
        "UIX-VAL-T05",
        "UI-bearing packs should include at least one concrete design_guideline_research entry in 04_Sources.md before finalizing trend-derived axes.",
        "warning",
        "Add a design_guideline_research entry with guideline_name, rule_refs, and local_translation grounded in an applicable platform or library guideline.",
      ),
    );
  }

  return issues;
}
