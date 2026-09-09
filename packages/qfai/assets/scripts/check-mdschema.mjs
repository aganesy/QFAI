/* global console */
/**
 * check-mdschema.mjs
 *
 * Validates SDD documents against the declarative Markdown schemas shipped in
 * `packages/qfai/assets/mdschema/`.
 *
 * markdownlint answers "is this well-formed Markdown". It cannot answer "does
 * this spec have an Acceptance Criteria section, is that section's body a
 * Gherkin block, and does the test-case table still carry an `EX-Ref`
 * column" — those are document-SHAPE questions, and a spec that fails all
 * three is still perfectly well-formed Markdown. `mdschema` answers them from
 * a schema, so the shape of a spec is declared in one reviewable file instead
 * of living in a template nobody diffs against.
 *
 * ── Scope, and why it is a flag ───────────────────────────────────────────
 *
 * The schemas state the TEMPLATE's contract. A repository that adopted QFAI
 * before a given convention has documents that predate it, and those cannot be
 * migrated mechanically — a missing story catalogue is a summary somebody has
 * to write, not a heading somebody has to insert. So which documents the
 * contract is enforced over is a policy decision, taken here rather than by
 * weakening the schemas until the current tree happens to pass:
 *
 *   --scope changed  (default) documents whose text this branch changed, judged
 *                    against their own state at the merge base. A ratchet: a new
 *                    document must conform and an edited one must not get
 *                    worse, while untouched legacy documents are left for their
 *                    own change. A rewrite that moves bytes without moving text
 *                    — re-normalised line endings — is not a change here.
 *   --scope all      every document the manifest matches. The migration view.
 *   --scope files    only the paths named on the command line.
 *
 * A degraded base (no merge base, a shallow clone, a failed diff) FAILS OPEN to
 * `all`, because the alternative — silently checking nothing and reporting
 * green — claims a result the run never established.
 *
 * ── What `--scope changed` holds a branch to ──────────────────────────────
 *
 * Selecting the touched documents is not enough on its own. A document that
 * predates the schema fails whole, so editing one line of it would report every
 * violation it already had as this branch's — and the migration the flag exists
 * to allow could never land incrementally, because the first edit to a legacy
 * document would have to carry all of it.
 *
 * So each touched document is judged against its own state at the merge base:
 *
 *   | at the merge base    | at the head | verdict                          |
 *   | -------------------- | ----------- | -------------------------------- |
 *   | not there            | fails       | this branch's — fail             |
 *   | conforms             | fails       | this branch's — fail             |
 *   | fails                | fails       | pre-existing — report, not fail  |
 *
 * A document checked against a different contract at the base — one the
 * `when:` predicates routed elsewhere, or one that opted out — counts as not
 * there. It has never been held to this schema, so this is the first run that
 * could ask.
 *
 * **The unit is the document, not the violation.** A branch that adds an
 * eleventh violation to a document that already had ten still passes: the
 * document failed before and fails now. Deciding that would mean reading which
 * violations `mdschema` printed, and `mdschema` has no machine-readable output
 * — `--format json` and `--format sarif` both render the same text — so a
 * violation-level ratchet would couple this file to one release's wording, and
 * a reflowed message would silently report every violation as new. The file
 * ratchet uses only the exit status, which the tool does promise.
 *
 * A pack outlives the thing it specifies: a spec that was deleted or superseded
 * is kept as a record of why it went away, and that record cannot carry a
 * consumer view or an applicable NFR for something that no longer exists.
 * Two things follow from that.
 *
 * A manifest entry may carry a `when:` predicate — a regular expression read
 * against the document's own text. A file whose content matches is checked
 * against that entry and is dropped from every entry on the same path that has
 * no predicate, so one path can carry two document shapes without either
 * document being run against the other's contract.
 *
 * A document can also opt out of its schema entirely, with
 *
 *     <!-- mdschema:ignore -->
 *
 * in its leading comment block. This is the answer for a shape no schema
 * describes; where a shape has one, `when:` routes to it instead. The marker
 * has to be at the top, before any content, and every ignored file is counted
 * in the run's own output — an exclusion nobody can see is one nobody reviews.
 *
 * Usage:
 *   node scripts/check-mdschema.mjs                      # ratchet against origin/main
 *   node scripts/check-mdschema.mjs --scope all          # whole tree
 *   node scripts/check-mdschema.mjs --scope all --summary
 *   node scripts/check-mdschema.mjs --base <ref>         # ratchet against <ref>
 *   node scripts/check-mdschema.mjs --scope files a.md b.md
 *   node scripts/check-mdschema.mjs --root <dir> --scope all   # another tree
 *
 * The tree defaults to the working directory; the SCHEMAS always come from
 * beside this file, so `--root` moves the documents and never the contract.
 *
 * Exit codes:
 *   0  no document in scope carries a violation this run is responsible for
 *   1  at least one document does
 *   2  usage error, missing schema/manifest, or an mdschema binary that will not run
 *
 * Under `--scope all` and `--scope files` those two say what they always have:
 * every checked document conforms, or one does not. Under `--scope changed`
 * responsibility is what the table above decides, so a `0` can carry documents
 * that still fail — the ones that failed at the merge base too. The run says so
 * on stdout, names them, and counts them in its closing line, which is why the
 * exit code alone is not the whole answer there.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/**
 * Where the schemas live: beside the script, always.
 *
 * The schemas are the package's, not the checked tree's — `--root` moves the
 * DOCUMENTS being checked, never the contract they are checked against.
 */
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_ROOT = path.resolve(SCRIPT_DIR, "..", "mdschema");
const MANIFEST = path.join(SCHEMA_ROOT, "manifest.yml");

