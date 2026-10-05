/**
 * A released changelog section, held against what it said when it was released.
 *
 * The release workflow cuts the section out at the tag and creates the release
 * page once. An entry appended to that section afterwards is in the repository
 * and in no page anybody reads — and nothing refuses the change that does it,
 * which is how one section came to hold 77 of them.
 *
 * The cases are about the three shapes that look alike in a diff: an entry
 * added to a released section, an entry added to `## [Unreleased]`, and the
 * release commit that renames one heading into the other.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  addedEntries,
  releasedAdditions,
  sectionEntries,
  taggedBefore,
} from "../../../../scripts/check-changelog-released-sections.mjs";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const RELEASED = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "### Changed",
  "",
  "- **Something not yet released.**",
  "",
  "## [1.2.0] - 2026-01-02",
  "",
  "### Added",
  "",
  "- **The first thing the release carried.**",
  "- **The second thing the release carried.**",
  "",
].join("\n");

describe("what a released section may gain", () => {
  it("reports an entry appended to a released section", () => {
    const after = RELEASED.replace(
      "- **The second thing the release carried.**",
      "- **The second thing the release carried.**\n- **An entry the release page never carried.**",
    );

    expect(addedEntries(RELEASED, after)).toEqual([
      { version: "1.2.0", gained: ["- **An entry the release page never carried.**"] },
    ]);
  });

  it("says nothing about an entry added to the unreleased section", () => {
    // Where every entry belongs, and the remedy the finding names.
    const after = RELEASED.replace(
      "- **Something not yet released.**",
      "- **Something not yet released.**\n- **Another thing not yet released.**",
    );

    expect(addedEntries(RELEASED, after)).toEqual([]);
  });

  it("says nothing about the release commit that renames the heading", () => {
    // The rename creates a released section holding what the unreleased one
    // held. Read as a section that gained entries, a release could never be cut.
    const after = RELEASED.replace("## [Unreleased]", "## [Unreleased]\n\n## [1.3.0] - 2026-02-03");

    expect(addedEntries(RELEASED, after)).toEqual([]);
  });

  it("says nothing about an entry a released section lost", () => {
    // Removing one is a correction to what the release said, not a claim it
    // never made. Only the direction that leaves a reader told less is refused.
    const after = RELEASED.replace("- **The second thing the release carried.**\n", "");

    expect(addedEntries(RELEASED, after)).toEqual([]);
  });

  it("lets an untagged section gain entries, and refuses a tagged one", () => {
    // Released means tagged: a section main carries whose tag does not exist yet
    // has built no release page, so an entry added to it is still read.
    const added = [
      { version: "1.2.0", gained: ["- **Late.**"] },
      { version: "1.3.0", gained: ["- **Early.**"] },
    ];
    const tagged = (version: string) => version === "1.2.0";

    expect(releasedAdditions(added, tagged)).toEqual({
      refused: [{ version: "1.2.0", gained: ["- **Late.**"] }],
      notes: [],
    });
  });

  it("refuses a section whose tag lookup failed, and says so", () => {
    const added = [{ version: "1.3.0", gained: ["- **Unknown.**"] }];
    const failing = (): boolean | null => null;

    const result = releasedAdditions(added, failing);
    expect(result.refused).toEqual(added);
    expect(result.notes).toEqual([
      "the tag v1.3.0 could not be looked up; the section is treated as released.",
    ]);
  });

  it("reads the released sections and leaves the unreleased one out", () => {
    const entries = sectionEntries(RELEASED);

    expect([...entries.keys()]).toEqual(["1.2.0"]);
    expect(entries.get("1.2.0")?.size).toBe(2);
  });
});

describe("which tag makes a section released", () => {
  const earlier = "a".repeat(40);
  const head = "b".repeat(40);

  it("counts a tag on an earlier commit", () => {
    expect(taggedBefore(`${earlier}\trefs/tags/v1.2.0\n`, head)).toBe(true);
  });

  it("does not count a tag on the commit being checked", () => {
    // The merge that folds the unreleased entries is the commit the tag is
    // pushed to, so the release page has not been built from the section yet.
    expect(taggedBefore(`${head}\trefs/tags/v1.2.0\n`, head)).toBe(false);
  });

  it("reads the commit of an annotated tag from its peeled line", () => {
    const annotated = `${earlier}\trefs/tags/v1.2.0\n${head}\trefs/tags/v1.2.0^{}\n`;

    expect(taggedBefore(annotated, head)).toBe(false);
    expect(taggedBefore(annotated, "c".repeat(40))).toBe(true);
  });

  it("does not count a tag that does not exist", () => {
    expect(taggedBefore("", head)).toBe(false);
  });
});

describe("the lane that runs it", () => {
  it("is in the scans lane, so a pull request is where the refusal lands", async () => {
    // A guard nothing invokes reports nothing. `ci:lint:scans` is the lane that
    // runs on every pull request and carries the other whole-tree readers.
    const manifest = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts["ci:lint:scans"]).toContain(
      "node ./scripts/check-changelog-released-sections.mjs",
    );
  });
});
