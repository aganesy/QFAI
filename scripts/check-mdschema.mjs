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
 *   --scope changed  (default) documents this branch touched, against the merge
 *                    base. A ratchet: new and edited documents must conform,
 *                    untouched legacy documents are left for their own change.
 *   --scope all      every document the manifest matches. The migration view.
 *   --scope files    only the paths named on the command line.
 *
 * A degraded base (no merge base, a shallow clone, a failed diff) FAILS OPEN to
 * `all`, because the alternative — silently checking nothing and reporting
 * green — claims a result the run never established.
 *
 * Usage:
 *   node scripts/check-mdschema.mjs                      # ratchet against origin/main
 *   node scripts/check-mdschema.mjs --scope all          # whole tree
 *   node scripts/check-mdschema.mjs --scope all --summary
 *   node scripts/check-mdschema.mjs --base <ref>         # ratchet against <ref>
 *   node scripts/check-mdschema.mjs --scope files a.md b.md
 *   node scripts/check-mdschema.mjs --root <dir> --scope all   # another tree
 *
 * Exit codes:
 *   0  every checked document conforms (or none was in scope)
 *   1  at least one document violates its schema
 *   2  usage error, missing schema/manifest, or an mdschema binary that will not run
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/**
 * Where the schemas live: beside the script, always.
 *
 * The schemas are the package's, not the checked tree's — `--root` moves the
 * DOCUMENTS being checked, never the contract they are checked against.
 */
const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_ROOT = path.join(SCRIPT_ROOT, "packages", "qfai", "assets", "mdschema");
const MANIFEST = path.join(SCHEMA_ROOT, "manifest.yml");

/** The default base for the ratchet, overridable with `--base`. */
const DEFAULT_BASE = "origin/main";

/** Where the packaged mdschema binary is reachable from. */
const MDSCHEMA_BIN = path.join(SCRIPT_ROOT, "node_modules", ".bin", "mdschema");

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
  /** @type {{ id?: string, schema?: string, pattern?: string }} */
  let current = {};
  const flush = () => {
    if (current.id !== undefined && current.schema !== undefined && current.pattern !== undefined) {
      entries.push({ id: current.id, schema: current.schema, pattern: current.pattern });
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
    const field = /^\s+(schema|pattern):\s*"?([^"\r\n]+?)"?\s*$/.exec(line);
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
export function patternToRegExp(pattern) {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        out += "[^\\u0000]*";
        i++;
        // `**/` should also match zero directories, so the slash is optional.
        if (pattern[i + 1] === "/") {
          out += "";
          i++;
        }
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
 * The files this branch changed, or `null` when the answer is degraded.
 *
 * `null` and "no files changed" are different answers and are kept different:
 * the first must widen the scope, the second must narrow it to nothing.
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
  const diff = spawnSync("git", ["diff", "--name-only", "--no-renames", `${base}...HEAD`], {
    cwd: root,
    encoding: "utf-8",
  });
  if (diff.status !== 0) {
    return null;
  }
  const staged = spawnSync("git", ["diff", "--name-only", "--no-renames", "HEAD"], {
    cwd: root,
    encoding: "utf-8",
  });
  const lines = `${diff.stdout}\n${staged.status === 0 ? staged.stdout : ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return [...new Set(lines)];
}

/**
 * Runs `mdschema check` for one manifest entry.
 *
 * @param {string} schemaPath Absolute path to the schema.
 * @param {string[]} files Tree-relative document paths.
 * @param {string} root The tree they are relative to.
 * @returns {{ ok: boolean, output: string, spawnFailed: boolean }}
 */
function runMdschema(schemaPath, files, root) {
  const result = spawnSync(MDSCHEMA_BIN, ["check", "--schema", schemaPath, ...files], {
    cwd: root,
    encoding: "utf-8",
  });
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

function main() {
  const argv = process.argv.slice(2);
  let scope = "changed";
  let base = DEFAULT_BASE;
  let summary = false;
  let root = SCRIPT_ROOT;
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
  if (!existsSync(MDSCHEMA_BIN)) {
    console.error(
      "check-mdschema: the mdschema binary is not installed. Run `pnpm install` (it arrives with the @jackchuka/mdschema devDependency).",
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

  let violations = 0;
  let checked = 0;
  const perEntry = [];

  for (const entry of entries) {
    const schemaPath = path.join(SCHEMA_ROOT, entry.schema);
    if (!existsSync(schemaPath)) {
      console.error(`check-mdschema: ${entry.id}: schema not found at ${entry.schema}`);
      return 2;
    }
    const re = patternToRegExp(entry.pattern.replace("{specsDir}", specsDir));
    const matched = universe
      .filter((file) => re.test(file))
      .filter((file) => restrictSet === null || restrictSet.has(file))
      .sort();
    if (matched.length === 0) {
      perEntry.push({ id: entry.id, files: 0, ok: true });
      continue;
    }
    checked += matched.length;
    const result = runMdschema(schemaPath, matched, root);
    if (result.spawnFailed) {
      console.error(`check-mdschema: could not run mdschema: ${result.output}`);
      return 2;
    }
    perEntry.push({ id: entry.id, files: matched.length, ok: result.ok });
    if (!result.ok) {
      violations++;
      console.error(`\n── ${entry.id} (${entry.schema}) ──`);
      console.error(result.output);
    }
  }

  if (summary) {
    console.log("\nPer-document-type result:");
    for (const row of perEntry) {
      const state = row.files === 0 ? "  -  " : row.ok ? " PASS" : " FAIL";
      console.log(`  ${state}  ${row.id} (${row.files} file(s))`);
    }
  }

  const where =
    scope === "all" || restrictSet === null
      ? "every matching document"
      : scope === "files"
        ? "the named documents"
        : `documents changed against ${base}`;

  if (violations > 0) {
    console.error(
      `\ncheck-mdschema: ${violations} document type(s) failed over ${checked} file(s) in scope (${where}).`,
    );
    return 1;
  }

  console.log(`check-mdschema: ${checked} file(s) conform (${where}).`);
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
