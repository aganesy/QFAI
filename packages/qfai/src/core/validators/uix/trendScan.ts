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

/**
 * The shipped `04_Sources.md` template seeds every field with a bracketed
 * prompt (`- reference: [Source name or URL]`). Those are unfilled slots, not
 * project content, so they must fail the same way `TBD` does. A markdown link
 * (`[text](url)`) is not caught: it does not end at the closing bracket.
 */
const BRACKET_PLACEHOLDER_RE = /^\[[^\]]*\]$/;

const LIST_VALUE_SEPARATOR = "; ";

function isPlaceholder(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    return true;
  }
  // A list-valued field is unfilled only when every one of its items is.
  return trimmed
    .split(LIST_VALUE_SEPARATOR)
    .every((part) => PLACEHOLDER_RE.test(part.trim()) || BRACKET_PLACEHOLDER_RE.test(part.trim()));
}

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

/**
 * Reads `- <field>: <value>` from an entry block.
 *
 * The shipped template writes some fields — `rule_refs` most notably — as an
 * indented bullet list on the lines that follow the label, so an empty inline
 * value falls through to those items instead of reporting the field as blank.
 * The collected items are joined with `LIST_VALUE_SEPARATOR`.
 */
function extractField(entry: string, field: string): string | undefined {
  const lines = entry.split("\n");
  const labelRe = new RegExp(`^\\s*-\\s*${field}\\s*:\\s*(.*)$`, "i");
  for (let index = 0; index < lines.length; index += 1) {
    const match = labelRe.exec(lines[index] ?? "");
    if (!match) {
      continue;
    }
    const inline = match[1]?.trim() ?? "";
    if (inline !== "") {
      return inline;
    }
    const items: string[] = [];
    for (let next = index + 1; next < lines.length; next += 1) {
      // Only deeper-indented bullets belong to this field; a sibling `- foo:`
      // at column 0 ends the list.
      const nested = /^\s+-\s+(.*)$/.exec(lines[next] ?? "");
      if (!nested) {
        break;
      }
      const item = nested[1]?.trim() ?? "";
      if (item !== "") {
        items.push(item);
      }
    }
    return items.join(LIST_VALUE_SEPARATOR);
  }
  return undefined;
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
        if (isPlaceholder(value)) {
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
    GUIDELINE_REQUIRED_FIELDS.every((field) => !isPlaceholder(extractField(entry, field))),
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
