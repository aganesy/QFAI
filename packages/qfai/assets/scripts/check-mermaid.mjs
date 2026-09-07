/* global console */
/**
 * check-mermaid.mjs
 *
 * Parses every Mermaid diagram embedded in the repository's Markdown and fails
 * on the ones Mermaid itself refuses.
 *
 * Why a dedicated lane rather than a markdownlint rule: markdownlint validates
 * the Markdown AROUND a fenced block and treats the block's body as opaque
 * text, so a diagram that renders as an error box on GitHub passes every
 * Markdown rule there is. The only oracle that answers "does this render" is
 * Mermaid's own grammar, so this lane runs `mermaid.parse()` — the same entry
 * point the renderer calls before it draws — against each block.
 *
 * Mermaid is a browser library, so the parse runs under a jsdom window. That
 * is a real constraint and not a shortcut: `parse()` reaches for `document`
 * while building its diagram registry, and it is the only part of the render
 * path that does not need a layout engine. A headless browser would answer the
 * same question at several hundred times the cost.
 *
 * Fence scanning is CommonMark-shaped rather than a regex over lines. A
 * ```` ```mermaid ```` written INSIDE a wider fence is documentation about
 * Mermaid, not a diagram — the scanner tracks the open fence's character and
 * run length, so a nested block is content and never reaches the parser. That
 * distinction is load-bearing here: the assistant templates document the
 * diagram syntax by showing it.
 *
 * Blocks whose body is a TEMPLATE — a shape an author fills in, carrying
 * `<placeholder>` tokens that no grammar accepts — opt out with an
 * HTML-comment marker on the line above the fence:
 *
 *     <!-- mermaid-lint:ignore -->
 *     ```mermaid
 *     flowchart TD
 *       A[<step>] --> B[<step>]
 *     ```
 *
 * The marker is deliberately per-block and never per-file: a file-level opt-out
 * would silently cover the next diagram somebody adds beneath it.
 *
 * Usage:
 *   node scripts/check-mermaid.mjs            # scan the repository
 *   node scripts/check-mermaid.mjs <paths...> # scan the named files/dirs
 *   node scripts/check-mermaid.mjs --list     # report what would be scanned
 *
 * Exit codes:
 *   0  every diagram parsed (or none was found)
 *   1  at least one diagram failed to parse
 *   2  usage error (unknown flag, unreadable path)
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/**
 * The tree being scanned, and the base every reported path is relative to.
 *
 * `process.cwd()` rather than a path derived from this file: the script ships
 * inside the package, so its own directory is `node_modules/qfai/assets/scripts`
 * in an adopter's checkout and reporting paths relative to THAT would name files
 * nobody can open. The repository is where the command was run.
 */
const SCAN_ROOT = process.cwd();

/**
 * Directory names never descended into.
 *
 * Dependency and build trees carry third-party Markdown whose diagrams are not
 * this repository's to fix, and `tmp/` is the sanctioned scratch area.
 */
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "tmp", "coverage", ".turbo"]);

/** The opt-out marker, recognised on the line directly above an opening fence. */
const IGNORE_MARKER = "<!-- mermaid-lint:ignore -->";

/**
 * A fence opener: up to three leading spaces, then a run of at least three
 * backticks or tildes, then the info string.
 *
 * Four or more leading spaces is an indented code block in CommonMark, which is
 * why the indent is bounded rather than `\s*`.
 */
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\s`]*)/;

/**
 * The info strings whose body is a Mermaid diagram.
 *
 * `mmd` is the file extension Mermaid uses for standalone diagrams and appears
 * as an info string in the wild; both spellings render identically on GitHub.
 */
const MERMAID_LANGS = new Set(["mermaid", "mmd"]);

/**
 * One fenced Mermaid block found in a file.
 *
 * `line` is the 1-based line of the opening fence, which is what an editor
 * jumps to — the parser reports offsets inside `body`, and adding them to a
 * body-relative base would point at the wrong line for any diagram preceded by
 * a directive comment.
 */
/**
 * Extracts the Mermaid blocks from one Markdown document.
 *
 * The scan is linear and stateful: while a fence is open every line is content,
 * including a line that would otherwise open a fence. That is what makes a
 * ```` ```mermaid ```` nested inside a wider fence documentation rather than a
 * diagram, and it is why this is not a regex over the whole file.
 *
 * @param {string} text Markdown source.
 * @returns {{ line: number, body: string, ignored: boolean }[]} Blocks in document order.
 */
export function extractMermaidBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];

  /** @type {{ marker: string, lang: string, line: number, body: string[], ignored: boolean } | null} */
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (open === null) {
      const match = FENCE_OPEN_RE.exec(line);
      if (match === null) {
        continue;
      }
      // The line above decides whether this block is a template. Read here
      // rather than after the block closes: by then the index has moved past it.
      const previous = i > 0 ? lines[i - 1].trim() : "";
      open = {
        marker: match[1],
        lang: match[2].toLowerCase(),
        line: i + 1,
        body: [],
        ignored: previous === IGNORE_MARKER,
      };
      continue;
    }

    // A closing fence is the same character, at least as long as the opener,
    // and carries no info string. A SHORTER run of the same character is
    // content — that is how a ```` ``` ```` inside a ```` ```` ```` block stays
    // part of the diagram rather than ending it.
    const closer = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
    if (
      closer !== null &&
      closer[1][0] === open.marker[0] &&
      closer[1].length >= open.marker.length
    ) {
      if (MERMAID_LANGS.has(open.lang)) {
        blocks.push({ line: open.line, body: open.body.join("\n"), ignored: open.ignored });
      }
      open = null;
      continue;
    }

    open.body.push(line);
  }

  // An unterminated fence runs to end of document, which is what CommonMark
  // says and what GitHub renders. Dropping it would hide a real diagram.
  if (open !== null && MERMAID_LANGS.has(open.lang)) {
    blocks.push({ line: open.line, body: open.body.join("\n"), ignored: open.ignored });
  }

  return blocks;
}

