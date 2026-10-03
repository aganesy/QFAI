/**
 * A released changelog section, held against what it said when it was released.
 *
 * `release.yml` cuts the `## [X.Y.Z] - …` section out of `CHANGELOG.md` at the
 * tagged commit and creates the GitHub Release once. Nothing reads the file
 * again, so an entry appended to that section afterwards exists in the
 * repository and in no release page anybody reads.
 *
 * `check-release-notes.mjs` reports that state, daily, once it has happened.
 * This refuses the change that causes it, on the pull request that carries it.
 *
 * ## How a released section gains an entry
 *
 * Not by anyone deciding to write one. `## [Unreleased]` is renamed at release
 * time, and a branch whose work predates the release still carries its entry
 * under the heading that was `## [Unreleased]` when the branch was cut. Merged
 * after the release, the entry lands under the released heading by default —
 * which is how one section reached 77 of them.
 *
 * ## What it compares
 *
 * Entry titles, per released section, between the base and HEAD. An entry is a
 * top-level `- ` bullet's own line, which is where the bolded title lives;
 * `check-release-notes.mjs` reads them the same way, and this imports that
 * reader rather than writing a second one.
 *
 * A section the base does not carry is skipped, which is what makes a release
 * commit legal: renaming `## [Unreleased]` creates a released section holding
 * every entry the unreleased one held, and none of them is new.
 *
 * Only additions are refused. An entry removed, or a section's prose reworded,
 * is a correction to what the release said and not a claim it never made.
 *
 * ## The base
 *
 * The same one `check-shipped-ci-parity.mjs` resolves, imported from it: the
 * merge base with `origin/main` on a pull request, and the previous head on a
 * push, where comparing a branch against itself would report nothing forever.
 * An unresolvable base warns and passes, because a check that cannot compute
 * its answer must not invent one.
 *
 * Exit codes: 0 clean or base unresolvable / 1 a released section gained an
 * entry / 2 a bad invocation.
 *
 * Usage: `node scripts/check-changelog-released-sections.mjs [--base <ref>]`
 */
import { readFileSync } from "node:fs";
import { argv, exit, stderr, stdout } from "node:process";
import { pathToFileURL } from "node:url";

import { entryTitles, releasedSections } from "./check-release-notes.mjs";
import { blobAt, resolveRange } from "./check-shipped-ci-parity.mjs";

const CHANGELOG = "CHANGELOG.md";

const REMEDIATION = [
  "A released section may not gain an entry: the release page was built from that",
  "section at its tag and nothing reads the file again, so the entry is in the",
  "repository and in no page anybody reads.",
  "",
  "Move it to `## [Unreleased]`. A branch cut before a release carries its entry",
  "under the heading that was unreleased then, and merging after the release",
  "leaves it under the released one.",
].join("\n");

/** Every released section of one changelog text, as version to entry titles. */
export function sectionEntries(changelog) {
  const entries = new Map();
  for (const section of releasedSections(changelog)) {
    entries.set(section.version, new Set(entryTitles(section.body)));
  }
  return entries;
}

/** Each released section the head added an entry to, with the entries it added. */
export function addedEntries(baseChangelog, headChangelog) {
  const before = sectionEntries(baseChangelog);
  const added = [];
  for (const [version, titles] of sectionEntries(headChangelog)) {
    const had = before.get(version);
    // A section the base does not carry is the release commit's own, and every
    // entry in it came from `## [Unreleased]` rather than from this change.
    if (had === undefined) continue;
    const gained = [...titles].filter((title) => !had.has(title));
    if (gained.length > 0) added.push({ version, gained });
  }
  return added;
}

function parseArgs(args) {
  const out = {};
  for (let i = 2; i < args.length; i += 1) {
    if (args[i] === "--base") {
      out.base = args[i + 1];
      i += 1;
    } else if (args[i] === "--help" || args[i] === "-h") {
      out.help = true;
    } else {
      stderr.write(
        `check-changelog-released-sections: unknown argument ${JSON.stringify(args[i])}\n`,
      );
      return null;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(argv);
  if (args === null) return 2;
  if (args.help === true) {
    stdout.write(
      [
        "Usage: check-changelog-released-sections.mjs [--base <ref>]",
        "",
        "Refuses a change that adds an entry to a changelog section already released.",
        "",
        "  --base <ref>   compare against <ref> (default: $BASE_REF or origin/main).",
        "                 On a push event it is the previous head instead.",
        "",
      ].join("\n"),
    );
    return 0;
  }

  const range = resolveRange(args.base);
  if (range.unresolvable !== undefined) {
    stdout.write(`check-changelog-released-sections: ${range.unresolvable}; nothing compared.\n`);
    return 0;
  }
  if (range.note !== undefined) {
    stdout.write(`check-changelog-released-sections: ${range.note}\n`);
  }

  const base = blobAt(range.baseRev, CHANGELOG);
  if (base === null) {
    stdout.write(
      `check-changelog-released-sections: ${CHANGELOG} is absent at ${range.baseRev}; nothing compared.\n`,
    );
    return 0;
  }
  const head = readFileSync(CHANGELOG, "utf-8");

  const added = addedEntries(base, head);
  if (added.length === 0) {
    stdout.write("check-changelog-released-sections: no released section gained an entry.\n");
    return 0;
  }

  stderr.write("\n");
  for (const { version, gained } of added) {
    stderr.write(`${version}: ${gained.length} entr(y|ies) added after that release was built:\n`);
    for (const title of gained) stderr.write(`  ${title}\n`);
  }
  stderr.write(`\n${REMEDIATION}\n`);
  return 1;
}

// `pathToFileURL`, for the reason `check-shipped-ci-parity.mjs` gives: on
// Windows `argv[1]` is a drive-letter path with backslashes, and a guard built
// by concatenation never fires.
if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  exit(main());
}
