/**
 * What a pull request does to the changelog entries, held against the base.
 *
 * Two things go wrong without anyone deciding them, and `check-changelog-released-sections.mjs`
 * sees neither:
 *
 * - An entry a merged change added is dropped while a later merge resolves a
 *   conflict in `CHANGELOG.md`. The file stays well-formed, so nothing reports it.
 * - A change to shipped behaviour merges with no entry at all, and the entry is
 *   written at release time from the history, without the change's author.
 *
 * ## What it refuses
 *
 * 1. An entry title present at the base and absent from HEAD, in any section.
 *    An entry is the first line of a top-level `- ` bullet, which is where the
 *    bolded title lives; `check-release-notes.mjs` reads them the same way and
 *    this imports that reader. A title reworded counts as a removal of the old
 *    one.
 * 2. A change under `packages/qfai/src/` or `packages/qfai/assets/` that leaves
 *    the text of `## [Unreleased]` as it was.
 *
 * ## The opt-out
 *
 * A commit message in the pull request carries a line
 * `Changelog-Exempt: <reason>`. It covers both refusals, for a change that no
 * user sees or an entry that was removed or reworded on purpose. The reason is
 * required, so the line cannot be written without saying why.
 *
 * ## When it runs
 *
 * On a pull request, and when run by hand. On a push the range is a merge that
 * has already landed, where an opt-out can no longer be written, so nothing is
 * compared.
 *
 * ## The base
 *
 * The one `check-shipped-ci-parity.mjs` resolves: the merge base with
 * `origin/main`. An unresolvable base warns and passes, because a check that
 * cannot compute its answer must not invent one.
 *
 * Exit codes: 0 clean, exempt or base unresolvable / 1 refused / 2 a bad invocation.
 *
 * Usage: `node scripts/check-changelog-entries.mjs [--base <ref>]`
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { argv, env, exit, stderr, stdout } from "node:process";
import { pathToFileURL } from "node:url";

import { entryTitles } from "./check-release-notes.mjs";
import { blobAt, resolveRange } from "./check-shipped-ci-parity.mjs";

const CHANGELOG = "CHANGELOG.md";

/** The paths whose change is a change to what a user receives. */
const SHIPPED_PREFIXES = ["packages/qfai/src/", "packages/qfai/assets/"];

const EXEMPT_RE = /^Changelog-Exempt:[ \t]+(\S.*?)[ \t]*$/m;

const REMEDIATION = [
  "Keep the entries a merged change added, and describe a change to shipped",
  "behaviour in `## [Unreleased]` of CHANGELOG.md.",
  "",
  "A change no user sees, or an entry removed or reworded on purpose, says so in a",
  "commit message of this pull request with a line:",
  "",
  "  Changelog-Exempt: <why no entry is needed or why the entry changed>",
].join("\n");

/** The entry titles `base` carries that `head` does not. */
export function removedEntries(base, head) {
  const kept = new Set(entryTitles(head));
  return entryTitles(base).filter((title) => !kept.has(title));
}

/** The text between `## [Unreleased]` and the next `## ` heading, or `""` when there is none. */
export function unreleasedText(changelog) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => /^## \[Unreleased\][ \t]*$/.test(line));
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

/** The shipped paths among `changed`. */
export function shippedPaths(changed) {
  return changed.filter((rel) => SHIPPED_PREFIXES.some((prefix) => rel.startsWith(prefix)));
}

/** The reason of the first `Changelog-Exempt:` line in `messages`, or `null`. */
export function exemptionReason(messages) {
  return EXEMPT_RE.exec(messages)?.[1] ?? null;
}

/** The problems one change has with the changelog, each a sentence naming what to fix. */
export function problemsOf({ base, head, changed }) {
  const problems = [];
  for (const title of removedEntries(base, head)) {
    problems.push(`an entry the base carries is gone: ${title}`);
  }
  const shipped = shippedPaths(changed);
  if (shipped.length > 0 && unreleasedText(base) === unreleasedText(head)) {
    problems.push(
      `${shipped.length} shipped file(s) changed and \`## [Unreleased]\` did not, first: ${shipped[0]}`,
    );
  }
  return problems;
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf-8" });
  return result.status === 0 ? result.stdout : null;
}

/** The `--base` value, `undefined` when absent, or `null` for any other argument list. */
export function parseBase(args) {
  if (args.length === 0) return undefined;
  if (args.length === 2 && args[0] === "--base") return args[1];
  return null;
}

function main() {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    stdout.write("Usage: check-changelog-entries.mjs [--base <ref>]\n");
    return 0;
  }
  const baseArg = parseBase(args);
  if (baseArg === null) {
    stderr.write("check-changelog-entries: expected `--base <ref>` or nothing\n");
    return 2;
  }

  if (env.GITHUB_EVENT_NAME === "push") {
    stdout.write("check-changelog-entries: a push is not compared; nothing checked.\n");
    return 0;
  }

  const range = resolveRange(baseArg);
  if (range.unresolvable !== undefined) {
    stdout.write(`check-changelog-entries: ${range.unresolvable}; nothing compared.\n`);
    return 0;
  }

  const base = blobAt(range.baseRev, CHANGELOG);
  if (base === null) {
    stdout.write(
      `check-changelog-entries: ${CHANGELOG} is absent at ${range.baseRev}; nothing compared.\n`,
    );
    return 0;
  }
  const changed = git(["diff", "--name-only", range.range]);
  const messages = git(["log", "--format=%B", `${range.baseRev}..HEAD`]);
  if (changed === null || messages === null) {
    stdout.write("check-changelog-entries: the range could not be read; nothing compared.\n");
    return 0;
  }

  const problems = problemsOf({
    base,
    head: readFileSync(CHANGELOG, "utf-8"),
    changed: changed.split("\n").filter((line) => line !== ""),
  });
  if (problems.length === 0) {
    stdout.write("check-changelog-entries: the changelog entries match the change.\n");
    return 0;
  }

  const reason = exemptionReason(messages);
  if (reason !== null) {
    stdout.write(`check-changelog-entries: exempt, reason: ${reason}\n`);
    return 0;
  }

  stderr.write("\n");
  for (const problem of problems) stderr.write(`${problem}\n`);
  stderr.write(`\n${REMEDIATION}\n`);
  return 1;
}

// `pathToFileURL`: on Windows `argv[1]` is a drive-letter path with backslashes, and a
// comparison built by concatenation never fires.
if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  exit(main());
}
