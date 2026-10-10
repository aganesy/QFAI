/**
 * A path this repository intends to be a symlink, staged as a regular file.
 *
 * Both halves of the mistake are silent, and only one is a repository defect.
 *
 * **Creating one.** In Git Bash on Windows, `ln -s` copies the target instead
 * of linking to it unless `MSYS=winsymlinks:nativestrict` is set. The copy is
 * byte-identical, so every check that compares content passes. It survives
 * until someone edits the master and the copy stays behind — at which point two
 * files disagree and nothing says so. That is what this guard reports.
 *
 * **Checking one out.** Git for Windows writes a tracked symlink as a symlink
 * only where the clone has `core.symlinks=true` and the user holds the
 * privilege; otherwise it becomes a one-line text file holding the relative
 * target. That is a property of someone's machine rather than of the
 * repository, and `.agents/rules/README.md` already tells that reader to open
 * the master directly. This guard does not report it, and cannot: it reads the
 * index, not the working tree.
 *
 * `git ls-files -s` prints mode `120000` for a link and `100644` for a regular
 * file, and the mode is the only thing that tells them apart once the content
 * matches.
 *
 * ## Which paths are expected to be links
 *
 * Derived, never listed here. Two surfaces own the answer, and each is read
 * from the tree that defines it:
 *
 * - every rule the package ships is read here through its shipped copy, so
 *   `.agents/rules/<name>` is a link for each `<name>` under
 *   `packages/qfai/assets/init/root/.agents/rules/`. A rule about this
 *   repository alone has no shipped copy and is a real file.
 * - `.claude/rules/` is the tool-specific entry point onto `.agents/rules/`, so
 *   every name present in both is a link on the `.claude` side.
 *
 * A rule added to either tree is covered by the same derivation, with no second
 * list to keep in step.
 *
 * Usage:
 *   node scripts/check-tracked-symlinks.mjs
 *
 * Exit codes: 0 clean, 1 a regular file where a link belongs, 2 the index could
 * not be read.
 */
/* global console, process */
import { execFileSync } from "node:child_process";

const SYMLINK_MODE = "120000";

const SHIPPED_RULES = "packages/qfai/assets/init/root/.agents/rules";
const OPERATING_RULES = ".agents/rules";
const CLAUDE_RULES = ".claude/rules";

/** `git ls-files -s`, as `{ mode, path }` rows. */
function indexEntries() {
  const out = execFileSync("git", ["ls-files", "-s", "-z"], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const rows = [];
  for (const record of out.split("\0")) {
    if (record === "") continue;
    // `<mode> <sha> <stage>\t<path>`
    const tab = record.indexOf("\t");
    if (tab === -1) continue;
    rows.push({ mode: record.slice(0, record.indexOf(" ")), path: record.slice(tab + 1) });
  }
  return rows;
}

/** The basenames tracked directly under `dir`. */
function namesUnder(entries, dir) {
  const prefix = `${dir}/`;
  const names = new Set();
  for (const entry of entries) {
    if (!entry.path.startsWith(prefix)) continue;
    const rest = entry.path.slice(prefix.length);
    if (rest.includes("/")) continue;
    names.add(rest);
  }
  return names;
}

/**
 * Paths that must be links, and the mode each is staged with.
 *
 * A path absent from the index is not reported: adding the rule is a different
 * change from linking it, and the suites that read the rules register already
 * fail on a master nothing registers.
 */
export function expectedLinks(entries) {
  const modes = new Map(entries.map((entry) => [entry.path, entry.mode]));
  const shipped = namesUnder(entries, SHIPPED_RULES);
  const operating = namesUnder(entries, OPERATING_RULES);

  const expected = [];
  for (const name of shipped) {
    expected.push({ path: `${OPERATING_RULES}/${name}`, why: "the package ships this rule" });
  }
  for (const name of operating) {
    if (!modes.has(`${CLAUDE_RULES}/${name}`)) continue;
    expected.push({
      path: `${CLAUDE_RULES}/${name}`,
      why: `it is the entry point onto ${OPERATING_RULES}`,
    });
  }

  return expected
    .filter((item) => modes.has(item.path))
    .map((item) => ({ ...item, mode: modes.get(item.path) }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));
}

function main() {
  let entries;
  try {
    entries = indexEntries();
  } catch (error) {
    console.error(`check-tracked-symlinks: cannot read the index: ${String(error)}`);
    return 2;
  }

  const expected = expectedLinks(entries);
  const copies = expected.filter((item) => item.mode !== SYMLINK_MODE);

  if (copies.length === 0) {
    console.log(
      `check-tracked-symlinks: ${String(expected.length)} path(s) checked, each staged as a link.`,
    );
    return 0;
  }

  for (const copy of copies) {
    console.error(
      `::error file=${copy.path}::${copy.path} is staged with mode ${String(copy.mode)}, not ${SYMLINK_MODE}, ` +
        `and it must be a link because ${copy.why}. A copy is byte-identical to its target, so it ` +
        `passes every check that reads content and stops matching the moment the target changes.`,
    );
  }
  console.error(
    [
      "",
      "check-tracked-symlinks: re-create each path as a link, then check the mode:",
      "",
      "    MSYS=winsymlinks:nativestrict ln -s <relative-target> <path>",
      "    git add <path>",
      "    git ls-files -s <path>   # 120000 is a link, 100644 is a copy",
      "",
      "The environment variable is inert outside Git Bash on Windows and required inside it.",
    ].join("\n"),
  );
  return 1;
}

if (import.meta.url.endsWith("check-tracked-symlinks.mjs") && process.argv[1] !== undefined) {
  process.exitCode = main();
}
