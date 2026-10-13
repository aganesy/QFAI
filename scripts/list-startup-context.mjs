/* global console */
/**
 * List the instruction files Claude Code reads at launch for a checkout, with
 * line and byte counts, so a before-and-after comparison can be repeated by
 * anyone. It is a static listing of source files, not a measurement of the
 * session context: `/context` opens a terminal dialog an agent cannot run.
 *
 *   node scripts/list-startup-context.mjs [--root <directory>] [--json]
 *
 * What is listed, by how the file is reached:
 *
 * | Reached as | Files                                                              |
 * | ---------- | ------------------------------------------------------------------ |
 * | entry      | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md`, `AGENTS.md`   |
 * | rule       | every `.md` under `.claude/rules/` with no `paths` front matter     |
 * | import     | a file named by `@path` in a listed file, to a depth of five        |
 *
 * `AGENTS.md` is listed because this repository's hosts read it as an entry
 * file; a host that reads only `CLAUDE.md` loads it when `CLAUDE.md` imports it.
 * A rule with `paths` front matter is loaded when a matching file is touched,
 * so it is printed apart and left out of the total. An import is read from a
 * line outside fenced code and inline code, relative to the file that names
 * it; a path that does not exist is printed as unresolved.
 *
 * A symbolic link is followed and printed with its target, and the counts are
 * the target's. On Windows without `core.symlinks` a link is stored as a file
 * holding one line, the path; that is followed the same way and printed as a
 * flattened link, because a plain size count would read the one line.
 *
 * Not listed: the user's own files in the home directory, managed policy files,
 * parent directories of the checkout, auto memory, skill descriptions, tool and
 * MCP definitions, and the system prompt. The total is therefore a floor.
 */
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const MAX_IMPORT_DEPTH = 5;

const ENTRY_FILES = ["CLAUDE.md", "CLAUDE.local.md", ".claude/CLAUDE.md", "AGENTS.md"];

const lineCount = (text) => text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

const toPosix = (value) => value.split(path.sep).join("/");

function parseArgs(argv) {
  const options = { root: process.cwd(), json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--root" && argv[index + 1] !== undefined) {
      options.root = path.resolve(argv[index + 1]);
      index += 1;
    } else {
      console.error(`list-startup-context: unknown argument ${JSON.stringify(argument)}`);
      process.exit(2);
    }
  }
  return options;
}

/** The bytes of a readable file, or `undefined`. */
function readBytes(file) {
  try {
    return readFileSync(file);
  } catch {
    return undefined;
  }
}

/** The file's real path, or the path itself when it does not resolve. */
function realOrSelf(file) {
  try {
    return realpathSync(file);
  } catch {
    return file;
  }
}

/**
 * The file that stands behind `file` when it is a link, and how it is stored.
 *
 * A flattened link is a regular file of one line that names an existing path
 * relative to its own directory.
 */
function resolveLink(file, bytes) {
  try {
    if (lstatSync(file).isSymbolicLink()) return { target: realpathSync(file), kind: "link" };
  } catch {
    return undefined;
  }
  const text = bytes.toString("utf-8").trim();
  if (text.length === 0 || text.length > 260 || /[\r\n]/.test(text)) return undefined;
  const target = path.resolve(path.dirname(file), text);
  const stored = readBytes(target);
  return stored === undefined ? undefined : { target: realOrSelf(target), kind: "flattened link" };
}