/** The default base for the ratchet, overridable with `--base`. */
const DEFAULT_BASE = "origin/main";

/** The npm package that provides the `mdschema` command. */
const MDSCHEMA_PACKAGE = "@jackchuka/mdschema";

/**
 * The mdschema command line, as the program to run and its leading arguments.
 *
 * The package's own JS entry point is launched with the running Node, not the
 * `node_modules/.bin` shim. A shim is a different file per platform, and on
 * Windows the runnable one is `mdschema.cmd`: since 18.20.2 Node refuses to
 * spawn a `.cmd` or `.bat` without a shell and returns `EINVAL`, so every
 * Windows run of this lane failed before mdschema was reached. Passing
 * `shell: true` instead would hand the argument list to the command
 * interpreter, and these arguments are document paths.
 *
 * The entry point is read from the package's `bin` field rather than assumed,
 * so a release that moves the file is followed rather than guessed at.
 *
 * Two starting points because there are two installations: this repository has
 * it as a root devDependency, and an adopter has it under whichever
 * `node_modules` their package manager chose — which for pnpm is not the one
 * beside the checked tree. Returns `null` when neither walk finds it, which the
 * caller turns into a usage error rather than a silent pass.
 *
 * @param {string} from Directory to start the first walk from.
 * @returns {{ command: string, args: string[] } | null}
 */
export function findMdschemaCommand(from) {
  for (const start of [from, SCRIPT_DIR]) {
    let dir = path.resolve(start);
    for (;;) {
      const entry = mdschemaEntryPoint(
        path.join(dir, "node_modules", ...MDSCHEMA_PACKAGE.split("/")),
      );
      if (entry !== null) {
        return { command: process.execPath, args: [entry] };
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }
  return null;
}

/**
 * The JS file `packageDir` declares for the `mdschema` command, or `null`.
 *
 * `bin` is a string when the package ships one command and an object keyed by
 * command name when it ships several; both spellings are read. A declared file
 * that is not on disk returns `null` so the walk continues to the next
 * installation rather than stopping at a broken one.
 *
 * @param {string} packageDir
 * @returns {string | null}
 */
function mdschemaEntryPoint(packageDir) {
  const manifest = path.join(packageDir, "package.json");
  if (!existsSync(manifest)) {
    return null;
  }
  let bin;
  try {
    bin = JSON.parse(readFileSync(manifest, "utf-8")).bin;
  } catch {
    return null;
  }
  const relative = typeof bin === "string" ? bin : bin?.mdschema;
  if (typeof relative !== "string" || relative.length === 0) {
    return null;
  }
  const entry = path.resolve(packageDir, relative);
  return existsSync(entry) ? entry : null;
}

/**
 * Reads `paths.specsDir` out of `qfai.config.yaml`.
 *
 * A hand-rolled read of two known keys rather than a YAML parse: this script
 * runs before (and independently of) the package build, and the value is a
 * single scalar under a single mapping. A missing or unreadable config is not
 * an error — the documented default is what a fresh tree has.
 *
 * @returns {string} Repository-root-relative specs directory.
 */
function readSpecsDir(root) {
  const fallback = ".qfai/specs";
  const config = path.join(root, "qfai.config.yaml");
  if (!existsSync(config)) {
    return fallback;
  }
  let text;
  try {
    text = readFileSync(config, "utf-8");
  } catch {
    return fallback;
  }
  // `paths:` at column 0, then `specsDir:` indented beneath it. Anchored to the
  // block so an unrelated `specsDir:` under another mapping cannot win.
  const block = /^paths:[ \t]*$([\s\S]*?)^(?=\S)/m.exec(`${text}\n￿`);
  const scope = block === null ? text : block[1];
  const found = /^[ \t]+specsDir:[ \t]*["']?([^"'\r\n#]+)["']?[ \t]*$/m.exec(scope);
  if (found === null) {
    return fallback;
  }
  const value = found[1].trim();
  return value === "" ? fallback : value.replace(/\/+$/, "");
}

/**
 * Reads the manifest's `documents:` list.
 *
 * The manifest is a fixed two-key-per-entry shape authored in this repository,
 * so it is read with a line scanner rather than by adding a YAML dependency to
 * a script that must run before anything is installed beyond the root
 * devDependencies.
 *
 * @returns {{ id: string, schema: string, pattern: string }[]}
 */
function readManifest() {
  const text = readFileSync(MANIFEST, "utf-8");
  const entries = [];
  /** @type {{ id?: string, schema?: string, pattern?: string, when?: string }} */
  let current = {};
  const flush = () => {
    if (current.id !== undefined && current.schema !== undefined && current.pattern !== undefined) {
      entries.push({
        id: current.id,
        schema: current.schema,
        pattern: current.pattern,
        ...(current.when !== undefined ? { when: current.when } : {}),
      });
    }
    current = {};
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "");
    const start = /^\s*-\s+id:\s*(.+?)\s*$/.exec(line);
    if (start !== null) {
      flush();
      current = { id: start[1] };
      continue;
    }
    const field = /^\s+(schema|pattern|when):\s*"?([^"\r\n]+?)"?\s*$/.exec(line);
    if (field !== null && current.id !== undefined) {
      current[field[1]] = field[2];
    }
  }
  flush();
  return entries;
}

