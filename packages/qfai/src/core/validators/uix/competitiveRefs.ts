/**
 * Competitive Reference Registry validator.
 *
 * Enforces the registry rules the `uiux.competitive_refs_min` knob
 * parameterises: a UI-bearing discussion pack must register at least
 * `competitive_refs_min` competitive references (default 3) in
 * `04_Sources.md`, and every registered reference must populate all three
 * mandatory fields. Setting the knob to `0` opts out of the count gate.
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import type { Issue } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

/** Default minimum applied when `uiux.competitive_refs_min` is absent. */
export const DEFAULT_COMPETITIVE_REFS_MIN = 3;

const REGISTRY_HEADING = "## competitive reference registry";

const MANDATORY_FIELDS = ["adopted_points", "rejected_points", "local_translation"] as const;

const PLACEHOLDER_RE = /^(?:tbd|todo|example|lorem|placeholder|n\/a|none|-{1,3})$/i;

type CompetitiveReference = {
  label: string;
  missingFields: string[];
};

function competitiveIssue(code: string, message: string, suggestedAction: string): Issue {
  return {
    code,
    severity: "error",
    category: "canonical",
    message,
    file: "04_Sources.md",
    suggested_action: suggestedAction,
  };
}

function isPopulated(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 && !PLACEHOLDER_RE.test(trimmed);
}

function extractRegistrySection(content: string): string | null {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim().toLowerCase() === REGISTRY_HEADING);
  if (start === -1) {
    return null;
  }
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function extractField(entry: string, field: string): string | undefined {
  const match = new RegExp(`^\\s*-\\s*${field}\\s*:\\s*(.*)$`, "im").exec(entry);
  return match?.[1]?.trim();
}

/** References written as `### Reference: <name>` blocks (the pack template shape). */
function parseBlockReferences(section: string): CompetitiveReference[] {
  return section
    .split(/(?=^###\s+)/m)
    .map((block) => block.trim())
    .filter((block) => block.startsWith("### "))
    .map((block) => ({
      label: (block.split("\n")[0] ?? "").replace(/^###\s+/, "").trim(),
      missingFields: MANDATORY_FIELDS.filter((field) => !isPopulated(extractField(block, field))),
    }));
}

function splitRow(row: string): string[] {
  const cells = row.trim().split("|");
  if (cells[0]?.trim() === "") cells.shift();
  if (cells[cells.length - 1]?.trim() === "") cells.pop();
  return cells.map((cell) => cell.trim());
}

function columnIndexes(header: string[]): Map<string, number> | null {
  const normalized = header.map((cell) => cell.toLowerCase().replace(/\s+/g, "_"));
  const indexes = new Map<string, number>();
  for (const field of MANDATORY_FIELDS) {
    const index = normalized.findIndex((cell) => cell.includes(field));
    if (index === -1) {
      return null;
    }
    indexes.set(field, index);
  }
  return indexes;
}

/** References written as a markdown table with the three mandatory columns. */
function parseTableReferences(section: string): CompetitiveReference[] {
  const rows = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .filter((line) => !/^\|[\s:|-]+\|?$/.test(line));
  const header = rows.shift();
  if (!header) {
    return [];
  }
  const indexes = columnIndexes(splitRow(header));
  if (!indexes) {
    return [];
  }
  return rows.map((row, position) => {
    const cells = splitRow(row);
    return {
      label: cells[0] ?? `row ${position + 1}`,
      missingFields: MANDATORY_FIELDS.filter(
        (field) => !isPopulated(cells[indexes.get(field) ?? -1]),
      ),
    };
  });
}

function parseReferences(section: string | null): CompetitiveReference[] {
  if (!section) {
    return [];
  }
  const blocks = parseBlockReferences(section);
  return blocks.length > 0 ? blocks : parseTableReferences(section);
}

function resolveMinimum(config: QfaiConfig): number {
  const configured = config.uiux?.competitive_refs_min;
  return configured === undefined ? DEFAULT_COMPETITIVE_REFS_MIN : configured;
}

/**
 * Validate the Competitive Reference Registry of a UI-bearing discussion pack.
 *
 * @param root - Discussion pack root directory
 * @param config - Resolved QFAI config; `uiux.competitive_refs_min` bounds the count
 */
export async function validateCompetitiveReferences(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const minimum = resolveMinimum(config);
  if (minimum <= 0 || !(await isUiBearingSpec(root))) {
    return [];
  }

  const content = await readSafe(path.join(root, "04_Sources.md"));
  const references = content ? parseReferences(extractRegistrySection(content)) : [];

  const issues: Issue[] = [];
  for (const reference of references) {
    if (reference.missingFields.length === 0) {
      continue;
    }
    issues.push(
      competitiveIssue(
        "UIX-VAL-COMPETITIVE-REF-INCOMPLETE",
        `Competitive reference '${reference.label}' is missing or placeholders '${reference.missingFields.join(", ")}'.`,
        `Populate ${reference.missingFields.join(", ")} for '${reference.label}' in the Competitive Reference Registry of 04_Sources.md.`,
      ),
    );
  }

  const complete = references.length - issues.length;
  if (complete < minimum) {
    issues.push(
      competitiveIssue(
        "UIX-VAL-COMPETITIVE-REFS-MIN",
        `UI-bearing packs need at least ${minimum} complete competitive references in 04_Sources.md; found ${complete}.`,
        `Add competitive references with ${MANDATORY_FIELDS.join(", ")} under '## Competitive Reference Registry', or lower uiux.competitive_refs_min.`,
      ),
    );
  }

  return issues;
}
