export type MarkdownTable = {
  headers: string[];
  rows: string[][];
};

/** A fenced code block opener, per CommonMark (0-3 leading spaces). */
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * A fenced code block **closer**: the marker and nothing but whitespace after
 * it.
 *
 * CommonMark allows an info string only on the opener, so a line such as
 * ` ```js ` inside an open block is content, not a delimiter. Closing on
 * {@link FENCE_LINE} ended the block there and handed the rest of the sample
 * back to the validators as document text — which is how a `- Re-opened by:
 * DR-*` written inside a fenced example counted as a live back-reference and
 * cleared `QFAI-DECISION-004` / `-006` while the real candidate carried none.
 */
const FENCE_CLOSE_LINE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

/**
 * Removes the HTML-comment regions of a single line.
 *
 * Returns the visible remainder plus whether a comment is still open at the end
 * of the line, so the caller can carry the state across lines.
 *
 * Exported so every reader that has to tell a document's own text from a
 * commented-out sample carries the state the same way — a second, private copy
 * of this loop is how one reader ends up parsing what another one hides.
 *
 * `closesLater` says whether a `-->` appears on a later line. Without one, a
 * `<!--` that does not close on its own line is literal text, as CommonMark
 * reads an inline comment that never ends: a table cell holding `<!-- or //`
 * would otherwise hide every row and heading below it.
 */
export function maskLineComments(
  line: string,
  inComment: boolean,
  closesLater: boolean,
): { text: string; open: boolean } {
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
    // A backtick run opens a code span, and a `<!--` inside one is text the
    // document shows rather than a comment hiding everything after it. The run
    // closes on a run of the same length; an unclosed one is not a span at all,
    // so the backticks are literal and the scan carries on just past them.
    //
    // SIMPLIFIED: a closing run is taken as the first run of that length,
    // without CommonMark's rule that it be exactly that length.
    // Lift when: a document writes ``` `` `` ``` around a span holding a
    // shorter run, which none in this tree does.
    const tick = line.indexOf("`", index);
    const start = line.indexOf("<!--", index);
    if (start === -1 && tick === -1) {
      visible += line.slice(index);
      break;
    }
    if (tick !== -1 && (start === -1 || tick < start)) {
      const run = /^`+/.exec(line.slice(tick))?.[0] ?? "`";
      const close = line.indexOf(run, tick + run.length);
      const end = close === -1 ? tick + run.length : close + run.length;
      visible += line.slice(index, end);
      index = end;
      continue;
    }
    if (start === -1) {
      visible += line.slice(index);
      break;
    }
    if (!closesLater && !line.includes("-->", start + 4)) {
      visible += line.slice(index, start + 4);
      index = start + 4;
      continue;
    }
    visible += line.slice(index, start);
    index = start + 4;
    open = true;
  }
  return { text: visible, open };
}

/** Start of a CommonMark type-2 HTML block: a comment opening the line. */
const COMMENT_BLOCK_START = /^ {0,3}<!--/;

/** A top-level indented code block: four spaces or a tab, per CommonMark. */
const INDENTED_CODE_LINE = /^(?: {4}|\t)/;

/** A list item marker, which makes the indentation below it continuation. */
const LIST_ITEM_LINE = /^\s*(?:[-*+]|\d+[.)])\s/;

/**
 * The CommonMark raw HTML blocks that run to an end marker regardless of blank
 * lines, in the order CommonMark tries them. The end marker may sit on the
 * opening line, which then closes the block by itself.
 *
 * - Type 1: `<pre>`, `<script>`, `<style>` and `<textarea>`, whose contents are
 *   never parsed as Markdown, to any of the four closing tags.
 * - Type 3: a processing instruction, `<?` to `?>`.
 * - Type 4: a declaration, `<!` and an ASCII letter, to `>`.
 * - Type 5: a CDATA section, `<![CDATA[` to `]]>`.
 *
 * Type 2, the comment, is carried by {@link maskLineComments} instead.
 */
const END_TERMINATED_HTML_BLOCKS: readonly { start: RegExp; end: RegExp }[] = [
  {
    start: /^ {0,3}<(?:pre|script|style|textarea)(?=[\s/>]|$)/i,
    end: /<\/(?:pre|script|style|textarea)>/i,
  },
  { start: /^ {0,3}<\?/, end: /\?>/ },
  { start: /^ {0,3}<![A-Za-z]/, end: />/ },
  { start: /^ {0,3}<!\[CDATA\[/, end: /\]\]>/ },
];

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

/** A CommonMark attribute: a name and an optional unquoted or quoted value. */
const HTML_ATTRIBUTE = String.raw`\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:[^\s"'=<>\x60]+|'[^']*'|"[^"]*"))?`;