/**
 * Compiles a manifest pattern into an anchored regular expression.
 *
 * `**` crosses path separators, `*` does not — the ordinary glob distinction,
 * and the reason a single star in a `spec-<star>` segment cannot reach into a
 * nested directory.
 *
 * @param {string} pattern Repository-root-relative, forward-slashed.
 * @returns {RegExp}
 */
/** The opt-out a document carries to be left out of its schema. */
export const IGNORE_MARKER = "<!-- mdschema:ignore -->";

/**
 * Up to three leading spaces, which is the indent Markdown still reads as
 * HTML. A fourth space, or a tab, opens an indented code block: the line then
 * renders as text and is not a comment at all, so a marker written there must
 * not exempt anything.
 */
const HTML_BLOCK_INDENT = /^ {0,3}(?![ \t])/;

const COMMENT_CLOSE = "-->";

/**
 * Whether a document opts out, read from its leading comment block.
 *
 * Leading, because a marker further down would cover a document a reader
 * scrolling past the first screen assumes is checked. Blank lines and other
 * HTML comments may precede it — a file may open with a note about itself,
 * over as many lines as it needs — but the first line of content ends the
 * block.
 *
 * @param {string} text the document's contents
 */
export function optsOutOfSchema(text) {
  let inComment = false;
  for (const line of text.split(/\r?\n/)) {
    if (inComment) {
      const close = line.indexOf(COMMENT_CLOSE);
      if (close === -1) continue;
      inComment = false;
      // Anything after the close on the same line is content, and content ends
      // the block.
      if (line.slice(close + COMMENT_CLOSE.length).trim().length > 0) return false;
      continue;
    }
    if (line.trim().length === 0) continue;
    if (!HTML_BLOCK_INDENT.test(line)) return false;

    const trimmed = line.trim();
    if (trimmed === IGNORE_MARKER) return true;
    if (!trimmed.startsWith("<!--")) return false;

    const close = line.indexOf(COMMENT_CLOSE);
    if (close === -1) {
      inComment = true;
      continue;
    }
    if (line.slice(close + COMMENT_CLOSE.length).trim().length > 0) return false;
  }
  return false;
}

/**
 * The heading a schema requires at the document's root, or `null`.
 *
 * Read with a line scanner, for the reason the manifest and the config are:
 * these are fixed shapes authored in this repository, and this script must run
 * before anything is installed beyond the root devDependencies.
 *
 * The root heading is the first `pattern:` under `structure:`, which every
 * shipped schema declares. `null` for a schema that does not — the caller then
 * has no root to check against and leaves the document to `mdschema`.
 *
 * @param {string} schemaText
 * @returns {{ pattern: string, regex: boolean } | null}
 */