/** The text of a Markdown file with fenced code and inline code blanked out. */
function proseOnly(text) {
  let fence = null;
  return text
    .split("\n")
    .map((line) => {
      const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (fence === null && opening !== null) {
        fence = opening[1];
        return "";
      }
      if (fence !== null) {
        if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = null;
        return "";
      }
      return line.replace(/`[^`]*`/g, "");
    })
    .join("\n");
}

/** The paths a file imports with `@path`, as written. */
function importsOf(text) {
  const found = [];
  for (const match of proseOnly(text).matchAll(/(?:^|\s)@([^\s]+)/g)) {
    const written = match[1].replace(/[.,;:!?)\]]+$/, "");
    if (written.startsWith("~") || !/[/.]/.test(written)) continue;
    found.push(written);
  }
  return found;
}

/** Whether a rule's front matter limits it to matching files. */
function isPathScoped(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return match !== null && /^paths\s*:/m.test(match[1]);
}

/** Every Markdown file under `.claude/rules/`, in name order. */
function rulesUnder(root) {
  const found = [];
  const walk = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) found.push(full);
    }
  };
  walk(path.join(root, ".claude", "rules"));
  return found;
}

function collect(root) {
  const listed = [];
  const scoped = [];
  const unresolved = [];
  const seen = new Set();

  /** What the host reads for `file`: the target of a link, else the file itself. */
  const read = (file) => {
    const bytes = readBytes(file);
    if (bytes === undefined) return undefined;
    const link = resolveLink(file, bytes);
    if (link === undefined) return { bytes, link: undefined };
    const target = readBytes(link.target);
    return target === undefined ? { bytes, link: undefined } : { bytes: target, link };
  };

  const add = (file, how, depth) => {
    const content = read(file);
    if (content === undefined) return;
    const identity = content.link === undefined ? realOrSelf(file) : content.link.target;
    if (seen.has(identity)) return;
    seen.add(identity);
    const text = content.bytes.toString("utf-8");
    const name = toPosix(path.relative(root, file));
    listed.push({
      path: name,
      how,
      lines: lineCount(text),
      bytes: content.bytes.length,
      ...(content.link === undefined
        ? {}
        : {
            // Both sides real: a temporary directory is often itself reached through a link.
            link: `${content.link.kind} -> ${toPosix(path.relative(realOrSelf(root), content.link.target))}`,
          }),
    });
    if (depth >= MAX_IMPORT_DEPTH) return;
    for (const written of importsOf(text)) {
      // Relative to the path the file is reached by, as the host resolves it.
      const target = path.resolve(path.dirname(file), written);
      if (readBytes(target) === undefined) {
        if (/\.md$|\//.test(written)) unresolved.push({ from: name, written });
        continue;
      }
      add(target, `import from ${name}`, depth + 1);
    }
  };

  for (const entry of ENTRY_FILES) add(path.join(root, entry), "entry", 0);
  for (const rule of rulesUnder(root)) {
    const content = read(rule);
    if (content === undefined) continue;
    if (isPathScoped(content.bytes.toString("utf-8"))) {
      scoped.push({
        path: toPosix(path.relative(root, rule)),
        lines: lineCount(content.bytes.toString("utf-8")),
        bytes: content.bytes.length,
      });
    } else {
      add(rule, "rule", 0);
    }
  }
  return { listed, scoped, unresolved };
}

const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);

const counts = (item) => `${String(item.lines).padStart(5)}  ${String(item.bytes).padStart(6)}`;

function render({ listed, scoped, unresolved }) {
  const rows = [
    " lines   bytes  reached as  path",
    ...listed.map(
      (item) =>
        `${counts(item)}  ${item.how}  ${item.path}${item.link === undefined ? "" : ` (${item.link})`}`,
    ),
    `${counts({ lines: sum(listed, "lines"), bytes: sum(listed, "bytes") })}  total of ${String(listed.length)} files; a floor, see the header of this script for what is not counted`,
  ];
  if (scoped.length > 0) {
    rows.push("", "path-scoped rules, loaded when a matching file is touched (not in the total):");
    rows.push(...scoped.map((item) => `${counts(item)}  ${item.path}`));
  }
  if (unresolved.length > 0) {
    rows.push("", "imports that name no file:");
    rows.push(...unresolved.map((item) => `  ${item.from}: @${item.written}`));
  }
  return rows.join("\n");
}

const options = parseArgs(process.argv.slice(2));
const result = collect(options.root);
const total = { lines: sum(result.listed, "lines"), bytes: sum(result.listed, "bytes") };
console.log(options.json ? JSON.stringify({ ...result, total }, null, 2) : render(result));
