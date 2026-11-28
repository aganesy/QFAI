import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../config.js";
import { collectFiles } from "../fs.js";
import { maskNonSpecRegions, parseAllMarkdownTables } from "../specPackParsers.js";
import { readStoryTreeModel, type StoryTreeModel } from "../storyTree/tree.js";
import type { Issue } from "../types.js";
import { maskJsNonCode } from "./jsSourceMask.js";
import type { StoryTestScan } from "./storyTreeObligations.js";
import { issue } from "./utils.js";

const REJECTED_SYNONYM_CODE = "QFAI-STORY-022";
const UNDECLARED_CONTEXT_CODE = "QFAI-STORY-023";

/** The registers that name a rejected option on purpose; they are not read. */
const REGISTER_FILES = new Set(["decisions.md", "open-questions.md"]);

const TEST_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

/**
 * A test-declaring call, with any modifier chain, up to its opening parenthesis. A chain holding
 * `each` is left out: its first call takes the table, and the title belongs to the second.
 */
const TEST_CALL =
  /(?<![\p{L}\p{N}_$.])(describe|it|test|suite)((?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\(/gu;

/** The index of the parenthesis that closes the one at `open`, in text with strings blanked. */
function closingParen(masked: string, open: number): number {
  let depth = 0;
  for (let index = open; index < masked.length; index += 1) {
    const char = masked.charAt(index);
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return masked.length;
}

type Synonym = { word: string; term: string; pattern: RegExp };

type GlossaryRow = { term: string; avoid: string; context: string };

type Glossary = { file: string; rows: GlossaryRow[]; contexts: Set<string> | null };

function wordPattern(word: string, flags: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, flags);
}

/** The section of a Markdown document under the H2 heading named, up to the next H2. */
function section(text: string, heading: string): string | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

function column(headers: string[], name: string): number {
  return headers.findIndex((header) => header.trim().toLowerCase() === name.toLowerCase());
}

/** A cell's plain value: surrounding whitespace and a code span's backticks removed. */
function plain(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^`+|`+$/g, "")
    .trim();
}

function glossaryPath(root: string, config: QfaiConfig): string {
  return path.join(resolvePath(root, config, "specsDir"), "01_policy", "glossary.md");
}

async function readGlossary(root: string, config: QfaiConfig): Promise<Glossary | null> {
  const absolute = glossaryPath(root, config);
  let text: string;
  try {
    text = await readFile(absolute, "utf8");
  } catch (error) {
    // A missing glossary checks nothing; any other read failure is not a clean pass.
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
  const file = path.relative(root, absolute).split(path.sep).join("/");
  const terms = parseAllMarkdownTables(section(text, "Terms") ?? "")[0];
  const rows: GlossaryRow[] = [];
  if (terms) {
    const [term, avoid, context] = ["Term", "Avoid", "Context"].map((name) =>
      column(terms.headers, name),
    );
    for (const row of terms.rows) {
      const cell = (index: number | undefined): string =>
        index === undefined || index < 0 ? "" : plain(row[index]);
      rows.push({ term: cell(term), avoid: cell(avoid), context: cell(context) });
    }
  }
  const contextsBody = section(text, "Contexts");
  let contexts: Set<string> | null = null;
  if (contextsBody !== null) {
    const table = parseAllMarkdownTables(contextsBody)[0];
    const name = table ? column(table.headers, "Name") : -1;
    contexts = new Set((table?.rows ?? []).map((row) => (name < 0 ? "" : plain(row[name]))));
  }
  return { file, rows, contexts };
}

function synonymsOf(glossary: Glossary): Synonym[] {
  const synonyms: Synonym[] = [];
  for (const row of glossary.rows) {
    for (const word of row.avoid.split(",").map((value) => value.trim())) {
      if (word.length === 0 || row.term.length === 0) continue;
      synonyms.push({ word, term: row.term, pattern: wordPattern(word, "giu") });
    }
  }
  return synonyms;
}

/**
 * Where each glossary term occurs in the text, so a rejected word inside the term that is to be
 * used, such as "account" in "account holder", is not reported, while a rejected word that holds
 * a term, such as "end user" beside the term "user", still is.
 */
function termRanges(text: string, terms: RegExp[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const term of terms) {
    for (const match of text.matchAll(term)) {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  return ranges;
}

/** The 1-based line of each offset, from the offsets where lines start. */
function lineOf(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((starts[middle] ?? 0) <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let index = text.indexOf("\n"); index >= 0; index = text.indexOf("\n", index + 1)) {
    starts.push(index + 1);
  }
  return starts;
}

/** Each rejected synonym the text holds, with the line it starts on. */
function synonymHits(
  text: string,
  synonyms: Synonym[],
  terms: RegExp[],
): { line: number; synonym: Synonym }[] {
  const ranges = termRanges(text, terms);
  const starts = lineStarts(text);
  const hits: { line: number; synonym: Synonym }[] = [];
  for (const synonym of synonyms) {
    for (const match of text.matchAll(synonym.pattern)) {
      const from = match.index;
      const to = from + match[0].length;
      if (ranges.some(([termFrom, termTo]) => termFrom <= from && to <= termTo)) continue;
      hits.push({ line: lineOf(starts, from), synonym });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}

function termPatterns(glossary: Glossary): RegExp[] {
  const terms = [...new Set(glossary.rows.map((row) => row.term).filter((term) => term !== ""))];
  return terms.map((term) => wordPattern(term, "giu"));
}

function rejectedSynonym(file: string, line: number, synonym: Synonym, where: string): Issue {
  return issue(
    REJECTED_SYNONYM_CODE,
    `${file}:${line} ${where} "${synonym.word}", which the glossary rejects; use "${synonym.term}"`,
    "error",
    file,
    "storyTree.rejectedSynonym",
    [synonym.word, synonym.term],
    "canonical",
    undefined,
    { loc: { line } },
  );
}

/**
 * Code spans on one line blanked, so an identifier or a quoted path is not read as prose. A span
 * closes at the next run of exactly as many backticks as opened it, so a span opened with two
 * may hold a single one.
 */
function blankCodeSpans(text: string): string {
  return text.replace(/(?<!`)(`+)(?!`)[^\n]*?(?<!`)\1(?!`)/g, (span) => " ".repeat(span.length));
}

/**
 * Reports a word a glossary row lists under Avoid where a story-tree document states it in
 * prose, and a row whose Context the glossary's `## Contexts` table does not declare. The
 * glossary, the registers and the deliberation records are not read for synonyms: they name a
 * rejected word on purpose. Code blocks, code spans and comments are not read either.
 * `validate` passes the story model it has already read; a standalone caller leaves it out.
 */
export async function validateGlossaryTerms(
  root: string,
  config: QfaiConfig,
  model?: StoryTreeModel,
): Promise<Issue[]> {
  const glossary = await readGlossary(root, config);
  if (glossary === null) return [];
  const issues: Issue[] = [];
  for (const row of glossary.rows) {
    if (row.context.length === 0 || glossary.contexts?.has(row.context)) continue;
    issues.push(
      issue(
        UNDECLARED_CONTEXT_CODE,
        `${glossary.file}: the term "${row.term}" names the context "${row.context}", which no row of "## Contexts" declares`,
        "error",
        glossary.file,
        "storyTree.glossaryContext",
        [row.term, row.context],
        "canonical",
      ),
    );
  }
  const synonyms = synonymsOf(glossary);
  if (synonyms.length === 0) return issues;
  const terms = termPatterns(glossary);
  const files = new Set<string>();
  for (const directory of new Set([
    resolvePath(root, config, "specsDir"),
    resolvePath(root, config, "contractsDir"),
  ])) {
    for (const file of await collectFiles(directory, { extensions: [".md"] })) {
      files.add(path.resolve(file));
    }
  }
  const skipped = new Set([
    path.resolve(glossaryPath(root, config)),
    ...(model ?? (await readStoryTreeModel(root, config))).decisionFiles.map((file) =>
      path.resolve(file),
    ),
  ]);
  const deliberation = resolvePath(root, config, "deliberationDir");
  for (const file of [...files].sort()) {
    if (skipped.has(file) || REGISTER_FILES.has(path.basename(file))) continue;
    const fromRecords = path.relative(deliberation, file);
    const outsideRecords =
      fromRecords === ".." ||
      fromRecords.startsWith(`..${path.sep}`) ||
      path.isAbsolute(fromRecords);
    if (!outsideRecords) continue;
    const relative = path.relative(root, file).split(path.sep).join("/");
    const prose = blankCodeSpans(maskNonSpecRegions(await readFile(file, "utf8")));
    for (const hit of synonymHits(prose, synonyms, terms)) {
      issues.push(rejectedSynonym(relative, hit.line, hit.synonym, "states"));
    }
  }
  return issues;
}

/** The index after the whitespace and comments that start at `index`. */
function skipBlank(source: string, index: number): number {
  let at = index;
  for (;;) {
    while (/\s/.test(source.charAt(at))) at += 1;
    if (source.startsWith("/*", at)) {
      const close = source.indexOf("*/", at + 2);
      at = close < 0 ? source.length : close + 2;
    } else if (source.startsWith("//", at)) {
      const close = source.indexOf("\n", at);
      at = close < 0 ? source.length : close + 1;
    } else {
      return at;
    }
  }
}

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  f: "\f",
  v: "\v",
  "0": "\0",
};

/** The character an escape at `index` (just after the backslash) stands for, and its length. */
function escapeAt(source: string, index: number): { value: string; length: number } {
  const char = source.charAt(index);
  const hex = (digits: string): string => String.fromCodePoint(Number.parseInt(digits, 16));
  const unicode = /^u\{([0-9a-fA-F]{1,6})\}|^u([0-9a-fA-F]{4})|^x([0-9a-fA-F]{2})/.exec(
    source.slice(index, index + 9),
  );
  if (unicode)
    return { value: hex(unicode[1] ?? unicode[2] ?? unicode[3] ?? ""), length: unicode[0].length };
  return { value: SIMPLE_ESCAPES[char] ?? char, length: 1 };
}

/**
 * The value of the string literal that opens at `start` and is the whole argument, followed by
 * `,` or `)`, or null for any other argument, an expression that starts with a literal included.
 */
function literalAt(source: string, start: number): string | null {
  const quote = source[start];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let value = "";
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source.charAt(index);
    if (char === "\\") {
      const escaped = escapeAt(source, index + 1);
      value += escaped.value;
      index += escaped.length;
      continue;
    }
    if (char === quote) {
      const after = source.charAt(skipBlank(source, index + 1));
      return after === "," || after === ")" ? value : null;
    }
    if (quote === "`" && char === "$" && source[index + 1] === "{") return null;
    value += char;
  }
  return null;
}

/**
 * Reports a word a glossary row lists under Avoid in the title of a test: the string-literal
 * first argument of a `describe`, `it`, `test` or `suite` call in a JavaScript or TypeScript
 * file of the story-test scan `validate` has already read. Comments, test bodies, a title built
 * with `${}`, an `each` table's titles and other languages are not read. The scan reports its
 * own truncation, so this check adds none.
 */
export async function validateGlossaryTestTitles(
  root: string,
  config: QfaiConfig,
  readStoryTests: () => Promise<StoryTestScan>,
): Promise<Issue[]> {
  const glossary = await readGlossary(root, config);
  const synonyms = glossary === null ? [] : synonymsOf(glossary);
  if (glossary === null || synonyms.length === 0) return [];
  const terms = termPatterns(glossary);
  const issues: Issue[] = [];
  let scan: StoryTestScan;
  try {
    scan = await readStoryTests();
  } catch {
    // The obligations pass reads the same scan and reports its failure as QFAI-SCAN-002.
    return [];
  }
  const files = scan.files
    .filter((entry) => TEST_EXTENSIONS.has(path.extname(entry.file).toLowerCase()))
    .sort((a, b) => a.file.localeCompare(b.file));
  for (const { file, content } of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const masked = maskJsNonCode(content);
    const starts = lineStarts(content);
    // A test's body is not read, so a call there named like a test call is a helper, not a title.
    const bodies: [number, number][] = [];
    for (const call of masked.matchAll(TEST_CALL)) {
      const open = call.index + call[0].length - 1;
      if (bodies.some(([from, to]) => from < call.index && call.index < to)) continue;
      if (call[1] === "it" || call[1] === "test") bodies.push([open, closingParen(masked, open)]);
      if (/\beach\b/.test(call[2] ?? "")) continue;
      // The mask blanks strings and comments alike, so what comes before the title is read from
      // the source, not the masked text.
      const title = literalAt(content, skipBlank(content, call.index + call[0].length));
      if (title === null) continue;
      const line = lineOf(starts, call.index);
      for (const hit of synonymHits(title, synonyms, terms)) {
        issues.push(rejectedSynonym(relative, line, hit.synonym, "names in a test title"));
      }
    }
  }
  return issues;
}
