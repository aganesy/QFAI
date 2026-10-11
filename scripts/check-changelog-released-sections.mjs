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
 * `--fix --base <local-ref>` moves complete added blocks only when removing
 * them restores every changed tagged section byte for byte. It refuses mixed
 * corrections and unknown tag answers, and writes only the working changelog.
 * The read-only check keeps the correction and unresolved-base rules above.
 *
 * Exit codes: 0 clean or base unresolvable / 1 a tagged section gained an
 * entry or a repair was refused / 2 a bad invocation.
 *
 * Usage: `node scripts/check-changelog-released-sections.mjs [--base <ref>] [--fix]`
 */
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, writeFileSync } from "node:fs";
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

const CATEGORIES = new Set(["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"]);

/** Original line offsets; headings and bullets inside fences remain entry content. */
function spans(text) {
  const lines = [...text.matchAll(/[^\n]*\n|[^\n]+$/gu)].map((match, index) => ({
    text: match[0].replace(/\r?\n$/u, ""),
    start: match.index,
    end: match.index + match[0].length,
    number: index + 1,
  }));
  const sections = [];
  let section = null;
  let category = null;
  let entry = null;
  let fence = null;
  function finish(offset) {
    if (entry !== null) entry.end = offset;
    if (category !== null) category.end = offset;
  }
  for (const line of lines) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line.text);
    if (marker !== null) {
      const run = marker[1];
      if (fence === null) fence = { marker: run[0], length: run.length };
      else if (run[0] === fence.marker && run.length >= fence.length && marker[2].trim() === "")
        fence = null;
      continue;
    }
    if (fence !== null) continue;
    if (/^## /u.test(line.text)) {
      finish(line.start);
      if (section !== null) section.end = line.start;
      const released = /^## \[(\d+\.\d+\.\d+)\][ \t]+-[ \t]+\d{4}-\d{2}-\d{2}[ \t]*$/u.exec(
        line.text,
      );
      section = {
        version: released?.[1] ?? null,
        unreleased: /^## \[Unreleased\][ \t]*$/u.test(line.text),
        start: line.start,
        end: text.length,
        categories: [],
        entries: [],
      };
      sections.push(section);
      category = null;
      entry = null;
      continue;
    }
    if (section === null) continue;
    const heading = /^### (.+)$/u.exec(line.text);
    if (heading !== null) {
      finish(line.start);
      category = { name: heading[1], start: line.start, end: section.end };
      section.categories.push(category);
      entry = null;
      continue;
    }
    const titles = entryTitles(line.text);
    if (titles.length === 0) continue;
    if (entry !== null) entry.end = line.start;
    entry = {
      title: titles[0],
      category: category?.name ?? null,
      start: line.start,
      end: section.end,
      line: line.number,
    };
    section.entries.push(entry);
  }
  finish(text.length);
  if (fence !== null) throw new Error("an unclosed fence makes entry boundaries ambiguous");
  const versions = sections.filter((item) => item.version !== null).map((item) => item.version);
  if (new Set(versions).size !== versions.length)
    throw new Error("duplicate released section heading");
  return { sections, lines };
}

function validCategories(section) {
  const names = section.categories.map((item) => item.name);
  if (names.some((name) => !CATEGORIES.has(name)) || new Set(names).size !== names.length) {
    throw new Error("unknown or duplicate category heading");
  }
  const titles = section.entries.map((item) => titleKey(item.title));
  if (new Set(titles).size !== titles.length) throw new Error("duplicate entry title");
}

/** Remove complete added blocks only when every remaining source byte equals the base. */
function sourceBlocks(text, section, before, candidates, lines) {
  const relevant = lines.filter((line) => line.start >= section.start && line.start < section.end);
  const removed = new Set();
  const moves = candidates.map((entry) => {
    const body = relevant.filter((line) => line.start >= entry.start && line.start < entry.end);
    while (body.length > 0 && body.at(-1).text.trim() === "") body.pop();
    const end = body.at(-1).end;
    for (const line of body) removed.add(line.start);
    return {
      ...entry,
      version: section.version,
      block: text.slice(entry.start, end),
      lastLine: body.at(-1).number,
    };
  });
  const wanted = [...before.matchAll(/[^\n]*\n|[^\n]+$/gu)].map((match) => match[0]);
  let next = 0;
  let restored = "";
  for (let index = 0; index < relevant.length; index += 1) {
    const line = relevant[index];
    if (removed.has(line.start)) continue;
    const raw = text.slice(line.start, line.end);
    if (raw === wanted[next]) {
      restored += raw;
      next += 1;
      continue;
    }
    // Blank separators beside a moved block belong to it only when retaining
    // them would disagree with the base. No prose or historical byte is dropped.
    let left = index - 1;
    let right = index + 1;
    while (left >= 0 && relevant[left].text.trim() === "") left -= 1;
    while (right < relevant.length && relevant[right].text.trim() === "") right += 1;
    if (
      line.text.trim() === "" &&
      (removed.has(relevant[left]?.start) || removed.has(relevant[right]?.start))
    )
      continue;
    throw new Error(
      `${section.version}: removing added blocks does not restore the section byte-for-byte`,
    );
  }
  if (restored !== before)
    throw new Error(
      `${section.version}: removing added blocks does not restore the section byte-for-byte`,
    );
  return moves;
}