export function rootHeadingPattern(schemaText) {
  let inStructure = false;
  let pattern = null;
  for (const raw of schemaText.split(/\r?\n/)) {
    if (/^structure:/.test(raw)) {
      inStructure = true;
      continue;
    }
    if (!inStructure) continue;
    // A line at column 0 ends `structure:` — the next top-level key.
    if (pattern === null && /^\S/.test(raw)) return null;
    if (pattern === null) {
      const found = /^\s+pattern:\s*"([^"]*)"\s*$|^\s+pattern:\s*(\S+)\s*$/.exec(raw);
      if (found !== null) {
        pattern = found[1] ?? found[2] ?? "";
        continue;
      }
      continue;
    }
    // `regex:` belongs to the same `heading:` mapping, so it is the next one.
    const flag = /^\s+regex:\s*(true|false)\s*$/.exec(raw);
    if (flag !== null) return { pattern, regex: flag[1] === "true" };
    if (/^\s+pattern:/.test(raw)) break;
  }
  return pattern === null ? null : { pattern, regex: false };
}

/** Opens or closes a fenced block, whatever the fence character and length. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/**
 * The document's first ATX heading line, or `null`.
 *
 * Front matter and fenced blocks are skipped: a `# comment` inside a shell
 * example is not this document's heading, and reading one as the heading would
 * report the document against a line it does not have.
 *
 * @param {string} text
 * @returns {string | null}
 */
export function firstHeading(text) {
  const lines = text.split(/\r?\n/);
  let index = 0;
  if (lines[0] !== undefined && /^---\s*$/.test(lines[0])) {
    index = 1;
    while (index < lines.length && !/^---\s*$/.test(lines[index] ?? "")) index++;
    index++;
  }
  let fence = null;
  for (; index < lines.length; index++) {
    const line = lines[index] ?? "";
    const opener = FENCE.exec(line);
    if (fence !== null) {
      if (opener !== null && opener[1].startsWith(fence[0]) && opener[1].length >= fence.length) {
        fence = null;
      }
      continue;
    }
    if (opener !== null) {
      fence = opener[1];
      continue;
    }
    if (/^\s{0,3}#{1,6}\s/.test(line)) return line;
  }
  return null;
}

/**
 * Whether `text` carries the root heading `schemaText` requires.
 *
 * `null` when the question cannot be put — the schema declares no root heading,
 * or its pattern does not compile. The caller then leaves the document to
 * `mdschema` rather than inventing a verdict.
 *
 * @param {string} schemaText
 * @param {string} text
 * @returns {{ ok: boolean, expected: string, actual: string | null } | null}
 */
/**
 * The one line a root-heading mismatch is worth.
 *
 * It names what is there, what is required, and that the document is graded no
 * further until they agree — because a reader who is not told that will read
 * the absence of other lines as the rest of the document being sound.
 *
 * @param {string} schemaText
 * @param {string} file repository-relative
 * @param {string} text
 * @returns {string}
 */
export function describeRootMismatch(schemaText, file, text) {
  const verdict = rootHeadingVerdict(schemaText, text);
  const expected = verdict?.expected ?? "";
  const actual = verdict?.actual;
  const found = actual === null || actual === undefined ? "no heading" : `"${actual.trim()}"`;
  return [
    file,
    `  ✗ 1:1  [structure] Root heading is ${found}, but the schema requires "${expected}"`,
    "         Every section is graded against the heading above it, so this document",
    "         is not checked further until the root heading matches.",
  ].join("\n");
}

export function rootHeadingVerdict(schemaText, text) {
  const required = rootHeadingPattern(schemaText);
  if (required === null) return null;
  const actual = firstHeading(text);
  let matches;
  if (required.regex) {
    try {
      matches = actual !== null && new RegExp(required.pattern, "u").test(actual);
    } catch {
      return null;
    }
  } else {
    matches = actual === required.pattern;
  }
  return { ok: matches, expected: required.pattern, actual };
}

export function patternToRegExp(pattern) {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        i++;
        if (pattern[i + 1] === "/") {
          // `**/` is "zero or more DIRECTORIES", so the separator is part of
          // what repeats rather than something dropped. Emitting the wildcard
          // and discarding the slash made the whole segment optional in the
          // wrong way: `**/foo.md` then matched `afoo.md`, because nothing
          // required the match to end at a path boundary.
          out += "(?:[^\\u0000]*/)?";
          i++;
          continue;
        }
        out += "[^\\u0000]*";
        continue;
      }
      out += "[^/]*";
      continue;
    }
    out += /[a-zA-Z0-9/_-]/.test(ch) ? ch : `\\${ch}`;
  }
  return new RegExp(`^${out}$`);
}

/**
 * Every file under `dir`, repository-root-relative and forward-slashed.
 *
 * @param {string} dir Absolute directory to walk.
 * @param {string} root The tree the returned paths are relative to.
 * @returns {string[]}
 */
function walk(dir, root) {
  const out = [];
  const pending = [dir];
  while (pending.length > 0) {
    const current = pending.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git") {
          pending.push(full);
        }
        continue;
      }
      if (entry.isFile()) {
        out.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  }
  return out;
}