/** A CommonMark tag name, other than the four type-1 names. */
const SINGLE_TAG_NAME = String.raw`(?!(?:pre|script|style|textarea)(?![A-Za-z0-9-]))[A-Za-z][A-Za-z0-9-]*`;

/**
 * Start of a CommonMark type-7 raw HTML block: a line holding nothing but one
 * complete open or closing tag of any name, a custom element such as
 * `<review-note>` included. Like type 6 it runs to the next blank line, but
 * unlike type 6 it cannot interrupt a paragraph.
 */
const SINGLE_TAG_HTML_START = new RegExp(
  String.raw`^ {0,3}(?:<${SINGLE_TAG_NAME}(?:${HTML_ATTRIBUTE})*\s*/?>|</${SINGLE_TAG_NAME}\s*>)\s*$`,
  "i",
);

/**
 * A visible line that leaves no paragraph open behind it: an ATX heading, a
 * setext underline or a thematic break.
 */
const NON_PARAGRAPH_LINE = /^ {0,3}(?:#{1,6}(?:[ \t]|$)|=+[ \t]*$|-+[ \t]*$|(?:[-*_][ \t]*){3,}$)/;

/**
 * For each line, whether a later line of the same paragraph holds `-->`. A
 * blank line, a heading, a setext underline or thematic break, and a fence
 * marker each end a paragraph, so an inline comment cannot reach past one.
 */
function paragraphClosers(lines: readonly string[]): boolean[] {
  const ahead: boolean[] = new Array<boolean>(lines.length).fill(false);
  let closer = false;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    ahead[index] = closer;
    const line = lines[index] ?? "";
    if (line.trim().length === 0 || NON_PARAGRAPH_LINE.test(line) || FENCE_LINE.test(line)) {
      closer = false;
    } else if (line.includes("-->")) {
      closer = true;
    }
  }
  return ahead;
}