/** Compute the whole repair before any file is opened for writing. */
function planRepair(base, head, tagged) {
  const before = spans(base);
  const after = spans(head);
  for (const section of before.sections) {
    if (
      section.version !== null &&
      !after.sections.some((item) => item.version === section.version)
    ) {
      throw new Error(`missing or renamed released section ${section.version}`);
    }
  }
  const destinations = after.sections.filter((section) => section.unreleased);
  if (destinations.length !== 1) throw new Error("repair needs exactly one Unreleased section");
  const destination = destinations[0];
  validCategories(destination);
  const destinationKeys = new Set(destination.entries.map((entry) => titleKey(entry.title)));
  const moves = [];
  const edits = [];
  for (const section of after.sections) {
    if (section.version === null) continue;
    const old = before.sections.find((item) => item.version === section.version);
    if (old === undefined) continue;
    const known = new Set(old.entries.map((entry) => titleKey(entry.title)));
    const candidates = section.entries.filter((entry) => !known.has(titleKey(entry.title)));
    const oldText = base.slice(old.start, old.end);
    if (candidates.length === 0 && head.slice(section.start, section.end) === oldText) continue;
    const released = tagged(section.version);
    if (released === null) throw new Error(`the tag v${section.version} could not be verified`);
    if (released === false) continue;
    if (candidates.length === 0)
      throw new Error(
        `${section.version}: removing added blocks does not restore the section byte-for-byte`,
      );
    validCategories(section);
    validCategories(old);
    if (candidates.some((entry) => !CATEGORIES.has(entry.category)))
      throw new Error("an added entry has no supported category");
    const blocks = sourceBlocks(
      head,
      section,
      base.slice(old.start, old.end),
      candidates,
      after.lines,
    );
    for (const move of blocks) {
      const key = titleKey(move.title);
      if (destinationKeys.has(key)) throw new Error("duplicate destination entry title");
      destinationKeys.add(key);
      moves.push(move);
    }
    edits.push({
      start: section.start,
      end: section.end,
      text: base.slice(old.start, old.end),
    });
  }
  let text = head;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  const restored = spans(text).sections.find((section) => section.unreleased);
  const newline = head.includes("\r\n") ? "\r\n" : "\n";
  const grouped = new Map();
  for (const move of moves) {
    const blocks = grouped.get(move.category) ?? [];
    blocks.push(move.block);
    grouped.set(move.category, blocks);
  }
  const insertions = new Map();
  let absent = "";
  for (const [name, blocks] of grouped) {
    const content = blocks.join(newline) + newline;
    const category = restored.categories.find((item) => item.name === name);
    if (category === undefined) absent += `### ${name}${newline}${newline}${content}`;
    else {
      const prefix = text.slice(category.start, category.end).endsWith(newline + newline)
        ? ""
        : newline;
      insertions.set(category.end, (insertions.get(category.end) ?? "") + prefix + content);
    }
  }
  if (absent !== "") {
    const prefix = text.slice(restored.start, restored.end).endsWith(newline + newline)
      ? ""
      : newline;
    insertions.set(restored.end, (insertions.get(restored.end) ?? "") + prefix + absent);
  }
  for (const [offset, insertion] of [...insertions].sort(([a], [b]) => b - a)) {
    text = text.slice(0, offset) + insertion + text.slice(offset);
  }
  return { text, moves };
}

