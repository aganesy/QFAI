import { describe, expect, it } from "vitest";

import { brokenWrapperRemedy } from "../../../../src/core/validators/integrationSurface.js";

const MARKERS = {
  relink: "Rerun `qfai init`",
  directory: "A linked or broken integration directory itself",
  ancestor: "when an ancestor of the integration directory is a symlink",
  notSymlink: "A wrapper that is not a symlink",
  unreadable: "`unreadable` is a permissions problem",
  canonical: "A broken canonical side",
  flattened: "core.symlinks true",
} as const;

type Branch = keyof typeof MARKERS;

function branchesOf(detail: string): Branch[] {
  const text = brokenWrapperRemedy([{ detail }]);
  return (Object.keys(MARKERS) as Branch[]).filter((branch) => text.includes(MARKERS[branch]));
}

describe("brokenWrapperRemedy names the repairs for the damage it is given", () => {
  const cases: [string, string, Branch[]][] = [
    [
      "a deleted wrapper",
      "missing \u2014 .claude/skills exists and so does the document it wraps",
      ["relink"],
    ],
    ["a mis-pointed wrapper", "points at ../x, expected ../../.qfai/assistant/skill/a", ["relink"]],
    ["a dangling wrapper", "dangling -> ../../.qfai/assistant/skill/a", ["relink"]],
    [
      "a deleted surface",
      "integration surface missing \u2014 `qfai init` created it and it is gone",
      ["relink"],
    ],
    ["a flattened wrapper", "regular file (42 bytes), not a symlink", ["relink", "flattened"]],
    [
      "a wrapper the OS will not follow",
      "resolves through a symlink the OS will not follow -> ../a",
      ["relink", "canonical", "flattened"],
    ],
    ["a wrapper replaced by a directory", "directory, not a symlink", ["notSymlink"]],
    ["a wrapper replaced by a FIFO", "FIFO, not a symlink", ["notSymlink"]],
    ["a linked integration directory", "the integration directory is a symlink", ["directory"]],
    [
      "a cyclic integration directory",
      "the integration directory is a symlink cycle",
      ["directory"],
    ],
    ["a linked ancestor", "an ancestor is a symlink: .claude", ["ancestor"]],
    ["an unreadable skill document", "resolves, but its SKILL.md is unreadable", ["unreadable"]],
    ["an unreadable agent document", "resolves, but the document is unreadable", ["unreadable"]],
    [
      "a canonical ancestor",
      "a canonical ancestor is a file, not a directory: .qfai/assistant/skill",
      ["canonical"],
    ],
    [
      "a canonical skill that is a file",
      "canonical skill is a file, not a directory",
      ["canonical"],
    ],
    [
      "a canonical skill without a document",
      "canonical skill directory has no SKILL.md",
      ["canonical"],
    ],
    ["a cycle behind the wrapper", "resolves through a symlink cycle -> ../a", ["canonical"]],
    [
      "a wrapper naming the wrong kind",
      "resolves to a file, but a skill wrapper names a directory",
      ["canonical"],
    ],
    ["a skill without a document", "resolves, but the directory has no SKILL.md", ["canonical"]],
    [
      "a wrapper that lands outside the canonical",
      "resolves to /a, outside the project canonical /b",
      ["ancestor", "canonical"],
    ],
  ];

  it.each(cases)("%s", (_name, detail, expected) => {
    expect(branchesOf(detail)).toEqual(expected);
  });

  it("gives every repair for damage it does not recognise", () => {
    expect(branchesOf("something no check has described")).toEqual(Object.keys(MARKERS));
  });

  it("lists the repairs of several kinds once each, in a fixed order", () => {
    const text = brokenWrapperRemedy([
      { detail: "directory, not a symlink" },
      { detail: "missing \u2014 x" },
      { detail: "missing \u2014 y" },
    ]);
    expect(text.split("\n")).toHaveLength(2);
    expect(text.indexOf(MARKERS.relink)).toBeLessThan(text.indexOf(MARKERS.notSymlink));
  });

  it("puts the steps for a retired wrapper first, and alone when every wrapper is retired", () => {
    const retired = { detail: "resolves into the canonical tree but names x", retired: true };
    const alone = brokenWrapperRemedy([retired]);
    expect(alone).toContain("A plain `qfai init` changes nothing for a retired wrapper");
    expect(alone).not.toContain(MARKERS.relink);

    const mixed = brokenWrapperRemedy([retired, { detail: "missing \u2014 x" }]);
    expect(mixed.indexOf("A plain `qfai init`")).toBe(0);
    expect(mixed).toContain(MARKERS.relink);
    expect(mixed).not.toContain(MARKERS.unreadable);
  });
});
