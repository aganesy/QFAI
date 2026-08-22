/**
 * Competitive Reference Registry validator.
 *
 * Enforces the registry rules the `uiux.competitive_refs_min` knob
 * parameterises: a UI-bearing discussion pack must register at least
 * `competitive_refs_min` competitive references (default 3) in
 * `04_Sources.md`, and every registered reference must populate all three
 * mandatory fields. Setting the knob to `0` opts out of the count gate only —
 * references that are registered are still checked for completeness.
 */
import path from "node:path";

import type { QfaiConfig } from "../../config.js";
import { maskNonSpecRegions, splitMarkdownRow } from "../../specPackParsers.js";
import type { Issue } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

/** Default minimum applied when `uiux.competitive_refs_min` is absent. */
export const DEFAULT_COMPETITIVE_REFS_MIN = 3;

/**
 * Registry heading matcher.
 *
 * Published packs decorate the heading (`## Competitive Reference Registry
 * (UI-bearing packs)`), so the trailing qualifier must be tolerated instead of
 * demanding an exact string match.
 */
const REGISTRY_HEADING_RE = /^##\s+competitive reference registry\b/i;

/**
 * Heading that opens a reference block.
 *
 * Restricted to `### Reference:` so metadata headings that legitimately sit
 * beside a registry table (`### Field Definitions`, `### Validation Rules`) are
 * not collected as empty references — which would also suppress table parsing.
 */
const REFERENCE_BLOCK_RE = /^###\s+reference\s*:/i;

const MANDATORY_FIELDS = ["adopted_points", "rejected_points", "local_translation"] as const;

const PLACEHOLDER_RE = /^(?:tbd|todo|example|lorem|placeholder|n\/a|none|-{1,3})$/i;

/**
 * Unedited authoring-template values are bracketed prose
 * (`[What was adopted from this reference and why]`). Treat them as
 * unpopulated so a shipped template cannot be counted as a complete reference.
 */
const TEMPLATE_PLACEHOLDER_RE = /^\[[^\]]*\]$/;

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
  return (
    trimmed.length > 0 && !PLACEHOLDER_RE.test(trimmed) && !TEMPLATE_PLACEHOLDER_RE.test(trimmed)
  );
}

function extractRegistrySection(content: string): string | null {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => REGISTRY_HEADING_RE.test(line.trim()));
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

/**
 * Indented continuation lines under a field whose value is a block.
 *
 * Only the items that are themselves populated are kept, so a block of
 * bracketed template placeholders stays unpopulated rather than becoming a
 * long — and therefore "non-empty" — joined string.
 */
function collectBlockValue(lines: string[], start: number, indent: number): string | undefined {
  const items: string[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim().length === 0) {
      break;
    }
    if (line.length - line.trimStart().length <= indent) {
      break;
    }
    const item = line.trim().replace(/^[-*+]\s*/, "");
    if (isPopulated(item)) {
      items.push(item);
    }
  }
  return items.length > 0 ? items.join("; ") : undefined;
}

/**
 * Read one mandatory field out of a reference block.
 *
 * The value may sit on the field line (`- adopted_points: <value>`) or, in the
 * YAML block shape the same template already uses for `rule_refs`, on the
 * indented lines beneath a bare `- adopted_points:`. Reading only the field
 * line would report a populated block value as empty.
 */
function extractField(entry: string, field: string): string | undefined {
  const lines = entry.split("\n");
  const fieldRe = new RegExp(`^(\\s*)-\\s*${field}\\s*:\\s*(.*)$`, "i");
  for (let index = 0; index < lines.length; index += 1) {
    const match = fieldRe.exec(lines[index] ?? "");
    if (!match) {
      continue;
    }
    const inline = (match[2] ?? "").trim();
    if (inline.length > 0) {
      return inline;
    }
    return collectBlockValue(lines, index + 1, (match[1] ?? "").length);
  }
  return undefined;
}

/** References written as `### Reference: <name>` blocks (the pack template shape). */
function parseBlockReferences(section: string): CompetitiveReference[] {
  return section
    .split(/(?=^###\s+)/m)
    .map((block) => block.trim())
    .filter((block) => REFERENCE_BLOCK_RE.test(block))
    .map((block) => ({
      label: (block.split("\n")[0] ?? "").replace(/^###\s+/, "").trim(),
      missingFields: MANDATORY_FIELDS.filter((field) => !isPopulated(extractField(block, field))),
    }));
}

/** Header cell normalised to the `snake_case` shape the field names use. */
function normalizeHeaderCell(cell: string): string {
  return cell.replace(/[`*]/g, "").trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Map each mandatory field to its column.
 *
 * The match is **exact** after normalisation: a substring match would accept
 * `not_adopted_points` or `adopted_points_notes` as the `adopted_points`
 * column, so a registry that never carries the mandatory column would still
 * clear the count gate on the values of a differently-named neighbour.
 */
function columnIndexes(header: string[]): Map<string, number> | null {
  const normalized = header.map(normalizeHeaderCell);
  const indexes = new Map<string, number>();
  for (const field of MANDATORY_FIELDS) {
    const index = normalized.indexOf(field);
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
  const indexes = columnIndexes(splitMarkdownRow(header));
  if (!indexes) {
    return [];
  }
  return rows.map((row, position) => {
    const cells = splitMarkdownRow(row);
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
 * @param config - Resolved QFAI config; `uiux.competitive_refs_min` bounds the
 *   count. `0` disables the count gate only; registered references are still
 *   required to populate every mandatory field.
 */
export async function validateCompetitiveReferences(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const minimum = resolveMinimum(config);
  if (!(await isUiBearingSpec(root))) {
    return [];
  }

  const content = await readSafe(path.join(root, "04_Sources.md"));
  // Fenced samples and HTML comments are documentation, not registry entries:
  // three complete examples in a fence would otherwise satisfy the minimum on
  // an empty registry, and an unedited sample would raise a false incomplete.
  const references = content
    ? parseReferences(extractRegistrySection(maskNonSpecRegions(content)))
    : [];

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
  if (minimum > 0 && complete < minimum) {
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
