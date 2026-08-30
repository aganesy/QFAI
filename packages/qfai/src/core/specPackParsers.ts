import { parseScenarioDocument } from "./scenarioModel.js";
import { extractIdsByKind } from "./specPackIds.js";
import type { SpecPackIdKind } from "./specPackIds.js";

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

/**
 * Extracts the allowed `layer-*` tag set from the shipped test-layer policy.
 *
 * The shipped `catalog/test-layers.md` states its layers as headings
 * (`### L3 Integration`), not as `layer-*` tokens, so a token-only scan
 * returned nothing and the caller fell back to the built-in set — silencing
 * the read without restoring enforcement. Both forms are parsed.
 *
 * Returns an EMPTY set when neither form is present, so the caller can report
 * an unparseable policy instead of silently widening the allowed set.
 */
export function resolveAllowedLayerTagsFromPolicy(policyText: string): Set<string> {
  const extracted = new Set<string>();
  for (const match of policyText.matchAll(/@?(layer-[a-z0-9-]+)/gi)) {
    const tag = match[1];
    if (tag) {
      extracted.add(tag.toLowerCase());
    }
  }

  // `### L3 Integration` / `### L1 Unit` heading form.
  for (const match of policyText.matchAll(/^#{1,6}\s*L\d\s+([A-Za-z0-9][A-Za-z0-9 -]*)$/gim)) {
    const word = (match[1] ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    if (word.length > 0) {
      extracted.add(`layer-${word}`);
    }
  }

  return extracted;
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

/**
 * Matches the template heading `## Test Case Table (required)` and its bare
 * `## Test Case Table` form — and nothing else.
 *
 * The suffix is limited to a single parenthesised qualifier (so a translated
 * `(必須)` still matches) and the heading must then end. A trailing word makes
 * it a different section: `## Test Case Table Format` / `## Test Case Table
 * Notes` document the format, and treating one of those as the named section
 * hands the validators an illustration table — or, when it holds no `TC-ID`
 * table at all, produces an `unresolved` result even though the real table is
 * right there in the document.
 */
const TEST_CASE_TABLE_HEADING = /^ {0,3}(#{1,6})\s*test\s*case\s*table\s*(?:\([^)]*\))?\s*$/i;

/** Any ATX heading, with the 0-3 leading spaces CommonMark permits. */
const ANY_HEADING = /^ {0,3}(#{1,6})\s+\S/;

/** A fenced code block delimiter, per CommonMark (0-3 leading spaces). */
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Removes the HTML-comment regions of a single line.
 *
 * Returns the visible remainder plus whether a comment is still open at the end
 * of the line, so the caller can carry the state across lines.
 */
function maskLineComments(line: string, inComment: boolean): { text: string; open: boolean } {
  let visible = "";
  let index = 0;
  let open = inComment;

  while (index < line.length) {
    if (open) {
      const close = line.indexOf("-->", index);
      if (close === -1) {
        return { text: visible, open: true };
      }
      index = close + 3;
      open = false;
      continue;
    }
    const start = line.indexOf("<!--", index);
    if (start === -1) {
      visible += line.slice(index);
      break;
    }
    visible += line.slice(index, start);
    index = start + 4;
    open = true;
  }
  return { text: visible, open };
}

/** A top-level indented code block: four spaces or a tab, per CommonMark. */
const INDENTED_CODE_LINE = /^(?: {4}|\t)/;

/** A list item marker, which makes the indentation below it continuation. */
const LIST_ITEM_LINE = /^\s*(?:[-*+]|\d+[.)])\s/;

/**
 * Start of a CommonMark type-1 raw HTML block. These four tags are the ones
 * whose contents are never parsed as Markdown, and the block runs to its
 * closing tag regardless of blank lines — unlike `<div>` and friends, which end
 * at a blank line and do let Markdown resume.
 */
const RAW_HTML_BLOCK_START = /^ {0,3}<(?:pre|script|style|textarea)(?=[\s/>]|$)/i;

/** End of a type-1 raw HTML block: any of the four closing tags, per CommonMark. */
const RAW_HTML_BLOCK_END = /<\/(?:pre|script|style|textarea)>/i;

/**
 * CommonMark's type-6 block-level tag names. A line opening or closing one of
 * these starts a raw HTML block that runs to the next **blank line**, and
 * Markdown does not resume inside it.
 */
const BLANK_TERMINATED_HTML_TAGS = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul",
] as const;

/**
 * Start of a CommonMark type-6 raw HTML block.
 *
 * Type 1 covers only `<pre>`, `<script>`, `<style>` and `<textarea>` — the four
 * that run past blank lines to a closing tag. `<div>`, `<table>` and the rest
 * end at a blank line instead, but until they do their contents are just as raw:
 * a `## Risks` between `<div>` and the next blank line is not a heading, and
 * reading it as one let a spec satisfy a required-heading gate with markup it
 * never wrote as a section.
 */
const BLANK_TERMINATED_HTML_START = new RegExp(
  `^ {0,3}</?(?:${BLANK_TERMINATED_HTML_TAGS.join("|")})(?:[\\s/>]|$)`,
  "i",
);

/**
 * Blanks the regions of a spec document that are not the spec, preserving line
 * count: fenced code blocks, HTML comments, raw HTML blocks, and top-level
 * indented code blocks.
 *
 * These documents often illustrate their own format. Without this, an
 * illustrative `## Test Case Table` plus `TC-ID` table inside one is selected as
 * the named section and its example IDs are handed to the validators and the
 * report — and for a heading-less legacy document it flips a previously correct
 * resolution into a wrong one, because the hidden sample outranks the real
 * table. In `tdd/test-list.md` the same hole was worse: a schema-complete sample
 * ledger row in an indented block was collected as a real row, so a spec with no
 * ledger at all could satisfy `TDDLIST_TC_NOT_COVERED` — and owe no `Test file`
 * or `Evidence`, because a `todo` row owes neither — and pass
 * `validate --profile full --fail-on error` with no test behind it.
 *
 * Fence state wins over comment state: `<!--` inside a fenced sample is sample
 * text, not a comment opener, so an unclosed one cannot swallow the rest of the
 * document. Comments are stripped before the fence check on a line, so a fence
 * marker that only appears inside a comment does not open a block either.
 *
 * **Raw HTML blocks are blanked too.** `<pre>`, `<script>`, `<style>` and
 * `<textarea>` hold literal text, so a `## Risks` line inside one is not a
 * heading and a `| TC-ID |` row inside one is not a table row — reading either
 * as spec content lets a document satisfy a gate with markup it never wrote.
 *
 * **Indented code is recognised only at the top level.** Under a list item,
 * four-space indentation is continuation rather than code, and telling the two
 * apart needs the list's content column. Rather than guess it, a block is code
 * only when no list is open — which closes the hole a document can be authored
 * into while never blanking a table someone indented under a bullet.
 */
export function maskNonSpecRegions(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let open: { marker: string; length: number } | null = null;
  let inComment = false;
  let inIndentedCode = false;
  let inRawHtml = false;
  let inBlankTerminatedHtml = false;
  let listOpen = false;
  let prevBlank = true;

  return lines
    .map((line) => {
      if (open !== null) {
        const closing = FENCE_LINE.exec(line)?.[1];
        if (closing && closing.charAt(0) === open.marker && closing.length >= open.length) {
          open = null;
        }
        return "";
      }

      if (inRawHtml) {
        // The closing-tag line belongs to the block, so it is blanked as well.
        if (RAW_HTML_BLOCK_END.test(line)) {
          inRawHtml = false;
        }
        return "";
      }

      const blank = line.trim().length === 0;

      if (inBlankTerminatedHtml) {
        // The blank line ends the block and is itself outside it, so it is kept
        // — it is what lets the next line open a paragraph or a heading again.
        if (blank) {
          inBlankTerminatedHtml = false;
          prevBlank = true;
          return line;
        }
        return "";
      }

      if (inIndentedCode) {
        // A blank line does not end the block — an indented sample may contain
        // one — but the first non-blank line at a shallower indent does.
        if (blank || INDENTED_CODE_LINE.test(line)) {
          prevBlank = blank;
          return "";
        }
        inIndentedCode = false;
      } else if (!listOpen && prevBlank && !blank && INDENTED_CODE_LINE.test(line)) {
        inIndentedCode = true;
        prevBlank = false;
        return "";
      }

      if (LIST_ITEM_LINE.test(line)) {
        listOpen = true;
      } else if (!blank && !/^\s/.test(line)) {
        // A non-blank line at column zero that is not a list item ends the list,
        // so indentation after it is code again.
        listOpen = false;
      }
      prevBlank = blank;

      const masked = maskLineComments(line, inComment);
      inComment = masked.open;

      const fence = FENCE_LINE.exec(masked.text)?.[1];
      if (fence) {
        open = { marker: fence.charAt(0), length: fence.length };
        return "";
      }

      if (RAW_HTML_BLOCK_START.test(masked.text)) {
        // A one-line `<pre>…</pre>` opens and closes on the same line.
        inRawHtml = !RAW_HTML_BLOCK_END.test(masked.text);
        return "";
      }

      // Checked after type 1, which wins where the two overlap, and after the
      // fence check, so `<div>` inside a fenced sample is sample text.
      if (BLANK_TERMINATED_HTML_START.test(masked.text)) {
        inBlankTerminatedHtml = true;
        return "";
      }
      return masked.text;
    })
    .join("\n");
}

const TC_ID_HEADER = "TC-ID";

/**
 * Case-**sensitive**, on purpose: a `TC-Id` / `tc-id` header is a mistyped
 * column, and `resolveTestCaseTable` surfaces that as `no-tc-id-column` rather
 * than silently adopting an Appendix table instead.
 *
 * The agreement that matters is between the readers, not with the typo:
 * `atddTraceability.ts#collectTableTcLevels` reads through
 * `resolveTestCaseTables`, so both gates see the same tables. When the header
 * is mistyped neither gate resolves it — `validateTddList` reports
 * `TDDLIST_TC_TABLE_UNRESOLVED` and `QFAI-ATDD-112` sees no declared `Level`
 * and keeps the default obligation — so the TC is owed by both, not neither,
 * and fixing the header clears both.
 */
function hasTcIdColumn(table: MarkdownTable): boolean {
  return table.headers.some((header) => header.trim() === TC_ID_HEADER);
}

/**
 * Returns the body of the `## Test Case Table` section, or `null` when the
 * document has no such heading. The section ends at the next heading of the
 * same or a higher level.
 */
export function extractTestCaseTableSection(text: string): string | null {
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
  // Illustrative headings and tables inside fenced samples or HTML comments
  // are not the spec.
  const text = maskNonSpecRegions(rawText);
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

/**
 * Every `TC-ID`-bearing table the spec declares, not only the first.
 *
 * A spec that splits `06_Test-Cases.md` into several tables — per BR, per AC,
 * or a migration table beside the authoritative one — was read by two different
 * rules in two different ways: `atddTraceability.ts#collectTableTcLevels`
 * iterates `parseAllMarkdownTables`, while `resolveTestCaseTable` returns the
 * first match. A `TC-*` in the second table was therefore visible to
 * `QFAI-ATDD-112` and invisible to `TDDLIST_TC_NOT_COVERED`.
 *
 * That was survivable while both rules demanded something. It stops being
 * survivable once L1/L2 is excluded from `QFAI-ATDD-112` and the ledger becomes
 * the only gate: an L1 TC in a second table would then be owed by neither.
 *
 * `resolveTestCaseTable` is unchanged — `reportTddCoverage` and `specPack`
 * describe a spec's *shape* and want the single authoritative table.
 */
/**
 * True when the document has a `## Test Case Table` section at all.
 *
 * A heading-form spec legitimately has none, and its unresolved result is
 * not a fault. A document that has the section and cannot resolve a table in
 * it is broken — and if it *also* uses the heading form, the presence of one
 * readable heading was enough to discard the failure and take the broken
 * table's TCs with it.
 */
export function hasTestCaseTableSection(rawText: string): boolean {
  return extractTestCaseTableSection(maskNonSpecRegions(rawText)) !== null;
}
export function resolveTestCaseTables(rawText: string): MarkdownTable[] {
  const text = maskNonSpecRegions(rawText);
  const section = extractTestCaseTableSection(text);
  const tables = parseAllMarkdownTables(section ?? text);
  return tables.filter(hasTcIdColumn);
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
 * Encode one value for a GFM table cell — the inverse of
 * {@link splitMarkdownRow}, and the only correct way to put author-supplied
 * text into a table.
 *
 * It lives here, beside its decoder, and is exported. It used to be a private
 * function in `sddTriage.ts` whose sole caller was the Triage renderer, so a
 * skill that instructs an author to write command output into a ledger cell had
 * no encoder to point at — and a grep of the entire shipped
 * `.qfai/assistant/` tree for `escape`, `backslash` or `vertical bar` returned
 * nothing. Two ways to break a table, no published rule for either.
 *
 * Exactly two rules, matching the decoder below:
 *
 * - `|` → `\|`, the only escape `splitMarkdownRow` un-escapes.
 * - CR / LF / CRLF → a single space. A newline has no representation in a GFM
 *   cell at all, so it is flattened rather than left to truncate the row.
 *
 * A literal backslash is deliberately NOT pre-escaped — see the round-trip
 * contract on {@link splitMarkdownRow}.
 */
export function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r\n|\r|\n/g, " ");
}

/**
 * Split a GFM markdown table row into trimmed cell strings.
 *
 * Symmetric pair: this function is the un-escape half of a contract
 * paired with {@link escapeTableCell} above.
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

/**
 * The exact line shape {@link parseAllMarkdownTables} treats as a table row.
 *
 * Exported so callers that must agree with the parser about "is this line part
 * of a table" reuse this predicate instead of re-deriving a regex. A stricter
 * private copy silently disagrees with the parser on the shapes GFM allows.
 */
export function looksLikeTableRow(line: string): boolean {
  return /^\s*\|/.test(line);
}

/**
 * The exact line shape {@link parseAllMarkdownTables} accepts as the separator
 * row. Notably it does **not** require a trailing `|`: `| --- | ---` is a valid
 * GFM separator and this parser accepts it. Exported for the same reason as
 * {@link looksLikeTableRow}.
 */
export function isTableSeparator(line: string): boolean {
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