/**
 * Collects Markdown files under one path, which may be a file or a directory.
 *
 * @param {string} target Absolute path.
 * @returns {Promise<string[]>} Absolute paths to Markdown files.
 */
async function collectMarkdown(target) {
  const entry = await stat(target);
  if (!entry.isDirectory()) {
    return target.toLowerCase().endsWith(".md") ? [target] : [];
  }

  const found = [];
  const pending = [target];
  while (pending.length > 0) {
    const dir = pending.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // A directory that vanished or cannot be read is not a diagram failure.
      continue;
    }
    for (const child of entries) {
      if (child.isDirectory()) {
        if (!SKIP_DIRS.has(child.name)) {
          pending.push(path.join(dir, child.name));
        }
        continue;
      }
      if (child.isFile() && child.name.toLowerCase().endsWith(".md")) {
        found.push(path.join(dir, child.name));
      }
    }
  }
  return found.sort();
}

/**
 * Boots Mermaid against a jsdom window.
 *
 * The globals are assigned before `mermaid` is imported: the module reads
 * `document` while registering its diagram types, so an import that runs first
 * throws at load rather than at parse.
 *
 * @returns {Promise<(diagram: string) => Promise<void>>} A parse function that rejects on invalid input.
 */
async function bootMermaid() {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  for (const name of [
    "Node",
    "Element",
    "HTMLElement",
    "SVGElement",
    "DOMParser",
    "XMLSerializer",
    "MutationObserver",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ]) {
    if (globalThis[name] === undefined && dom.window[name] !== undefined) {
      globalThis[name] = dom.window[name];
    }
  }

  const mermaid = (await import("mermaid")).default;
  // `startOnLoad: false` keeps the module from scanning the jsdom document for
  // diagrams to render; `strict` is the shipping default and is stated rather
  // than inherited so a Mermaid default change cannot loosen what CI accepts.
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
  return (diagram) => mermaid.parse(diagram);
}

/**
 * The first line of a Mermaid parse error, which is the part that names the
 * problem; the rest is an ASCII pointer diagram that is unreadable once the
 * surrounding source is gone.
 *
 * @param {unknown} error
 * @returns {string}
 */
function describeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const [first] = message.split("\n");
  return first.trim() === "" ? message.trim() : first.trim();
}

export async function main() {
  const argv = process.argv.slice(2);
  const listOnly = argv.includes("--list");
  const targets = argv.filter((arg) => arg !== "--list");

  const unknownFlag = targets.find((arg) => arg.startsWith("-"));
  if (unknownFlag !== undefined) {
    console.error(`check-mermaid: unknown flag ${unknownFlag}`);
    return 2;
  }

  const roots = targets.length > 0 ? targets : [SCAN_ROOT];
  const files = [];
  for (const root of roots) {
    const absolute = path.resolve(SCAN_ROOT, root);
    try {
      files.push(...(await collectMarkdown(absolute)));
    } catch (error) {
      console.error(`check-mermaid: cannot read ${root}: ${describeError(error)}`);
      return 2;
    }
  }

  // One file named twice on the command line is scanned once: a duplicated
  // failure reads as two broken diagrams.
  const unique = [...new Set(files)].sort();

  /** @type {{ file: string, line: number, body: string }[]} */
  const diagrams = [];
  for (const file of unique) {
    let text;
    try {
      text = await readFile(file, "utf-8");
    } catch (error) {
      console.error(
        `check-mermaid: cannot read ${path.relative(SCAN_ROOT, file)}: ${describeError(error)}`,
      );
      return 2;
    }
    for (const block of extractMermaidBlocks(text)) {
      if (block.ignored) {
        continue;
      }
      diagrams.push({ file, line: block.line, body: block.body });
    }
  }

  if (listOnly) {
    for (const diagram of diagrams) {
      console.log(`${path.relative(SCAN_ROOT, diagram.file)}:${diagram.line}`);
    }
    console.log(`check-mermaid: ${diagrams.length} diagram(s) in ${unique.length} file(s).`);
    return 0;
  }

  if (diagrams.length === 0) {
    console.log("check-mermaid: no Mermaid diagrams found.");
    return 0;
  }

  let parse;
  try {
    parse = await bootMermaid();
  } catch (error) {
    // A toolchain that cannot boot must not report a green lane: it established
    // nothing about the diagrams it never read.
    console.error(`check-mermaid: cannot start Mermaid: ${describeError(error)}`);
    return 2;
  }

  const failures = [];
  for (const diagram of diagrams) {
    try {
      await parse(diagram.body);
    } catch (error) {
      failures.push({ ...diagram, reason: describeError(error) });
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`${path.relative(SCAN_ROOT, failure.file)}:${failure.line}: ${failure.reason}`);
    }
    console.error(
      `check-mermaid: ${failures.length} of ${diagrams.length} diagram(s) failed to parse.`,
    );
    return 1;
  }

  console.log(`check-mermaid: ${diagrams.length} diagram(s) parsed in ${unique.length} file(s).`);
  return 0;
}

/**
 * Run only when invoked as a program.
 *
 * The two pure helpers above are imported by the guard's own tests, and an
 * unguarded top-level `process.exit` turns that import into a process exit
 * during test collection.
 */
function isEntrypoint() {
  const invoked = process.argv[1];
  if (invoked === undefined) {
    return false;
  }
  return path.resolve(invoked) === fileURLToPath(import.meta.url);
}

if (isEntrypoint()) {
  process.exit(await main());
}