/**
 * The path column of one `--numstat` row, or `null` for a row without one.
 *
 * A row is `<added>\t<deleted>\t<path>`, and a path may itself contain a tab,
 * so the path is everything past the second tab rather than the third field.
 *
 * @param {string} line
 * @returns {string | null}
 */
function numstatPath(line) {
  const firstTab = line.indexOf("\t");
  if (firstTab === -1) return null;
  const secondTab = line.indexOf("\t", firstTab + 1);
  if (secondTab === -1) return null;
  const file = line.slice(secondTab + 1).trim();
  return file === "" ? null : file;
}

/**
 * The files this branch changed, or `null` when the answer is degraded.
 *
 * `null` and "no files changed" are different answers and are kept different:
 * the first must widen the scope, the second must narrow it to nothing.
 *
 * A document whose bytes moved but whose text did not is not a document this
 * branch changed. Re-normalising line endings across the tree rewrites every
 * file, and pulling all of them into a shape gate reports findings nobody
 * introduced — enough of them that the honest options become leaving the tree
 * un-normalised or turning the lane red.
 *
 * Two details make that work, and neither is the obvious spelling:
 *
 * - `--numstat`, not `--name-only`. `--name-only` selects by blob identity and
 *   ignores the whitespace flags entirely, so it lists a carriage-return-only
 *   rewrite whatever else is asked of it. `--numstat` drops the row.
 * - `--ignore-cr-at-eol`, not `--ignore-all-space`. Indentation carries meaning
 *   in Markdown: moving a list item two spaces right nests it under its
 *   predecessor, which is a shape change this gate exists to grade.
 *   `--ignore-all-space` hides that edit; the narrower flag reaches the line
 *   endings and nothing else.
 *
 * @param {string} base
 * @returns {string[] | null}
 */
