import { parseScenarioDocument } from "./scenarioModel.js";
import { extractIdsByKind } from "./specPackIds.js";
import type { SpecPackIdKind } from "./specPackIds.js";
import { LAYER_TAGS } from "./testStrategyTags.js";

const FEATURE_LINE_RE = /^\s*Feature:/gm;
const EX_ID_RE = /^EX-\d+$/;
const AC_ID_RE = /^AC-\d+$/;

export type ParsedExamplesScenario = {
  name: string;
  tags: string[];
  exIds: string[];
  acIds: string[];
  layerTags: string[];
};

export type ParsedExamplesFeature = {
  scenarios: ParsedExamplesScenario[];
  errors: string[];
};

export type MarkdownTable = {
  headers: string[];
  rows: string[][];
};

export function parseIdsFromText(text: string, kind: SpecPackIdKind): string[] {
  return extractIdsByKind(text, kind);
}

export function parseAcceptanceCriteriaIds(text: string): string[] {
  return extractIdsByKind(text, "AC");
}

export function parseTestCaseIds(text: string): string[] {
  return extractIdsByKind(text, "TC");
}

export function parseExamplesFeature(text: string, filePath: string): ParsedExamplesFeature {
  const errors: string[] = [];
  const featureCount = text.match(FEATURE_LINE_RE)?.length ?? 0;
  if (featureCount !== 1) {
    errors.push(`Feature 定義は1件のみ許可されます（検出: ${featureCount}）。`);
  }

  const parsed = parseScenarioDocument(text, filePath);
  if (!parsed.document || parsed.errors.length > 0) {
    return {
      scenarios: [],
      errors: [...errors, ...parsed.errors.map((error) => `Gherkin 解析失敗: ${error}`)],
    };
  }

  const scenarios = parsed.document.scenarios.map((scenario) => {
    const tags = scenario.tags;
    return {
      name: scenario.name,
      tags,
      exIds: tags.filter((tag) => EX_ID_RE.test(tag)),
      acIds: tags.filter((tag) => AC_ID_RE.test(tag)),
      layerTags: tags.filter((tag) => tag.startsWith("layer-")),
    };
  });

  return { scenarios, errors };
}

export function resolveAllowedLayerTagsFromPolicy(policyText: string): Set<string> {
  const extracted = new Set<string>();
  for (const match of policyText.matchAll(/@?(layer-[a-z0-9-]+)/gi)) {
    const tag = match[1];
    if (tag) {
      extracted.add(tag.toLowerCase());
    }
  }

  if (extracted.size > 0) {
    return extracted;
  }

  return new Set(Array.from(LAYER_TAGS));
}

/**
 * Outcome of locating the test-case table inside `06_Test-Cases.md`.
 *
 * `source` records how the table was found so callers can tell a
 * template-conformant spec (`section`) from an older one that only has a
 * matching header row somewhere in the document (`header-match`).
 */
export type TestCaseTableResolution =
  | { table: MarkdownTable; source: "section" | "header-match" }
  | { table: null; reason: "no-table" | "no-tc-id-column" };

