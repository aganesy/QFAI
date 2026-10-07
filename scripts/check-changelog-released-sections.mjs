/**
 * A released changelog section, held against what it said when it was released.
 *
 * Released means tagged: a section counts once the tag `v<version>` exists.
 * Until then no release page was built from it, so it may still gain entries.
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
 * is a correction to what the release said and not a claim it never made. A
 * title that differs only in whitespace is the same entry.
 *
 * ## The tag
 *
 * The local tags answer first, so a clone that holds the tag needs no network.
 * Only when no local tag exists does `git ls-remote --tags origin
 * refs/tags/v<version>` answer, which works in a shallow checkout. A tag on
 * HEAD itself is the release being cut and does not count, so the push that
 * merges a release passes. A remote lookup that fails refuses the section as
 * released and prints a note: an unknown answer does not open a released
 * section.
 *
 * ## The base
 *
 * The same one `check-shipped-ci-parity.mjs` resolves, imported from it: the
 * merge base with `origin/main` on a pull request, and the previous head on a
 * push, where comparing a branch against itself would report nothing forever.
 * An unresolvable base warns and passes, because a check that cannot compute
 * its answer must not invent one.
 *
 * Exit codes: 0 clean or base unresolvable / 1 a tagged section gained an
 * entry / 2 a bad invocation.
 *
 * Usage: `node scripts/check-changelog-released-sections.mjs [--base <ref>]`
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { argv, exit, stderr, stdout } from "node:process";
import { pathToFileURL } from "node:url";

import { entryTitles, releasedSections } from "./check-release-notes.mjs";
import { blobAt, resolveRange } from "./check-shipped-ci-parity.mjs";

const CHANGELOG = "CHANGELOG.md";

const REMEDIATION = [
  "A released section, one whose tag v<version> exists, may not gain an entry: the",
  "release page was built from that section at its tag and nothing reads the file",
  "again, so the entry is in the repository and in no page anybody reads.",
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

/** An entry title with every whitespace character removed. */
function titleKey(title) {
  return title.replace(/\s+/gu, "");
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
    // Compared without whitespace: restoring a missing or doubled space in a
    // title is a correction to how it reads, not a new entry.
    const hadKeys = new Set([...had].map(titleKey));
    const gained = [...titles].filter((title) => !hadKeys.has(titleKey(title)));
    if (gained.length > 0) added.push({ version, gained });
  }
  return added;
}

/**
 * Whether an `ls-remote` listing of one tag names a release built before
 * `head`: true when the tag exists on another commit, false when there is no
 * tag or it points at `head` itself. An annotated tag lists twice, and the
 * peeled `^{}` line is the commit.
 *
 * A tag on `head` is the release being cut. The merge that folds
 * `## [Unreleased]` into the released section is the commit the tag is pushed
 * to, so no release page has been built from the section yet.
 */
export function taggedBefore(listing, head) {
  const lines = listing
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 2);
  if (lines.length === 0) return false;
  const peeled = lines.find(([, ref]) => ref.endsWith("^{}"));
  const [commit] = peeled ?? lines[0];
  return commit !== head;
}

/** The commit the local tag `v<version>` names, or null when there is no such local tag. */
function localTagCommit(version) {
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", "--quiet", `refs/tags/v${version}^{commit}`],
    {
      encoding: "utf-8",
    },
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

/** The `ls-remote` listing of the tag `v<version>` on origin, or null when the lookup failed. */
function remoteTagListing(version) {
  const ref = `refs/tags/v${version}`;
  const result = spawnSync("git", ["ls-remote", "--tags", "origin", ref, `${ref}^{}`], {
    encoding: "utf-8",
  });
  return result.status === 0 ? result.stdout : null;
}

function headCommit() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

const defaultLookups = { local: localTagCommit, remote: remoteTagListing };

/**
 * Whether `v<version>` names a release built before `head`: true, false, or
 * null when the answer needs the remote and the lookup failed. The local tag
 * answers first; the remote is asked only when no local tag exists.
 */
export function tagOnOrigin(version, head = headCommit(), lookups = defaultLookups) {
  const local = lookups.local(version);
  if (local !== null) return local !== head;
  const listing = lookups.remote(version);
  return listing === null ? null : taggedBefore(listing, head);
}

/**
 * The additions to sections that are released, meaning tagged. A section whose
 * tag lookup failed counts as released, with a note.
 */
export function releasedAdditions(added, tagExists) {
  const refused = [];
  const notes = [];
  for (const entry of added) {
    const tagged = tagExists(entry.version);
    if (tagged === false) continue;
    if (tagged === null) {
      notes.push(
        `the tag v${entry.version} could not be looked up; the section is treated as released.`,
      );
    }
    refused.push(entry);
  }
  return { refused, notes };
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
        "Refuses a change that adds an entry to a changelog section already released,",
        "meaning one whose tag v<version> exists.",
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

  const { refused: added, notes } = releasedAdditions(addedEntries(base, head), tagOnOrigin);
  for (const note of notes) stdout.write(`check-changelog-released-sections: ${note}\n`);
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