function resolveCommit(ref) {
  if (typeof ref !== "string" || ref === "" || ref.startsWith("-"))
    throw new Error("--fix --base needs a resolvable local commit");
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`],
    { encoding: "utf-8" },
  );
  if (result.status !== 0)
    throw new Error(`the local base ${JSON.stringify(ref)} could not be resolved`);
  return result.stdout.trim();
}

function ownedChangelog() {
  const stat = lstatSync(CHANGELOG);
  if (!stat.isFile() || stat.nlink !== 1)
    throw new Error(`${CHANGELOG} must be a regular file with one link`);
  return stat;
}

function repairChangelog(baseRef) {
  const baseSha = resolveCommit(baseRef);
  const headSha = headCommit();
  const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", baseSha, headSha], {
    encoding: "utf-8",
  });
  if (ancestor.status !== 0) throw new Error("the repair base must be an ancestor of HEAD");
  const baseRead = spawnSync("git", ["show", `${baseSha}:${CHANGELOG}`], {
    maxBuffer: 128 * 1024 * 1024,
  });
  if (baseRead.status !== 0) throw new Error(`${CHANGELOG} is absent at the repair base`);
  const base = baseRead.stdout.toString("utf-8");
  if (!Buffer.from(base, "utf-8").equals(baseRead.stdout))
    throw new Error("the base changelog must contain valid UTF-8 text");
  const owner = ownedChangelog();
  const originalBytes = readFileSync(CHANGELOG);
  const original = originalBytes.toString("utf-8");
  if (!Buffer.from(original, "utf-8").equals(originalBytes))
    throw new Error("CHANGELOG.md must contain valid UTF-8 text");
  const plan = planRepair(base, original, (version) => tagOnOrigin(version, headSha));
  const currentOwner = ownedChangelog();
  if (
    headCommit() !== headSha ||
    resolveCommit(baseRef) !== baseSha ||
    blobAt(baseSha, CHANGELOG) !== base ||
    !readFileSync(CHANGELOG).equals(originalBytes) ||
    currentOwner.dev !== owner.dev ||
    currentOwner.ino !== owner.ino
  ) {
    throw new Error(
      "HEAD, base or CHANGELOG.md changed while the repair was prepared; nothing written",
    );
  }
  if (plan.text !== original) writeFileSync(CHANGELOG, plan.text);
  for (const move of plan.moves)
    stdout.write(
      `${move.version} / ${move.category}: lines ${move.line}-${move.lastLine} ${move.title} -> Unreleased / ${move.category}\n`,
    );
  stdout.write(
    plan.moves.length === 0
      ? "check-changelog-released-sections: nothing to repair.\n"
      : "check-changelog-released-sections: repaired CHANGELOG.md; review and commit the diff.\n",
  );
  return 0;
}

function parseArgs(args) {
  const out = {};
  for (let i = 2; i < args.length; i += 1) {
    if (args[i] === "--fix") {
      out.fix = true;
    } else if (args[i] === "--base") {
      if (args[i + 1] === undefined || args[i + 1].startsWith("--")) {
        stderr.write("check-changelog-released-sections: --base needs a ref\n");
        return null;
      }
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
        "Usage: check-changelog-released-sections.mjs [--base <ref>] [--fix]",
        "",
        "Refuses a change that adds an entry to a changelog section already released,",
        "meaning one whose tag v<version> exists.",
        "",
        "  --base <ref>   compare against <ref> (default: $BASE_REF or origin/main).",
        "                 On a push event it is the previous head instead.",
        "  --fix          move only proven added blocks to Unreleased; requires --base.",
        "",
      ].join("\n"),
    );
    return 0;
  }

  if (args.fix === true) {
    if (args.base === undefined) {
      stderr.write("check-changelog-released-sections: --fix requires --base <local-ref>\n");
      return 2;
    }
    try {
      return repairChangelog(args.base);
    } catch (cause) {
      stderr.write(
        `check-changelog-released-sections: ${cause instanceof Error ? cause.message : String(cause)}\n`,
      );
      return 1;
    }
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
  try {
    const details = spans(head);
    for (const { version, gained } of added) {
      const section = details.sections.find((item) => item.version === version);
      for (const entry of section?.entries ?? []) {
        if (!gained.some((title) => titleKey(title) === titleKey(entry.title))) continue;
        const last = details.lines
          .filter(
            (line) =>
              line.start >= entry.start && line.start < entry.end && line.text.trim() !== "",
          )
          .at(-1);
        stderr.write(
          `${version} / ${entry.category ?? "unknown category"}: lines ${entry.line}-${last?.number ?? entry.line} ${entry.title} -> Unreleased / ${entry.category ?? "choose category"}\n`,
        );
      }
    }
  } catch (cause) {
    stderr.write(
      `Precise move locations unavailable: ${cause instanceof Error ? cause.message : String(cause)}\n`,
    );
  }
  stderr.write(
    `\n${REMEDIATION}\n\nRepair pure additions with:\nnode scripts/check-changelog-released-sections.mjs --fix --base ${range.baseRev}\n`,
  );
  return 1;
}

// `pathToFileURL`, for the reason `check-shipped-ci-parity.mjs` gives: on
// Windows `argv[1]` is a drive-letter path with backslashes, and a guard built
// by concatenation never fires.
if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  exit(main());
}
