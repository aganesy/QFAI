/**
 * The shape of `## [Unreleased]`, which is the section a release publishes.
 *
 * Keep a Changelog gives one heading per change type per release. This one
 * carries several of each, and they accumulate one merge at a time: a branch
 * adding an entry writes its own type heading rather than finding the existing
 * one, and the two shapes are identical in a diff, so nothing in review reads
 * as wrong.
 *
 * What that costs is the property the grouping exists for. A reader looking for
 * what changed reads the first `### Fixed`, finds four entries, and has no
 * signal that more `### Fixed` groups follow further down — and an entry's type
 * stops being answerable by which group it is in, because there are several of
 * each. A release renames this heading to `## [X.Y.Z]` and ships that structure
 * as the published notes.
 *
 * The counts below are the backlog, not the target. They may only fall. Holding
 * the current number rather than demanding one is what lets this land while
 * other branches are open: consolidating the groups is a single edit to the one
 * file every open pull request touches, so it wants a quiet moment, and until
 * it comes the count must at least stop climbing.
 *
 * Released sections are out of scope. They are published history, and rewriting
 * them is a separate decision from stopping the next one from shipping this way.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/unit/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The six Keep a Changelog names, which are the whole of what a type may be. */
const CHANGE_TYPES = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"];

/**
 * How many headings of each type `## [Unreleased]` carries today.
 *
 * A type absent from this record is held at one, so a section's first
 * `### Security` needs no entry here. Consolidating a type means striking its
 * number down to 1 in the same commit — left as it is, the number is a slot the
 * next parallel merge can take.
 */
const HEADING_BACKLOG: Readonly<Record<string, number>> = {
  Added: 5,
  Changed: 5,
  Fixed: 8,
  Removed: 3,
};

/** The lines under `## [Unreleased]`, up to the first released section. */
function unreleasedSection(changelog: string): string[] {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => /^## \[Unreleased\]/.test(line));
  expect(start, "CHANGELOG.md has no `## [Unreleased]` section").toBeGreaterThan(-1);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^## \[/.test(line));
  return end === -1 ? rest : rest.slice(0, end);
}

/** Each `### ` heading's text, in the order it appears. */
function headings(section: string[]): string[] {
  return section
    .map((line) => /^### (.+?)\s*$/.exec(line)?.[1])
    .filter((text): text is string => text !== undefined);
}

describe("the unreleased section groups its entries by type", () => {
  const changelog = (): Promise<string> => readFile(path.join(repoRoot, "CHANGELOG.md"), "utf-8");

  it("finds the section it reads", async () => {
    // An empty read passes both cases below without asking anything, and a
    // renamed or moved heading looks identical to a green run.
    expect(headings(unreleasedSection(await changelog())).length).toBeGreaterThan(0);
  });

  it("opens with a group rather than with entries", async () => {
    // An entry above the first `### ` heading belongs to no type at all. It
    // renders as a list under the release heading, so nothing about it looks
    // wrong, and the group headings below it are still counted — which is how
    // an insertion that missed the heading passes every count.
    const section = unreleasedSection(await changelog());
    const firstHeading = section.findIndex((line) => /^### /.test(line));
    const before = section.slice(0, firstHeading === -1 ? section.length : firstHeading);
    expect(
      before.filter((line) => line.trim() !== ""),
      "an entry under `## [Unreleased]` that no change-type group holds",
    ).toEqual([]);
  });

  it("names every group with one of the change types", async () => {
    // A qualified heading — `Fixed (third review wave)` — is a group nothing
    // can find by type, and the released sections carry dozens of them. The
    // next release does not.
    const unknown = headings(unreleasedSection(await changelog())).filter(
      (text) => !CHANGE_TYPES.includes(text),
    );
    expect(unknown, `a group heading outside ${CHANGE_TYPES.join(" / ")}`).toEqual([]);
  });

  it("carries the recorded number of each, and no more", async () => {
    const counted = new Map<string, number>();
    for (const text of headings(unreleasedSection(await changelog()))) {
      counted.set(text, (counted.get(text) ?? 0) + 1);
    }
    const recorded = new Map(
      CHANGE_TYPES.map((type) => [type, HEADING_BACKLOG[type] ?? 1] as const),
    );
    // Exact, in both directions. Over the record is a group that climbed while
    // nobody was looking; under it is a slot left open for the next branch to
    // take, which is how the record stops being a backlog and becomes a budget.
    const drifted = [...counted]
      .filter(([type, count]) => count !== recorded.get(type))
      .map(([type, count]) => `${type}: ${count} present, ${recorded.get(type) ?? 1} recorded`);
    expect(
      drifted,
      "put the entry under the group that is already there, or strike the recorded number down with the merge",
    ).toEqual([]);
  });
});
