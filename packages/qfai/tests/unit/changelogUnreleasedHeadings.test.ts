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
 * The groups are merged and the record below is empty, so every type is held at
 * one. What the record exists for is a backlog: a number in it is a count this
 * section carries today and may not exceed, and striking it goes in the same
 * commit as the merge that earns it.
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
 * Types this section is allowed more than one heading of.
 *
 * Empty, which is the finished state: every type is held at one. It is a record
 * rather than a constant so a future backlog has somewhere to be written down
 * and worked off, the way this one was — a number left here after its groups
 * are merged is a slot the next parallel merge can take.
 */
const HEADING_BACKLOG: Readonly<Record<string, number>> = {};

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

/** Lines the section holds above its first group, blanks dropped. */
function entriesAboveFirstGroup(changelog: string): string[] {
  const section = unreleasedSection(changelog);
  const first = section.findIndex((line) => /^### /.test(line));
  return section
    .slice(0, first === -1 ? section.length : first)
    .filter((line) => line.trim() !== "");
}

/** Group headings the six change types do not name. */
function unknownGroups(changelog: string): string[] {
  return headings(unreleasedSection(changelog)).filter((text) => !CHANGE_TYPES.includes(text));
}

/** Types whose heading count differs from the number recorded for them. */
function countDrift(changelog: string): string[] {
  const counted = new Map<string, number>();
  for (const text of headings(unreleasedSection(changelog))) {
    counted.set(text, (counted.get(text) ?? 0) + 1);
  }
  const recorded = new Map(CHANGE_TYPES.map((type) => [type, HEADING_BACKLOG[type] ?? 1] as const));
  return [...counted]
    .filter(([type, count]) => count !== recorded.get(type))
    .map(([type, count]) => `${type}: ${count} present, ${recorded.get(type) ?? 1} recorded`);
}

describe("the unreleased section groups its entries by type", () => {
  const changelog = (): Promise<string> => readFile(path.join(repoRoot, "CHANGELOG.md"), "utf-8");

  it("finds the section it reads", async () => {
    // An empty read passes every case below without asking anything, and a
    // renamed or moved heading looks identical to a green run.
    //
    // What this may not require is content. A release cut moves the work under
    // its version heading and reopens an empty `## [Unreleased]`, which is the
    // correct state and the one every release pull request is in — so reading
    // an empty section as a parse failure fails the release rather than a
    // defect. The two are told apart by asking separately: the section is
    // there, and the heading pattern still matches something.
    const text = await changelog();
    expect(/^## \[Unreleased\]/m.test(text), "CHANGELOG.md has no `## [Unreleased]`").toBe(true);
    expect(
      headings(text.split(/\r?\n/)).length,
      "no `### ` heading anywhere in the file, so the pattern matches nothing",
    ).toBeGreaterThan(0);
  });

  it("opens with a group rather than with entries", async () => {
    // An entry above the first `### ` heading belongs to no type at all. It
    // renders as a list under the release heading, so nothing about it looks
    // wrong, and the group headings below it are still counted — which is how
    // an insertion that missed the heading passes every count.
    expect(
      entriesAboveFirstGroup(await changelog()),
      "an entry under `## [Unreleased]` that no change-type group holds",
    ).toEqual([]);
  });

  it("names every group with one of the change types", async () => {
    // A qualified heading — `Fixed (third review wave)` — is a group nothing
    // can find by type, and the released sections carry dozens of them. The
    // next release does not.
    expect(
      unknownGroups(await changelog()),
      `a group heading outside ${CHANGE_TYPES.join(" / ")}`,
    ).toEqual([]);
  });

  it("carries the recorded number of each, and no more", async () => {
    // Exact, in both directions. Over the record is a group that climbed while
    // nobody was looking; under it is a slot left open for the next branch to
    // take, which is how the record stops being a backlog and becomes a budget.
    expect(
      countDrift(await changelog()),
      "put the entry under the group that is already there, or strike the recorded number down with the merge",
    ).toEqual([]);
  });

  it("passes on the section a release cut leaves behind", () => {
    // The state every release pull request is in: the work moved under its
    // version heading and `## [Unreleased]` reopened empty. That is correct,
    // and a rule that read an empty section as a parse failure failed the
    // release rather than a defect — which is what this suite did on its first.
    const afterCut = [
      "# Changelog",
      "",
      "## [Unreleased]",
      "",
      "## [1.0.0] - 2026-01-01",
      "",
      "### Added",
      "",
      "- **Something.** It happened.",
      "",
    ].join("\n");

    expect(entriesAboveFirstGroup(afterCut)).toEqual([]);
    expect(unknownGroups(afterCut)).toEqual([]);
    expect(countDrift(afterCut)).toEqual([]);
  });
});