/**
 * Blanks the regions of a spec document that are not the spec, preserving line
 * count: fenced code blocks, HTML comments, raw HTML blocks, and top-level
 * indented code blocks.
 *
 * These documents often illustrate their own format. Without this, an
 * illustrative `## Test Case Table` plus `TC-ID` table inside one is selected as
 * the named section and its example IDs are handed to the validators and the
 * report — and for a heading-less document it flips a previously correct
 * resolution into a wrong one, because the hidden sample outranks the real
 * table.
 *
 * Fence state wins over comment state: `<!--` inside a fenced sample is sample
 * text, not a comment opener, so an unclosed one cannot swallow the rest of the
 * document. Comments are stripped before the fence check on a line, so a fence
 * marker that only appears inside a comment does not open a block either.
 *
 * **A comment that opens a line is an HTML block**, as CommonMark reads it:
 * every line through the one holding `-->` is blanked whole, and with no `-->`
 * it runs to the end of the document. A `<!--` after the block's `-->` on that
 * line is raw block text and opens nothing. **One opened inside a line is
 * inline:** only the comment is removed and the text after its `-->` stays. It
 * cannot outlive its paragraph, so a `<!--` whose `-->` does not follow before
 * the next blank line, heading, thematic break or fence is literal text.
 *
 * SIMPLIFIED: an inline comment runs across table rows, although GFM parses
 * each row on its own and shows a comment split over two rows as text; the
 * row it closes in keeps only the text after its `-->`. And text after an
 * inline `-->` that would read as a heading or thematic break is blanked
 * rather than kept as paragraph text.
 * Lift when: a document needs a table cell's comment shown as text, or reads
 * an ID from text after an inline comment's `-->`, which none in this tree does.
 *
 * **Raw HTML blocks are blanked too**, all seven CommonMark types. A `<pre>`, a
 * CDATA section, a `<div>` or a custom element such as `<review-note>` holds
 * literal text, so a `## Risks` line inside one is not a heading and a
 * `| TC-ID |` row inside one is not a table row — reading either as spec
 * content lets a document satisfy a gate with markup it never wrote.
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
  // Whether the open comment opened a line, and so is an HTML block.
  let inBlockComment = false;
  // Per line, whether a `-->` follows on a later line of the same paragraph:
  // the closer an inline comment opened on that line can still reach.
  const closerAhead = paragraphClosers(lines);
  let inIndentedCode = false;
  let rawHtmlEnd: RegExp | null = null;
  let inBlankTerminatedHtml = false;
  let listOpen = false;
  let prevBlank = true;
  // Whether the line before is visible paragraph text, which a type-7 block
  // cannot interrupt.
  //
  // SIMPLIFIED: every visible line other than a heading, a setext underline or
  // a thematic break counts as paragraph text, a table row included.
  // Lift when: a document opens a custom-element block straight under a table
  // row and needs it blanked, which none in this tree does.
  let paragraphOpen = false;

  const maskLine = (line: string, index: number): string => {
    if (open !== null) {
      const closing = FENCE_CLOSE_LINE.exec(line)?.[1];
      if (closing && closing.charAt(0) === open.marker && closing.length >= open.length) {
        open = null;
      }
      return "";
    }

    if (rawHtmlEnd !== null) {
      // The line holding the end marker belongs to the block, so it is
      // blanked as well.
      if (rawHtmlEnd.test(line)) {
        rawHtmlEnd = null;
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

    // The fence opener is read before the comment scan, because a `<!--` in
    // an info string labels the sample rather than opening a comment. Only
    // when a comment is already open does the scan come first: a fence marker
    // inside one is comment text.
    if (!inComment) {
      const opener = FENCE_LINE.exec(line)?.[1];
      if (opener) {
        open = { marker: opener.charAt(0), length: opener.length };
        return "";
      }
    }

    // A comment that opens a line is a CommonMark HTML block, which runs to the
    // end of the document when nothing closes it; only a comment opened inside
    // a line needs a later `-->` to be one.
    const blockStart = !inComment && COMMENT_BLOCK_START.test(line);
    const masked = maskLineComments(line, inComment, blockStart || closerAhead[index] === true);
    const inInlineComment = inComment && !inBlockComment;
    // A line that opens with a comment, or that a comment opened at the start
    // of a line runs into, is comment through its end: CommonMark makes it an
    // HTML block up to the line holding `-->`. Stripping the comment alone
    // would hand back what follows it at the start of a line, so
    // `<!-- note --> ## Risks` would read as a heading and a ```` ``` ````
    // after a closing `-->` as a fence that hides the rest of the document.
    const commentLine = blockStart || (inComment && inBlockComment);
    // A comment block ends on the line holding its `-->`, so a `<!--` after
    // that on the same line is raw block text and leaves nothing open.
    const blockEnds = commentLine && line.includes("-->");
    inComment = masked.open && !blockEnds;
    inBlockComment = inComment && commentLine;
    if (commentLine) {
      return "";
    }
    if (inInlineComment) {
      // A comment opened inside a line ends inside one, so what follows its
      // `-->` continues that paragraph or table row and cannot open a block.
      // Blanking it whole cut a table at the row a cell's comment closed in.
      return NON_PARAGRAPH_LINE.test(masked.text) ? "" : masked.text;
    }

    const fence = FENCE_LINE.exec(masked.text)?.[1];
    if (fence) {
      open = { marker: fence.charAt(0), length: fence.length };
      return "";
    }

    const block = END_TERMINATED_HTML_BLOCKS.find(({ start }) => start.test(masked.text));
    if (block) {
      // A one-line `<pre>…</pre>` or `<!DOCTYPE html>` opens and closes on
      // the same line.
      rawHtmlEnd = block.end.test(masked.text) ? null : block.end;
      return "";
    }

    // Checked after types 1 to 5, which win where they overlap, and after
    // the fence check, so `<div>` inside a fenced sample is sample text.
    if (
      BLANK_TERMINATED_HTML_START.test(masked.text) ||
      (!paragraphOpen && SINGLE_TAG_HTML_START.test(masked.text))
    ) {
      inBlankTerminatedHtml = true;
      return "";
    }
    return masked.text;
  };

  return lines
    .map((line, index) => {
      const visibleLine = maskLine(line, index);
      paragraphOpen = visibleLine.trim().length > 0 && !NON_PARAGRAPH_LINE.test(visibleLine);
      return visibleLine;
    })
    .join("\n");
}

/**
 * Parse every markdown table in the input. Returned in document order.
 * Used by Triage validators so a multi-table
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

/** The tables Markdown renders, so a sample in a fence or comment declares nothing. */
export function parseRenderedMarkdownTables(text: string): MarkdownTable[] {
  return parseAllMarkdownTables(maskNonSpecRegions(text));
}

/**
 * Encode one value for a GFM table cell — the inverse of
 * {@link splitMarkdownRow}, and the only correct way to put author-supplied
 * text into a table.
 *
 * It lives here, beside its decoder, and is exported: a skill that instructs
 * an author to write command output into a ledger cell needs an encoder to
 * point at, and a grep of the entire shipped `.qfai/assistant/` tree for
 * `escape`, `backslash` or `vertical bar` finds no other one. Two ways to
 * break a table, no published rule for either.
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
 *   identity tests in `tests/core/specPackParsers.test.ts` (under
 *   `describe("escapeTableCell ↔ splitMarkdownRow round-trip identity")`)
 *   MUST be extended with the new character class.
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

/**
 * Strip the outer delimiters of a row. A trailing `|` that a backslash
 * precedes is the escaped literal ending the last cell, not a delimiter, so it
 * stays for the decoder.
 */
function trimEdgePipes(value: string): string {
  let inner = value.replace(/^\|+/, "");
  while (inner.endsWith("|") && !inner.endsWith("\\|")) {
    inner = inner.slice(0, -1);
  }
  return inner;
}
