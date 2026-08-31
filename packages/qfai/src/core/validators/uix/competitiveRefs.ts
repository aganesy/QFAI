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
import { maskNonSpecRegions, parseAllMarkdownTables } from "../../specPackParsers.js";
import type { Issue } from "../../types.js";
import { isUiBearingSpec } from "../uixDetection.js";
import { readSafe } from "../utils.js";

/** Default minimum applied when `uiux.competitive_refs_min` is absent. */
export const DEFAULT_COMPETITIVE_REFS_MIN = 3;

/**
 * The H2 shape CommonMark accepts: up to three leading spaces, exactly two
 * `#`, then whitespace. Both the registry heading matcher and the section
 * terminator below are anchored on it, so the section that opens at an
 * indented heading also closes at one — reading it off `trim()` at one end and
 * the raw line at the other let a following section's references leak into the
 * registry.
 */
const H2_PREFIX = String.raw`^ {0,3}##(?!#)`;

/**
 * Registry heading matcher.
 *
 * Published packs decorate the heading (`## Competitive Reference Registry
 * (UI-bearing packs)`), so a trailing qualifier must be tolerated instead of
 * demanding an exact string match — but the tolerance has to stop short of
 * accepting a DIFFERENTLY NAMED section. A bare `\b` after the phrase matched
 * `## Competitive Reference Registry Expectations` and
 * `## Competitive Reference Registry Format`, which authoring guidance
 * routinely places ahead of the registry itself: the first match won, the
 * section ended at the next H2, and every complete reference in the real
 * registry below went uncounted (`found 0`).
 *
 * So a qualifier must be introduced by punctuation — `(UI-bearing packs)`,
 * `: UI-bearing packs`, `— UI-bearing packs`, or an ATX closing `##`. Another
 * WORD directly after the phrase names a different section, not this one.
 */
const REGISTRY_HEADING_RE = new RegExp(
  `${H2_PREFIX}\\s+competitive reference registry(?![\\w-])\\s*(?:[^\\w\\s].*)?$`,
  "i",
);

/** Any H2 — the line at which the registry section ends. */
const H2_BOUNDARY_RE = new RegExp(`${H2_PREFIX}(?:\\s|$)`);

/**
 * The H3 shape CommonMark accepts, mirroring {@link H2_PREFIX}. The block
 * split, the block matcher and the label strip are all derived from it, so an
 * indented `### Reference:` is recognised by all three or by none. Anchoring
 * only at column 0 while the H2 matcher tolerated the same indent meant a pack
 * whose blocks were indented parsed as a single unsplit chunk — and the
 * complete references in it were never counted.
 */
const H3_PREFIX = String.raw`^ {0,3}###(?!#)`;

/**
 * Heading that opens a reference block.
 *
 * Restricted to `Reference:` so metadata headings that legitimately sit beside
 * a registry table (`### Field Definitions`, `### Validation Rules`) are not
 * collected as empty references — which would also suppress table parsing.
 */
const REFERENCE_BLOCK_RE = new RegExp(`${H3_PREFIX}\\s+reference\\s*:`, "i");

/** Split point: immediately before any H3, indented or not. */
const H3_SPLIT_RE = new RegExp(`(?=${H3_PREFIX}\\s)`, "m");

/** The heading marker itself, for recovering the block's label. */
const H3_MARKER_RE = new RegExp(`${H3_PREFIX}\\s+`);

const MANDATORY_FIELDS = ["adopted_points", "rejected_points", "local_translation"] as const;

/** The bare tokens an author writes when a field has no content yet. */
const PLACEHOLDER_TOKEN = String.raw`tbd|tba|todo|example|lorem|placeholder|n\/a|none|-{1,3}`;

/**
 * A value that is a placeholder token, alone or carrying punctuation and the
 * note that follows it.
 *
 * An exact-match test read `TBD.`, `TODO: fill this` and `N/A (pending)` as
 * populated, so a registry with no real content in any field cleared the count
 * gate. The suffix must be introduced by PUNCTUATION, though: a token followed
 * by a space and another word is prose that happens to open with the token
 * (`None of the competitors ship this`), and rejecting that would fail a
 * populated field.
 */
const PLACEHOLDER_RE = new RegExp(String.raw`^(?:${PLACEHOLDER_TOKEN})\s*(?:[^\w\s].*)?$`, "i");

