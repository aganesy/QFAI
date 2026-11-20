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
 *   node scripts/check-mermaid.mjs --tools <dir> [<paths...>]
 *                                             # take Mermaid and jsdom from <dir>/node_modules first
 *
 * Exit codes:
 *   0  every diagram parsed (or none was found)
 *   1  at least one diagram failed to parse
 *   2  usage error (unknown flag, unreadable path)
 */
import { realpathSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

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

/**
 * The file extensions read as Markdown, compared without regard to case.
 *
 * The shipped document lane runs for a change to any of these, so a file the
 * scan skipped would pass the very check its change triggered. Exported so a
 * test can hold this set to the extensions that lane's change scope matches.
 */
export const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mdx"];

/**
 * Whether a file name carries one of the Markdown extensions.
 *
 * @param {string} name File name or path.
 * @returns {boolean}
 */
function isMarkdownFile(name) {
  // A suffix test rather than `path.extname`, which is empty for a file named
  // `.md` itself — a name the lane's `*.md` pattern matches.
  const lower = name.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** The opt-out marker, recognised on the line directly above an opening fence. */
const IGNORE_MARKER = "<!-- mermaid-lint:ignore -->";

/**
 * A fence opener: up to three leading spaces, then a run of at least three
 * backticks or tildes, then the info string.
 *
 * Four or more leading spaces is an indented code block in CommonMark, which is
 * why the indent is bounded rather than `\s*`. The info string after a backtick
 * run may not hold a backtick (CommonMark 4.5): a line like ```` ```x``` ```` is
 * an inline code span, and {@link fenceOpener} refuses it.
 */
const FENCE_OPEN_RE = /^( {0,3})(`{3,}|~{3,})(.*)$/;

/** A closing fence: the opener's character, no info string. */
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

/** A block quote marker with its optional following space (CommonMark 5.1). */
const QUOTE_RE = /^ {0,3}> ?/;

/**
 * A list item marker (CommonMark 5.2): up to three spaces, a bullet or an
 * ordered number, then the spaces before the content, or the end of the line.
 */
const LIST_ITEM_RE = /^( {0,3})([-+*]|\d{1,9}[.)])( +|$)/;

/** A thematic break, which wins over a list item when both could match. */
const THEMATIC_BREAK_RE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;

/**
 * Expands the tabs in a line's leading container and indentation region to
 * spaces at four-column stops, so every indent below is counted in columns.
 *
 * Shortcut: a tab after the first character outside that region is left as it
 * is, and a tab is never split across a container boundary the way CommonMark's
 * partial-tab rule does. That is exact for every prefix made of spaces, `>` and
 * list markers; lift it if a document relies on a tab inside a list marker's
 * spacing changing whether a fence is seen.
 *
 * @param {string} line
 * @returns {string}
 */
function expandLeadingTabs(line) {
  const region = /^[ \t>\-+*0-9.)]*/.exec(line)[0];
  if (!region.includes("\t")) {
    return line;
  }
  let expanded = "";
  for (const char of region) {
    expanded += char === "\t" ? " ".repeat(4 - (expanded.length % 4)) : char;
  }
  return expanded + line.slice(region.length);
}

/**
 * The leading-space count of a line.
 *
 * @param {string} line
 * @returns {number}
 */
function indentOf(line) {
  return /^ */.exec(line)[0].length;
}

/**
 * Reads a line, already inside its containers, as a fence opener.
 *
 * @param {string} content
 * @returns {{ indent: number, marker: string, lang: string } | null}
 */
function fenceOpener(content) {
  const match = FENCE_OPEN_RE.exec(content);
  if (match === null) {
    return null;
  }
  const [, indent, marker, info] = match;
  if (marker[0] === "`" && info.includes("`")) {
    return null;
  }
  const [lang = ""] = info.trim().split(/\s+/);
  return { indent: indent.length, marker, lang: lang.toLowerCase() };
}

/**
 * Strips the prefixes of the containers a line continues, outermost first.
 *
 * A block quote continues on a line carrying its `>`. A list item continues on a
 * blank line and on a line indented at least to its content. The first container
 * the line does not continue ends there, with every container inside it.
 *
 * Shortcut: lazy continuation (CommonMark 5.1 and 5.2) is not modelled, so a
 * paragraph line that drops its `>` ends the quote here one line early. A lazy
 * line can neither open nor continue a fence, so which fences are found does
 * not change; lift it if this scanner ever reads paragraphs.
 *
 * @param {string} line
 * @param {({ kind: "quote" } | { kind: "item", indent: number })[]} containers
 * @returns {{ matched: number, content: string }}
 */
function continueContainers(line, containers) {
  let content = line;
  let matched = 0;
  for (const container of containers) {
    if (container.kind === "quote") {
      const quote = QUOTE_RE.exec(content);
      if (quote === null) {
        break;
      }
      content = content.slice(quote[0].length);
    } else if (content.trim() === "") {
      content = "";
    } else if (indentOf(content) >= container.indent) {
      content = content.slice(container.indent);
    } else {
      break;
    }
    matched++;
  }
  return { matched, content };
}

/**
 * Opens every container that starts on a line, innermost last, and returns what
 * is left of the line inside them.
 *
 * A list item's content starts after the marker and one to four spaces; five or
 * more begin indented code, so the content starts one column after the marker,
 * as it does for a marker alone on its line (CommonMark 5.2).
 *
 * @param {string} content
 * @param {({ kind: "quote" } | { kind: "item", indent: number })[]} containers Appended to.
 * @returns {string}
 */
function openContainers(content, containers) {
  let rest = content;
  for (;;) {
    const quote = QUOTE_RE.exec(rest);
    if (quote !== null) {
      containers.push({ kind: "quote" });
      rest = rest.slice(quote[0].length);
      continue;
    }
    const item = THEMATIC_BREAK_RE.test(rest) ? null : LIST_ITEM_RE.exec(rest);
    if (item === null) {
      return rest;
    }
    const [whole, lead, marker, spacing] = item;
    const gap = spacing.length === 0 || spacing.length > 4 ? 1 : spacing.length;
    const indent = lead.length + marker.length + gap;
    containers.push({ kind: "item", indent });
    rest = whole.length === rest.length ? "" : rest.slice(indent);
  }
}

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
 * Each line is first read through the block quotes and list items it sits in,
 * so a fence inside a container is found, its body loses the container's
 * prefix, and it ends where its container ends (CommonMark 4.5, 5.1, 5.2).
 *
 * @param {string} text Markdown source.
 * @returns {{ line: number, body: string, ignored: boolean }[]} Blocks in document order.
 */
export function extractMermaidBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];

  /** @type {({ kind: "quote" } | { kind: "item", indent: number })[]} */
  let containers = [];
  /** @type {{ marker: string, indent: number, depth: number, lang: string, line: number, body: string[], ignored: boolean } | null} */
  let open = null;
  // The line above, read inside its own containers, decides whether the next
  // fence is a template: `> <!-- mermaid-lint:ignore -->` covers `> ```mermaid`.
  let previous = "";

  const finish = () => {
    if (open !== null && MERMAID_LANGS.has(open.lang)) {
      blocks.push({ line: open.line, body: open.body.join("\n"), ignored: open.ignored });
    }
    open = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = expandLeadingTabs(lines[i]);
    const { matched, content } = continueContainers(line, containers);

    if (open !== null && matched >= open.depth) {
      // A closing fence is the same character, at least as long as the opener,
      // and carries no info string. A SHORTER run of the same character is
      // content — that is how a ```` ``` ```` inside a ```` ```` ```` block
      // stays part of the diagram rather than ending it.
      const closer = FENCE_CLOSE_RE.exec(content);
      if (
        closer !== null &&
        closer[1][0] === open.marker[0] &&
        closer[1].length >= open.marker.length
      ) {
        finish();
      } else {
        // The opener's own indent is removed from each body line, up to its width.
        open.body.push(content.slice(Math.min(open.indent, indentOf(content))));
      }
      previous = content;
      continue;
    }

    // The fence's container ended on this line, so the fence ended with it,
    // and the line itself is read afresh below.
    finish();
    containers = containers.slice(0, matched);
    const rest = openContainers(content, containers);
    const opener = fenceOpener(rest);
    if (opener !== null) {
      open = {
        ...opener,
        depth: containers.length,
        line: i + 1,
        body: [],
        ignored: previous.trim() === IGNORE_MARKER,
      };
    }
    previous = rest;
  }

  // An unterminated fence runs to end of document, which is what CommonMark
  // says and what GitHub renders. Dropping it would hide a real diagram.
  finish();

  return blocks;
}

/**
 * Whether a directory is a checkout of its own: a git worktree or a nested
 * clone, marked by a `.git` file or directory at its root.
 *
 * Its diagrams belong to another branch, so reading them here would report
 * that branch's findings against this tree, locally and never in a fresh CI
 * clone. The scan root itself is not asked.
 *
 * @param {string} dir Absolute path of a directory below the scan root.
 * @returns {Promise<boolean>}
 */
async function isOtherCheckout(dir) {
  try {
    await stat(path.join(dir, ".git"));
    return true;
  } catch {
    return false;
  }
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
    return isMarkdownFile(target) ? [target] : [];
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
    // Another repository checked out inside this one — a clone, a submodule, or a
    // git worktree, which carries `.git` as a file rather than a directory. Its
    // documents belong to whatever is checked out there, so a finding from one
    // names a path this tree does not own, and the same commit passes wherever no
    // such directory happens to exist. The scan starts at `target`, which has a
    // `.git` of its own whenever the tree is a repository at all.
    if (dir !== target && entries.some((child) => child.name === ".git")) {
      continue;
    }
    for (const child of entries) {
      if (child.isDirectory()) {
        const childPath = path.join(dir, child.name);
        if (!SKIP_DIRS.has(child.name) && !(await isOtherCheckout(childPath))) {
          pending.push(childPath);
        }
        continue;
      }
      if (child.isFile() && isMarkdownFile(child.name)) {
        found.push(path.join(dir, child.name));
      }
    }
  }
  return found.sort();
}

/**
 * Imports a package from the tools directory when one is named and holds it,
 * and the way this script always resolved it otherwise.
 *
 * The shipped document lane installs Mermaid and jsdom into a directory of its
 * own, because npm cannot install into a `node_modules` that a different
 * package manager laid out. A bare `import()` looks from this file's location,
 * which is inside the project's tree, so the directory is named explicitly.
 * Resolution goes through `createRequire`, which takes the `default` condition
 * of a package's exports, as Mermaid's own entry declares. It also walks every
 * ancestor `node_modules`, so a result outside the named directory's own
 * `node_modules` is not accepted: a project's unpinned copy must not stand in
 * for the pinned one.
 *
 * @param {string} name
 * @param {string | null} tools
 * @returns {Promise<Record<string, unknown>>}
 */
async function importTool(name, tools) {
  if (tools !== null) {
    let resolved = null;
    try {
      // `resolve` returns real paths, so the directory it is compared with is one too.
      const own = path.join(realpathSync(tools), "node_modules") + path.sep;
      const found = createRequire(path.join(tools, "noop.cjs")).resolve(name);
      resolved = found.startsWith(own) ? found : null;
    } catch {
      // Not installed there: resolve it the way this script always did.
    }
    if (resolved !== null) {
      return import(pathToFileURL(resolved).href);
    }
  }
  return import(name);
}

/**
 * Boots Mermaid against a jsdom window.
 *
 * The globals are assigned before `mermaid` is imported: the module reads
 * `document` while registering its diagram types, so an import that runs first
 * throws at load rather than at parse.
 *
 * @param {string | null} tools Directory whose `node_modules` is searched first.
 * @returns {Promise<(diagram: string) => Promise<void>>} A parse function that rejects on invalid input.
 */
async function bootMermaid(tools) {
  const { JSDOM } = await importTool("jsdom", tools);
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

  const mermaid = (await importTool("mermaid", tools)).default;
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
  const toolsAt = argv.indexOf("--tools");
  const toolsValue = toolsAt === -1 ? null : (argv[toolsAt + 1] ?? "");
  if (toolsValue === "" || toolsValue?.startsWith("-")) {
    console.error("check-mermaid: --tools needs a directory");
    return 2;
  }
  const tools = toolsValue === null ? null : path.resolve(toolsValue);
  const targets = argv.filter(
    (arg, index) =>
      arg !== "--list" && index !== toolsAt && (toolsAt === -1 || index !== toolsAt + 1),
  );

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
    parse = await bootMermaid(tools);
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