/** Matches the template heading `## Test Case Table (required)` and its bare `## Test Case Table` form. */
const TEST_CASE_TABLE_HEADING = /^ {0,3}(#{1,6})\s*test\s*case\s*table\b/i;

/** Any ATX heading, with the 0-3 leading spaces CommonMark permits. */
const ANY_HEADING = /^ {0,3}(#{1,6})\s+\S/;

/** A fenced code block delimiter, per CommonMark (0-3 leading spaces). */
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Blanks fenced code blocks, preserving line count.
 *
 * `06_Test-Cases.md` often documents its own format in a fenced sample. Without
 * this, an illustrative `## Test Case Table` plus `TC-ID` table inside a fence
 * is selected as the named section and its example IDs are handed to the
 * validators and the report — and for a heading-less legacy document it flips
 * a previously correct resolution into a wrong one.
 */
function maskFences(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let open: { marker: string; length: number } | null = null;
  return lines
    .map((line) => {
      const fence = FENCE_LINE.exec(line)?.[1];
      if (open === null) {
        if (fence) {
          open = { marker: fence.charAt(0), length: fence.length };
          return "";
        }
        return line;
      }
      if (fence && fence.charAt(0) === open.marker && fence.length >= open.length) {
        open = null;
      }
      return "";
    })
    .join("\n");
}

const TC_ID_HEADER = "TC-ID";

function hasTcIdColumn(table: MarkdownTable): boolean {
  return table.headers.some((header) => header.trim() === TC_ID_HEADER);
}

/**
 * Returns the body of the `## Test Case Table` section, or `null` when the
 * document has no such heading. The section ends at the next heading of the
 * same or a higher level.
 */
function extractTestCaseTableSection(text: string): string | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => TEST_CASE_TABLE_HEADING.test(line));
  if (start === -1) {
    return null;
  }
  const level = (TEST_CASE_TABLE_HEADING.exec(lines[start] ?? "")?.[1] ?? "#").length;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = ANY_HEADING.exec(lines[index] ?? "");
    if (match && (match[1] ?? "").length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

/**
 * Resolves the test-case table of `06_Test-Cases.md`.
 *
 * The template names the section `## Test Case Table (required)`, but the
 * previous implementation read `parseFirstMarkdownTable` — literally the first
 * table in document order — so any explanatory table placed above the heading
 * hijacked TC extraction.
 *
 * Resolution is section-first and the legacy fallback is **mutually
 * exclusive** with it:
 *
 * - The `## Test Case Table` heading exists -> only that section is searched.
 *   If its table has no `TC-ID` column, that is a typed failure, not a licence
 *   to adopt an Appendix table: a mistyped column in the real table would
 *   otherwise be masked by an explanatory table further down, silently
 *   producing unknown/coverage findings keyed on illustration IDs.
 * - The heading does not exist -> the first `TC-ID`-bearing table anywhere in
 *   the document, so specs written before the heading existed keep working.
 *
 * Either way, "no table found" is reported rather than being allowed to read
 * as "all TCs covered".
 */
export function resolveTestCaseTable(rawText: string): TestCaseTableResolution {
  // Illustrative headings and tables inside fenced samples are not the spec.
  const text = maskFences(rawText);
  const section = extractTestCaseTableSection(text);
  if (section !== null) {
    const sectionTables = parseAllMarkdownTables(section);
    const sectionTable = sectionTables.find(hasTcIdColumn);
    if (sectionTable) {
      return { table: sectionTable, source: "section" };
    }
    return {
      table: null,
      reason: sectionTables.length === 0 ? "no-table" : "no-tc-id-column",
    };
  }

  const allTables = parseAllMarkdownTables(text);
  const fallback = allTables.find(hasTcIdColumn);
  if (fallback) {
    return { table: fallback, source: "header-match" };
  }

  return { table: null, reason: allTables.length === 0 ? "no-table" : "no-tc-id-column" };
}

export function parseFirstMarkdownTable(text: string): MarkdownTable | null {
  const tables = parseAllMarkdownTables(text);
  return tables.length > 0 ? (tables[0] ?? null) : null;
}

/**
 * Parse every markdown table in the input. Returned in document order.
 * Used by Triage validators (PR #206 review LWri) so a multi-table
 * Triage section does not let later tables silently bypass
 * QFAI-TRIAGE-002..006.
 */
export function parseAllMarkdownTables(text: string): MarkdownTable[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const tables: MarkdownTable[] = [];
  let index = 0;
  while (index < lines.length - 1) {
    const headerLine = lines[index] ?? "";
    const separatorLine = lines[index + 1] ?? "";
    if (!looksLikeTableRow(headerLine) || !isTableSeparator(separatorLine)) {
      index += 1;
      continue;
    }

    const headers = splitMarkdownRow(headerLine);
    const rows: string[][] = [];
    let cursor = index + 2;
    for (; cursor < lines.length; cursor += 1) {
      const rowLine = lines[cursor] ?? "";
      if (!looksLikeTableRow(rowLine)) {
        break;
      }
      rows.push(splitMarkdownRow(rowLine));
    }
    tables.push({ headers, rows });
    index = cursor;
  }
  return tables;
}

/**
 * Split a GFM markdown table row into trimmed cell strings.
 *
 * Symmetric pair: this function is the un-escape half of a contract
 * paired with `escapeTableCell` (`packages/qfai/src/core/sddTriage.ts`).
 * The renderer-side encode rule and the parser-side decode rule below
 * MUST stay in lock-step. Specifically:
 *
 * - The ONLY un-escape rule applied here is `\|` → `|`. Literal `\`
 *   is passed through unchanged. The renderer therefore MUST NOT
 *   pre-escape `\` (no `\` → `\\` step), or cells containing literal
 *   backslashes (Windows paths `C:\Users\...`, regex literals `\d+`)
 *   will silently double on round-trip while keeping column count
 *   valid — defeating the QFAI-TRIAGE-* validators.
 * - Adding any new decode rule here (e.g. `<br>` → `\n`, or `\n` →
 *   `\n` if multi-line cells become supported) MUST be matched by a
 *   corresponding encode rule in `escapeTableCell`, AND the round-trip
 *   identity tests in `tests/core/sddTriage.test.ts` (under
 *   `describe("escapeTableCell ↔ splitMarkdownRow round-trip identity")`)
 *   MUST be extended with the new character class. The contract is
 *   also declared at the spec level for the SDD skill (Stage 1
 *   Triage business rules).
 */
export function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimEdgePipes(trimmed);
  const cells: string[] = [];
  let current = "";

  for (let index = 0; index < inner.length; index += 1) {
    const ch = inner[index];
    if (ch === undefined) continue;
    const next = inner[index + 1];
    if (ch === "\\" && next === "|") {
      current += "|";
      index += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function looksLikeTableRow(line: string): boolean {
  return /^\s*\|/.test(line);
}

function isTableSeparator(line: string): boolean {
  if (!looksLikeTableRow(line)) {
    return false;
  }
  const cells = splitMarkdownRow(line).filter((cell) => cell.length > 0);
  if (cells.length === 0) {
    return false;
  }
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function trimEdgePipes(value: string): string {
  return value.replace(/^\|+/, "").replace(/\|+$/, "");
}