/**
 * A continuation line that declares one of the mandatory fields.
 *
 * `collectBlockValue` treats the indented lines under a bare `- adopted_points:`
 * as its value, and a mandatory field NESTED under another one is such a line —
 * so an entry that nested `rejected_points` under `adopted_points` made the
 * empty parent read as populated on the strength of its child's label alone.
 * A field declaration is structure, never the content of the field above it.
 */
const NESTED_FIELD_DECLARATION_RE = new RegExp(
  String.raw`^-?\s*(?:${MANDATORY_FIELDS.join("|")})\s*:`,
  "i",
);

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

/**
 * Both findings, built from parameters the caller passes.
 *
 * `severity` is a PARAMETER rather than a literal fixed inside the body, and
 * that is load-bearing beyond style: `tests/helpers/prototypingGateSurface.ts`
 * recognises an `Issue` factory by a body that binds an object literal's `code`
 * and `severity` to its own params, and its object-literal scanner only sees
 * `code: "…"` written out. A helper taking `code` alone and fixing the severity
 * internally is invisible to both, so these two error codes vanished from the
 * `EXPLORATION_HARD_ERROR_CODES` set-equality audit and from the rule-code
 * ownership audit — the checks that exist to notice a gate being relaxed.
 */
function competitiveIssue(
  code: string,
  message: string,
  severity: Issue["severity"],
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

/**
 * Strip the inline Markdown decoration a value may carry before it is tested
 * against the placeholder patterns.
 *
 * `` `TBD` `` and `**TODO**` render as the same placeholder a bare `TBD` does,
 * but the raw cell text does not match {@link PLACEHOLDER_RE} — so a registry
 * whose every mandatory field was a back-ticked `TBD` cleared the count gate.
 * The normalised form is used for the placeholder decision only; the original
 * value is what the author sees reported.
 */
function stripInlineMarkdown(value: string): string {
  return value.replace(/[`*_~]/g, "").trim();
}

function isPopulated(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    return false;
  }
  const bare = stripInlineMarkdown(trimmed);
  return (
    bare.length > 0 &&
    !PLACEHOLDER_RE.test(trimmed) &&
    !PLACEHOLDER_RE.test(bare) &&
    !TEMPLATE_PLACEHOLDER_RE.test(trimmed) &&
    !TEMPLATE_PLACEHOLDER_RE.test(bare)
  );
}

function extractRegistrySection(content: string): string | null {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => REGISTRY_HEADING_RE.test(line));
  if (start === -1) {
    return null;
  }
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (H2_BOUNDARY_RE.test(lines[index] ?? "")) {
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
 * long — and therefore "non-empty" — joined string. A nested declaration of
 * another mandatory field is dropped for the same reason: it is the structure
 * of the entry, not content the author wrote for the field above it.
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
    if (NESTED_FIELD_DECLARATION_RE.test(line.trim())) {
      continue;
    }
    if (isPopulated(item)) {
      items.push(item);
    }
  }
  return items.length > 0 ? items.join("; ") : undefined;
}

/**
 * The indentation a reference block's own fields sit at: the first list item
 * after its `### Reference:` heading.
 *
 * A mandatory field is a DIRECT child of the reference, and reading one at any
 * depth let a malformed entry that buried all three under a `- notes:` parent
 * count as complete — the three keys existed somewhere in the block, so the
 * only thing distinguishing a well-formed entry from that one was the
 * indentation nothing looked at.
 */
function fieldIndentOf(lines: string[]): number | undefined {
  for (const line of lines) {
    if (/^\s*[-*+]\s/.test(line)) {
      return line.length - line.trimStart().length;
    }
  }
  return undefined;
}

/**
 * Read one mandatory field out of a reference block.
 *
 * The value may sit on the field line (`- adopted_points: <value>`) or, in the
 * YAML block shape the same template already uses for `rule_refs`, on the
 * indented lines beneath a bare `- adopted_points:`. Reading only the field
 * line would report a populated block value as empty.
 *
 * Only a field at the block's own {@link fieldIndentOf} indentation counts, so
 * a key nested under another field is not read as one of the reference's.
 */
function extractField(entry: string, field: string): string | undefined {
  const lines = entry.split("\n");
  const fieldIndent = fieldIndentOf(lines);
  if (fieldIndent === undefined) {
    return undefined;
  }
  const fieldRe = new RegExp(`^(\\s*)-\\s*${field}\\s*:\\s*(.*)$`, "i");
  for (let index = 0; index < lines.length; index += 1) {
    const match = fieldRe.exec(lines[index] ?? "");
    if (!match) {
      continue;
    }
    if ((match[1] ?? "").length !== fieldIndent) {
      continue;
    }
    const inline = (match[2] ?? "").trim();
    if (inline.length > 0) {
      return inline;
    }
    return collectBlockValue(lines, index + 1, fieldIndent);
  }
  return undefined;
}

/** References written as `### Reference: <name>` blocks (the pack template shape). */
function parseBlockReferences(section: string): CompetitiveReference[] {
  return section
    .split(H3_SPLIT_RE)
    .filter((block) => REFERENCE_BLOCK_RE.test(block))
    .map((block) => ({
      label: (block.split("\n")[0] ?? "").replace(H3_MARKER_RE, "").trim(),
      missingFields: MANDATORY_FIELDS.filter((field) => !isPopulated(extractField(block, field))),
    }));
}

/** Header cell normalised to the `snake_case` shape the field names use. */
function normalizeHeaderCell(cell: string): string {
  return cell.replace(/[`*]/g, "").trim().toLowerCase().replace(/\s+/g, "_");
}

/**
 * Map each mandatory field to its column; a field the header does not carry is
 * simply absent from the map.
 *
 * The match is **exact** after normalisation: a substring match would accept
 * `not_adopted_points` or `adopted_points_notes` as the `adopted_points`
 * column, so a registry that never carries the mandatory column would still
 * clear the count gate on the values of a differently-named neighbour.
 */
function columnIndexes(header: string[]): Map<string, number> {
  const normalized = header.map(normalizeHeaderCell);
  const indexes = new Map<string, number>();
  for (const field of MANDATORY_FIELDS) {
    const index = normalized.indexOf(field);
    if (index !== -1) {
      indexes.set(field, index);
    }
  }
  return indexes;
}

/**
 * References written as a markdown table with the three mandatory columns.
 *
 * Table boundaries come from {@link parseAllMarkdownTables} rather than from
 * "every `|` line in the section". A registry table is routinely followed by a
 * `### Field Definitions` or `### Validation Rules` table, and flattening the
 * section into one table turned that second table's header and rows into
 * competitive references missing every mandatory field.
 *
 * A table is the registry when it carries **at least one** mandatory column,
 * and its rows are then read whether or not it carries all three: a column the
 * header is missing is reported as a missing field on every row. Requiring all
 * three to read any row meant a registry that renamed one column was discarded
 * whole, so its registered references drew no completeness finding at all
 * — silently, wherever the count gate was satisfied elsewhere or turned off
 * with `competitive_refs_min: 0`. A table carrying none of them is a metadata
 * table and is skipped.
 */
function parseTableReferences(section: string): CompetitiveReference[] {
  const references: CompetitiveReference[] = [];
  for (const table of parseAllMarkdownTables(section)) {
    const indexes = columnIndexes(table.headers);
    if (indexes.size === 0) {
      continue;
    }
    table.rows.forEach((cells, position) => {
      references.push({
        label: cells[0] ?? `row ${position + 1}`,
        missingFields: MANDATORY_FIELDS.filter(
          (field) => !isPopulated(cells[indexes.get(field) ?? -1]),
        ),
      });
    });
  }
  return references;
}

/**
 * Both registry shapes, aggregated.
 *
 * The two are not alternatives: a pack published with a table predates the
 * `### Reference:` playbook, and the natural way to add a fourth reference to
 * it is to append the block shape the playbook now prescribes. Preferring
 * blocks whenever one exists discarded the three table rows already there and
 * reported `found 1`.
 */
function parseReferences(section: string | null): CompetitiveReference[] {
  if (!section) {
    return [];
  }
  return [...parseBlockReferences(section), ...parseTableReferences(section)];
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
        "error",
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
        "error",
        `Add competitive references with ${MANDATORY_FIELDS.join(", ")} under '## Competitive Reference Registry', or lower uiux.competitive_refs_min.`,
      ),
    );
  }

  return issues;
}