function changedFiles(base, root) {
  const rev = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${base}^{commit}`], {
    cwd: root,
    encoding: "utf-8",
  });
  if (rev.status !== 0) {
    return null;
  }
  // `A...HEAD` is the merge base, which is what "what this branch changed"
  // means; a plain two-dot diff also reports everything the base gained.
  const diff = spawnSync(
    "git",
    ["diff", "--numstat", "--no-renames", "--ignore-cr-at-eol", `${base}...HEAD`],
    { cwd: root, encoding: "utf-8" },
  );
  if (diff.status !== 0) {
    return null;
  }
  const staged = spawnSync(
    "git",
    ["diff", "--numstat", "--no-renames", "--ignore-cr-at-eol", "HEAD"],
    { cwd: root, encoding: "utf-8" },
  );
  const files = `${diff.stdout}\n${staged.status === 0 ? staged.stdout : ""}`
    .split(/\r?\n/)
    .map((line) => numstatPath(line))
    .filter((file) => file !== null);
  return [...new Set(files)];
}

/**
 * Runs `mdschema check` for one manifest entry.
 *
 * @param {{ command: string, args: string[] }} mdschema The command line to run.
 * @param {string} schemaPath Absolute path to the schema.
 * @param {string[]} files Tree-relative document paths.
 * @param {string} root The tree they are relative to.
 * @returns {{ ok: boolean, output: string, spawnFailed: boolean }}
 */
function runMdschema(mdschema, schemaPath, files, root) {
  const result = spawnSync(
    mdschema.command,
    [...mdschema.args, "check", "--schema", schemaPath, ...files],
    {
      cwd: root,
      encoding: "utf-8",
    },
  );
  if (result.error !== undefined || result.status === null) {
    return {
      ok: false,
      spawnFailed: true,
      output: result.error instanceof Error ? result.error.message : "mdschema did not run",
    };
  }
  return {
    ok: result.status === 0,
    spawnFailed: false,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd(),
  };
}

/**
 * The merge base of `base` and `HEAD`, or `null` when git cannot answer.
 *
 * The ratchet asks what a document looked like on the tree this branch left,
 * which is the merge base — not the base ref's tip. Those differ as soon as the
 * base moves, and comparing against the tip would call a document this branch
 * never touched its own the moment somebody else edited it.
 *
 * @param {string} base
 * @param {string} root
 * @returns {string | null}
 */
function mergeBaseRev(base, root) {
  const found = spawnSync("git", ["merge-base", base, "HEAD"], { cwd: root, encoding: "utf-8" });
  if (found.status !== 0) {
    return null;
  }
  const rev = found.stdout.trim();
  return rev === "" ? null : rev;
}

/**
 * One document's text at `rev`, or `null` when that revision does not hold it.
 *
 * @param {string} rev
 * @param {string} file Tree-relative, forward-slashed.
 * @param {string} root
 * @returns {string | null}
 */
function fileAtRev(rev, file, root) {
  const shown = spawnSync("git", ["show", `${rev}:${file}`], { cwd: root, encoding: "utf-8" });
  return shown.status === 0 ? shown.stdout : null;
}

/**
 * The manifest entry that would claim this content, or `null` for none.
 *
 * The same partition the run itself applies: a predicated entry claims the
 * documents its `when:` matches, and an unpredicated entry on the same pattern
 * takes what is left. Asked of the BASE text, because content is what routes a
 * document — a spec that was live at the base and is retired at the head is two
 * shapes at one path, and holding the base text to the head's contract would
 * excuse a genuinely broken document as pre-existing.
 *
 * @param {{ id: string, pattern: string, when?: string }[]} entries
 * @param {string} file
 * @param {string} text
 * @param {string} specsDir
 * @returns {string | null}
 */
function routeOf(entries, file, text, specsDir) {
  const matches = (entry) =>
    patternToRegExp(entry.pattern.replace("{specsDir}", specsDir)).test(file);
  for (const entry of entries) {
    if (entry.when !== undefined && matches(entry) && new RegExp(entry.when, "mu").test(text)) {
      return entry.id;
    }
  }
  for (const entry of entries) {
    if (entry.when === undefined && matches(entry)) {
      return entry.id;
    }
  }
  return null;
}

/**
 * Runs the schema over one document's text, held in a scratch directory.
 *
 * `null` when mdschema could not be run at all, which the caller treats as an
 * unanswered question rather than as a pass.
 *
 * The scratch directory is outside the checked tree on purpose: this script
 * runs in an adopter's repository, and a lane that writes into the tree it is
 * checking is one that can change its own answer.
 *
 * @returns {{ ok: boolean, output: string } | null}
 */
function checkText(mdschema, schemaPath, file, text) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "qfai-mdschema-base-"));
  try {
    const target = path.join(dir, path.basename(file));
    writeFileSync(target, text, "utf-8");
    const result = runMdschema(mdschema, schemaPath, [target], dir);
    return result.spawnFailed ? null : { ok: result.ok, output: result.output };
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Whether this branch owes the violations in `file`, rather than inheriting
 * them from the merge base.
 *
 * Fails closed at every step it cannot answer: a base text that will not run
 * is this branch's obligation, because the alternative is excusing a document
 * on the strength of a question nobody managed to ask.
 *
 * @returns {boolean}
 */
function ownsViolations(context, entryId, file) {
  const before = fileAtRev(context.baseRev, file, context.root);
  if (before === null || optsOutOfSchema(before)) {
    // Added by this branch, or not held to any schema until now. Either way
    // this is the first run that could have reported it.
    return true;
  }
  if (routeOf(context.entries, file, before, context.specsDir) !== entryId) {
    return true;
  }
  const verdict = checkText(context.mdschema, context.schemaPath, file, before);
  return verdict === null ? true : verdict.ok;
}

/**
 * Splits an entry's failing documents into the ones this branch owes and the
 * ones it inherited. `null` when mdschema stopped running part-way.
 *
 * Per-file runs are what make a per-file verdict possible, and they are paid
 * for only after the batch has already failed.
 *
 * @returns {{ owned: {file: string, output: string}[], inherited: {file: string, output: string}[] } | null}
 */
function splitByOwnership(context, entryId, files) {
  const owned = [];
  const inherited = [];
  for (const file of files) {
    const single = runMdschema(context.mdschema, context.schemaPath, [file], context.root);
    if (single.spawnFailed) {
      return null;
    }
    if (single.ok) {
      continue;
    }
    const row = { file, output: single.output };
    if (ownsViolations(context, entryId, file)) {
      owned.push(row);
    } else {
      inherited.push(row);
    }
  }
  return { owned, inherited };
}

export function main() {
  const argv = process.argv.slice(2);
  let scope = "changed";
  let base = DEFAULT_BASE;
  let summary = false;
  let root = process.cwd();
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--scope") {
      scope = argv[++i] ?? "";
      continue;
    }
    if (arg === "--base") {
      base = argv[++i] ?? "";
      continue;
    }
    if (arg === "--root") {
      root = argv[++i] ?? "";
      continue;
    }
    if (arg === "--summary") {
      summary = true;
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`check-mdschema: unknown flag ${arg}`);
      return 2;
    }
    positional.push(arg);
  }

  if (!["changed", "all", "files"].includes(scope)) {
    console.error(`check-mdschema: --scope must be one of changed|all|files (got "${scope}")`);
    return 2;
  }
  if (base === "") {
    console.error("check-mdschema: --base needs a git ref");
    return 2;
  }
  if (root === "") {
    console.error("check-mdschema: --root needs a directory");
    return 2;
  }
  root = path.resolve(root);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`check-mdschema: --root is not a directory: ${root}`);
    return 2;
  }
  if (!existsSync(MANIFEST)) {
    console.error(`check-mdschema: manifest not found at ${MANIFEST}`);
    return 2;
  }
  const mdschema = findMdschemaCommand(root);
  if (mdschema === null) {
    console.error(
      "check-mdschema: no mdschema entry point was found. Install @jackchuka/mdschema (this repository carries it as a devDependency; an adopter's CI installs it in the lane).",
    );
    return 2;
  }

  const specsDir = readSpecsDir(root);
  const entries = readManifest();
  if (entries.length === 0) {
    console.error("check-mdschema: the manifest declares no documents");
    return 2;
  }

  // The candidate universe, computed once: the manifest patterns are all rooted
  // at the specs directory, so the walk is bounded by it rather than by the
  // repository.
  const specsAbs = path.join(root, specsDir);
  const universe =
    existsSync(specsAbs) && statSync(specsAbs).isDirectory() ? walk(specsAbs, root) : [];

  /** @type {string[] | null} */
  let restrictTo = null;
  if (scope === "files") {
    if (positional.length === 0) {
      console.error("check-mdschema: --scope files needs at least one path");
      return 2;
    }
    restrictTo = positional.map((p) =>
      path.relative(root, path.resolve(root, p)).split(path.sep).join("/"),
    );
  } else if (scope === "changed") {
    const changed = changedFiles(base, root);
    if (changed === null) {
      console.warn(
        `check-mdschema: cannot diff against ${base} (unreachable ref, shallow clone or failed diff) - checking every document instead (fail open)`,
      );
    } else {
      restrictTo = changed;
    }
  }

  const restrictSet = restrictTo === null ? null : new Set(restrictTo);

  // The ratchet runs only where the scope is what a branch touched. Under
  // `all` and `files` every violation is the run's subject by definition —
  // `all` IS the migration view — and a base to measure against would only
  // hide the thing being asked for.
  const baseRev = scope === "changed" && restrictSet !== null ? mergeBaseRev(base, root) : null;

  let violations = 0;
  let checked = 0;
  let ignored = 0;
  let inheritedFiles = 0;
  const perEntry = [];

  // A file is read at most once per run, however many entries consider it: the
  // opt-out marker and every `when:` predicate ask about the same text.
  /** @type {Map<string, string>} */
  const contents = new Map();
  const contentOf = (file) => {
    const cached = contents.get(file);
    if (cached !== undefined) return cached;
    const text = readFileSync(path.join(root, file), "utf-8");
    contents.set(file, text);
    return text;
  };

  // Files a predicated entry has claimed. A default entry on the same path
  // drops them, which is what makes the two entries a partition rather than
  // two contracts over one document.
  const claimed = new Set();
  for (const entry of entries) {
    if (entry.when === undefined) continue;
    const re = patternToRegExp(entry.pattern.replace("{specsDir}", specsDir));
    const predicate = new RegExp(entry.when, "mu");
    for (const file of universe) {
      if (re.test(file) && predicate.test(contentOf(file))) claimed.add(file);
    }
  }

  for (const entry of entries) {
    const schemaPath = path.join(SCHEMA_ROOT, entry.schema);
    if (!existsSync(schemaPath)) {
      console.error(`check-mdschema: ${entry.id}: schema not found at ${entry.schema}`);
      return 2;
    }
    const re = patternToRegExp(entry.pattern.replace("{specsDir}", specsDir));
    const predicate = entry.when === undefined ? null : new RegExp(entry.when, "mu");
    const inScope = universe
      .filter((file) => re.test(file))
      .filter((file) => restrictSet === null || restrictSet.has(file))
      .filter((file) => (predicate === null ? !claimed.has(file) : predicate.test(contentOf(file))))
      .sort();
    const optedOut = inScope.filter((file) => optsOutOfSchema(contentOf(file)));
    ignored += optedOut.length;
    const matched = inScope.filter((file) => !optedOut.includes(file));
    if (matched.length === 0) {
      perEntry.push({ id: entry.id, files: 0, ignored: optedOut.length, ok: true });
      continue;
    }
    checked += matched.length;

    // A document whose root heading is not the one the schema names cannot be
    // graded below that heading: every section under it is compared against the
    // wrong parent and reported as unexpected, so one wrong line becomes one
    // violation per heading in the outline. Those statements are not true — the
    // sections are where they belong, under a heading that is spelled wrong —
    // and they bury the one line that is.
    //
    // The root heading is checked here, from the schema's own declaration,
    // rather than by reading what `mdschema` printed. Its message text is not
    // a contract: the same prose comes back for every `--format`, so a parser
    // for it would be this file coupled to one release's rendering.
    const schemaText = readFileSync(schemaPath, "utf-8");
    const rootMismatch = matched.filter((file) => {
      const verdict = rootHeadingVerdict(schemaText, contentOf(file));
      return verdict !== null && !verdict.ok;
    });
    const gradable = matched.filter((file) => !rootMismatch.includes(file));

    const rootOwed = [];
    const rootHeld = [];
    for (const file of rootMismatch) {
      // The same ownership question the ratchet asks, answered without
      // `mdschema`: a heading already wrong at the merge base is the
      // migration's backlog, not this branch's.
      const before = baseRev === null ? null : fileAtRev(baseRev, file, root);
      const wasWrong =
        before !== null &&
        !optsOutOfSchema(before) &&
        routeOf(entries, file, before, specsDir) === entry.id &&
        rootHeadingVerdict(schemaText, before)?.ok === false;
      (wasWrong ? rootHeld : rootOwed).push(
        describeRootMismatch(schemaText, path.relative(root, file), contentOf(file)),
      );
    }
    inheritedFiles += rootHeld.length;
    if (rootOwed.length > 0) violations++;

    const banner = `\n── ${entry.id} (${entry.schema}) ──`;
    const heldBanner = `\n── ${entry.id} (${entry.schema}) — pre-existing, not this branch's ──`;
    if (rootHeld.length > 0) {
      console.log(heldBanner);
      for (const line of rootHeld) console.log(line);
    }
    if (rootOwed.length > 0) {
      console.error(banner);
      for (const line of rootOwed) console.error(line);
    }

    const row = {
      id: entry.id,
      files: matched.length,
      ignored: optedOut.length,
      inherited: rootHeld.length,
    };
    if (gradable.length === 0) {
      perEntry.push({ ...row, ok: rootOwed.length === 0 });
      continue;
    }

    const result = runMdschema(mdschema, schemaPath, gradable, root);
    if (result.spawnFailed) {
      console.error(`check-mdschema: could not run mdschema: ${result.output}`);
      return 2;
    }
    if (result.ok || baseRev === null) {
      perEntry.push({ ...row, ok: result.ok && rootOwed.length === 0 });
      if (!result.ok) {
        if (rootOwed.length === 0) violations++;
        console.error(banner);
        console.error(result.output);
      }
      continue;
    }

    const split = splitByOwnership(
      { mdschema, schemaPath, root, entries, specsDir, baseRev },
      entry.id,
      gradable,
    );
    if (split === null) {
      console.error("check-mdschema: could not run mdschema over a single document");
      return 2;
    }
    inheritedFiles += split.inherited.length;
    perEntry.push({
      ...row,
      ok: split.owned.length === 0 && rootOwed.length === 0,
      inherited: split.inherited.length + rootHeld.length,
    });
    if (split.inherited.length > 0) {
      // On stdout, and not counted: these documents failed at the merge base
      // too, so they are the migration's backlog rather than this branch's
      // work. Printed rather than dropped — a document nobody is told about is
      // one nobody migrates.
      console.log(heldBanner);
      for (const held of split.inherited) {
        console.log(held.output);
      }
    }
    if (split.owned.length > 0) {
      if (rootOwed.length === 0) violations++;
      console.error(banner);
      for (const owed of split.owned) {
        console.error(owed.output);
      }
    }
  }

  if (summary) {
    console.log("\nPer-document-type result:");
    for (const row of perEntry) {
      const state = row.files === 0 ? "  -  " : row.ok ? " PASS" : " FAIL";
      const opted = row.ignored > 0 ? `, ${row.ignored} ignored` : "";
      const held = row.inherited > 0 ? `, ${row.inherited} pre-existing` : "";
      console.log(`  ${state}  ${row.id} (${row.files} file(s)${opted}${held})`);
    }
  }

  const where =
    scope === "all" || restrictSet === null
      ? "every matching document"
      : scope === "files"
        ? "the named documents"
        : `documents changed against ${base}`;

  const opted = ignored > 0 ? `, ${ignored} ignored by \`${IGNORE_MARKER}\`` : "";
  const held =
    inheritedFiles > 0
      ? `, ${inheritedFiles} file(s) already failing at the merge base and left to their own change`
      : "";

  if (violations > 0) {
    console.error(
      `\ncheck-mdschema: ${violations} document type(s) failed over ${checked} file(s) in scope (${where})${opted}${held}.`,
    );
    return 1;
  }

  // "conform" is only said where every checked document does. A run that held
  // pre-existing failures back reports what it actually established — that this
  // branch introduced none — because the other wording would put the migration's
  // backlog on record as clean.
  const verdict =
    inheritedFiles > 0
      ? `${checked} file(s) checked, no new violations`
      : `${checked} file(s) conform`;
  console.log(`check-mdschema: ${verdict} (${where})${opted}${held}.`);
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
  process.exit(main());
}
