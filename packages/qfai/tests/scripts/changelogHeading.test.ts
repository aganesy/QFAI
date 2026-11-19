/**
 * The one reading of a CHANGELOG release heading that tagging, publishing and
 * the release-notes comparison share.
 *
 * Tagging used to accept any line starting `## [X.Y.Z]`, so a heading with no
 * date was tagged and then refused by the publish. The cases pin what the
 * shared parser calls released, malformed and absent, and the exit codes the
 * workflows branch on.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  main,
  parseReleasedHeading,
  versionHeading,
} from "../../../../scripts/changelog-heading.mjs";
import { releasedSections } from "../../../../scripts/check-release-notes.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "changelog-heading.mjs");

const changelog = (heading: string): string =>
  ["# Changelog", "", "## [Unreleased]", "", heading, "", "- **Entry.** Text.", ""].join("\n");

describe("a released heading", () => {
  it("is the version, a separator and a date-shaped day", () => {
    expect(parseReleasedHeading("## [1.11.0] - 2026-09-07")).toEqual({
      version: "1.11.0",
      date: "2026-09-07",
    });
  });

  it.each([
    ["no date", "## [1.11.0]"],
    ["no separator", "## [1.11.0] 2026-09-07"],
    ["a separator and no date", "## [1.11.0] - "],
    ["a date that is not date-shaped", "## [1.11.0] - 7 September 2026"],
    ["text after the date", "## [1.11.0] - 2026-09-07 (yanked)"],
  ])("is not a heading with %s", (_case, line) => {
    expect(parseReleasedHeading(line)).toBeNull();
  });
});

describe("what a changelog says about one version", () => {
  it("is released when its heading is well formed, with the recorded date", () => {
    expect(versionHeading(changelog("## [1.2.3] - 2026-11-20"), "1.2.3")).toEqual({
      state: "released",
      date: "2026-11-20",
      line: "## [1.2.3] - 2026-11-20",
    });
  });

  it("is malformed, not absent, when a heading names the version without a date", () => {
    // Tagging read this as present and publishing refused it: a tag left behind for a
    // release that could not be published.
    expect(versionHeading(changelog("## [1.2.3]"), "1.2.3")).toEqual({
      state: "malformed",
      line: "## [1.2.3]",
    });
  });

  it("is absent when no heading names it", () => {
    expect(versionHeading(changelog("## [1.2.2] - 2026-11-01"), "1.2.3")).toEqual({
      state: "absent",
    });
  });

  it("matches the version literally, so a dot does not stand for any character", () => {
    expect(versionHeading(changelog("## [1x2x3] - 2026-11-20"), "1.2.3")).toEqual({
      state: "absent",
    });
  });

  it("reads a CRLF changelog the same way", () => {
    const text = changelog("## [1.2.3] - 2026-11-20").replace(/\n/g, "\r\n");
    expect(versionHeading(text, "1.2.3")).toMatchObject({ state: "released", date: "2026-11-20" });
  });

  it("is the heading the release-notes comparison counts as a released section", () => {
    const released = changelog("## [1.2.3] - 2026-11-20");
    const undated = changelog("## [1.2.3]");
    expect(releasedSections(released).map((section) => section.version)).toEqual(["1.2.3"]);
    expect(releasedSections(undated)).toEqual([]);
  });
});

describe("the command the release workflows run", () => {
  const run = (args: string[], input?: string) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf-8", input });

  it("prints the recorded date and exits 0 for a released heading read from stdin", () => {
    const result = run(["1.2.3", "-"], changelog("## [1.2.3] - 2026-11-20"));
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("2026-11-20");
  });

  it("exits 1 and names the line for a malformed heading", () => {
    const result = run(["1.2.3", "-"], changelog("## [1.2.3]"));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("names 1.2.3 as '## [1.2.3]'");
    expect(result.stdout).toContain("'## [1.2.3] - YYYY-MM-DD'");
  });

  it("exits 3 when no heading names the version, which tagging reads as nothing to tag", () => {
    const result = run(["1.2.3", "-"], changelog("## [1.2.2] - 2026-11-01"));
    expect(result.status).toBe(3);
    expect(result.stdout).toContain("has no heading for 1.2.3");
  });

  it("exits 2 when the check cannot be made", () => {
    expect(main(["1.2.3"]).code).toBe(2);
    expect(main(["1.2", "-"], () => "").code).toBe(2);
    expect(main(["1.2.3", path.join(REPO_ROOT, "no-such-changelog.md")]).code).toBe(2);
  });
});
