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
  sectionEntries,
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

  it("reads the released sections and leaves the unreleased one out", () => {
    const entries = sectionEntries(RELEASED);

    expect([...entries.keys()]).toEqual(["1.2.0"]);
    expect(entries.get("1.2.0")?.size).toBe(2);
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
