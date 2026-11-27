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
  /(?<![\p{L}\p{N}_$.])(?:describe|it|test|suite)((?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\(/gu;

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
 * The text with every glossary term blanked, so a rejected word inside the term that is to be
 * used, such as "account" in "account holder", is not reported.
 */
function blankTerms(text: string, terms: RegExp[]): string {
  let out = text;
  for (const term of terms) {
    out = out.replace(term, (match) => match.replace(/[^\n]/g, " "));
  }
  return out;
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
  const searched = blankTerms(text, terms);
  const starts = lineStarts(searched);
  const hits: { line: number; synonym: Synonym }[] = [];
  for (const synonym of synonyms) {
    for (const match of searched.matchAll(synonym.pattern)) {
      hits.push({ line: lineOf(starts, match.index), synonym });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}

function termPatterns(glossary: Glossary): RegExp[] {
  const terms = [...new Set(glossary.rows.map((row) => row.term).filter((term) => term !== ""))];
  // Longer terms first, so "account holder" is blanked before "account" could be.
  return terms.sort((a, b) => b.length - a.length).map((term) => wordPattern(term, "giu"));
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

/** Code spans blanked, so an identifier or a quoted path is not read as prose. */
function blankCodeSpans(text: string): string {
  return text.replace(/(`+)[^`\n]*?\1/g, (span) => " ".repeat(span.length));
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
    if (!fromRecords.startsWith("..") && !path.isAbsolute(fromRecords)) continue;
    const relative = path.relative(root, file).split(path.sep).join("/");
    const prose = blankCodeSpans(maskNonSpecRegions(await readFile(file, "utf8")));
    for (const hit of synonymHits(prose, synonyms, terms)) {
      issues.push(rejectedSynonym(relative, hit.line, hit.synonym, "states"));
    }
  }
  return issues;
}

/** The string literal that opens at `start`, or null for any other argument. */
function literalAt(source: string, start: number): string | null {
  const quote = source[start];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let value = "";
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source.charAt(index);
    if (char === "\\") {
      value += source.charAt(index + 1);
      index += 1;
      continue;
    }
    if (char === quote) return value;
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
  const files = (await readStoryTests()).files
    .filter((entry) => TEST_EXTENSIONS.has(path.extname(entry.file).toLowerCase()))
    .sort((a, b) => a.file.localeCompare(b.file));
  for (const { file, content } of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const masked = maskJsNonCode(content);
    const starts = lineStarts(content);
    for (const call of masked.matchAll(TEST_CALL)) {
      if (/\beach\b/.test(call[1] ?? "")) continue;
      // The mask blanks a string to spaces, so the whitespace before the title is read from
      // the source, not the masked text.
      let start = call.index + call[0].length;
      while (/\s/.test(content[start] ?? "")) start += 1;
      const title = literalAt(content, start);
      if (title === null) continue;
      const line = lineOf(starts, call.index);
      for (const hit of synonymHits(title, synonyms, terms)) {
        issues.push(rejectedSynonym(relative, line, hit.synonym, "names in a test title"));
      }
    }
  }
  return issues;
}
