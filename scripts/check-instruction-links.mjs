/**
 * A relative Markdown link under `.instruction/` whose target does not exist.
 *
 * The tree cites rule masters, shipped templates, sources and tests by relative link. When the
 * file a link names is deleted or moved, nothing else reads the link, so it stays broken until a
 * reviewer follows it. This check reads every Markdown file under `.instruction/` and resolves
 * each relative link against the linking file's directory.
 *
 * A link counts when it is an inline link or image, `[text](target)`, or a reference definition,
 * `[label]: target`, outside a fenced code block and outside an inline code span. A target with a
 * URL scheme and a same-file `#fragment` are skipped. The `#fragment` of a cross-file link is
 * dropped: only the file is checked, not the heading. A target that resolves outside the
 * repository counts as broken.
 *
 * Usage:
 *   node scripts/check-instruction-links.mjs
 *
 * Exit codes: 0 clean, 1 a broken link, 2 the tree or a file in it could not be read.
 */
/* global console */
import { existsSync, lstatSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { readBoundedText } from "./lib/bounded-read.mjs";

/** The tree whose links are checked, repository-relative and POSIX-separated. */
export const TREE = ".instruction";

const MAX_BYTES = 16 * 1024 * 1024;

/** A fence opener or closer: three or more backticks or tildes. */
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

/** An inline code span, removed before links are read. */
const CODE_SPAN_RE = /(`+)[^`]*?\1/g;

/** An inline link or image target, with an optional title. */
const INLINE_RE = /\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

/** A reference definition, `[label]: target`. */
const DEFINITION_RE = /^\s{0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/;

/** A URL scheme such as `https:` or `mailto:`. */
const SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/**
 * Every Markdown file under `TREE`, POSIX-separated and sorted.
 *
 * A symbolic link is neither followed nor read. A directory that cannot be listed is returned as
 * unreadable.
 */
function markdownFiles(root) {
  const files = [];
  const unreadable = [];
  const walk = (relative) => {
    let entries;
    try {
      entries = readdirSync(path.join(root, ...relative.split("/")), { withFileTypes: true });
    } catch {
      unreadable.push(relative);
      return;
    }
    for (const entry of entries) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && entry.name.endsWith(".md")) files.push(child);
    }
  };
  try {
    const stats = lstatSync(path.join(root, TREE));
    if (stats.isSymbolicLink() || !stats.isDirectory()) unreadable.push(TREE);
    else walk(TREE);
  } catch {
    unreadable.push(TREE);
  }
  return { files: files.sort(), unreadable };
}

/** The link targets on each line of `text` outside code, as `{ line, target }`. */
export function linkTargets(text) {
  const targets = [];
  let fence;
  text.split(/\r?\n/).forEach((raw, index) => {
    const marker = FENCE_RE.exec(raw)?.[1];
    if (fence !== undefined) {
      if (marker !== undefined && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = undefined;
      }
      return;
    }
    if (marker !== undefined) {
      fence = marker;
      return;
    }
    const line = raw.replace(CODE_SPAN_RE, "");
    const found = [...line.matchAll(INLINE_RE)].map((match) => match[1]);
    const definition = DEFINITION_RE.exec(line)?.[1];
    if (definition !== undefined) found.push(definition);
    for (const target of found) {
      targets.push({ line: index + 1, target: target.replace(/^<(.*)>$/, "$1") });
    }
  });
  return targets;
}

/** The file a relative target names, or `undefined` when the target is not a relative file link. */
function targetPath(target) {
  if (target === "" || target.startsWith("#") || SCHEME_RE.test(target)) return undefined;
  const file = target.split("#")[0].split("?")[0];
  try {
    return decodeURIComponent(file);
  } catch {
    return file;
  }
}

/**
 * Reads every Markdown file under `TREE` in `root` and resolves its relative links.
 *
 * Returns the paths that could not be read, every broken link as `{ file, line, target }`, and
 * the number of relative links checked.
 */
export function linkFindings(root) {
  const { files, unreadable } = markdownFiles(root);
  const broken = [];
  let checked = 0;
  for (const file of files) {
    const text = readBoundedText(path.join(root, ...file.split("/")), MAX_BYTES);
    if (text === undefined) {
      unreadable.push(file);
      continue;
    }
    for (const { line, target } of linkTargets(text)) {
      const relative = targetPath(target);
      if (relative === undefined) continue;
      checked += 1;
      const resolved = path.resolve(root, ...path.posix.dirname(file).split("/"), relative);
      const inside = path.relative(path.resolve(root), resolved);
      const outside =
        inside === ".." || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside);
      if (outside || !existsSync(resolved)) broken.push({ file, line, target });
    }
  }
  return { unreadable, broken, checked };
}

/** One line per finding, then one line of repair advice. */
export function describeFindings({ unreadable, broken }) {
  const lines = [
    ...unreadable.map((file) => `${file} could not be read.`),
    ...broken.map(({ file, line, target }) => `${file}:${String(line)}: ${target} does not exist.`),
  ];
  if (broken.length > 0) {
    lines.push(
      "Point each link at the file that now holds what it cited, or remove the link and the " +
        "sentence that depends on it.",
    );
  }
  return lines;
}

/** Runs the check over `root` and returns the process exit code. */
export function run(root = process.cwd()) {
  const findings = linkFindings(root);
  for (const line of describeFindings(findings)) console.error(line);
  if (findings.unreadable.length > 0) return 2;
  if (findings.broken.length > 0) return 1;
  console.log(`Every relative link under ${TREE}/ resolves (${String(findings.checked)} links).`);
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run());
}
