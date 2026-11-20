/**
 * What a pull request may do to the changelog entries.
 *
 * The cases follow the two failures the guard exists for: an entry that a merge
 * conflict resolution dropped, and a change to shipped behaviour with no entry.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

import {
  changedPaths,
  exemptionReason,
  parseBase,
  problemsOf,
  removedEntries,
  shippedPaths,
  unreleasedText,
} from "../../../../scripts/check-changelog-entries.mjs";

const BASE = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "### Added",
  "",
  "- **An entry a merged change added.**",
  "  Its body, on a second line.",
  "",
  "## [1.2.0] - 2026-01-02",
  "",
  "### Fixed",
  "",
  "- **A released entry.**",
  "",
].join("\n");

describe("an entry the base carries", () => {
  it("is reported when the head no longer has it", () => {
    const head = BASE.replace(
      "- **An entry a merged change added.**\n  Its body, on a second line.\n",
      "",
    );

    expect(removedEntries(BASE, head)).toEqual(["- **An entry a merged change added.**"]);
  });

  it("is reported when the head rewords its title", () => {
    const head = BASE.replace("An entry a merged change added.", "Another wording.");

    expect(removedEntries(BASE, head)).toEqual(["- **An entry a merged change added.**"]);
  });

  it("is not reported for a released section's entry that stays", () => {
    const head = BASE.replace("## [Unreleased]\n", "## [Unreleased]\n\n- **A new entry.**\n");

    expect(removedEntries(BASE, head)).toEqual([]);
  });
});

describe("the unreleased text", () => {
  it("stops at the next section", () => {
    expect(unreleasedText(BASE)).not.toContain("A released entry");
    expect(unreleasedText(BASE)).toContain("An entry a merged change added.");
  });

  it("is empty when the changelog has no unreleased section", () => {
    expect(unreleasedText("# Changelog\n\n## [1.0.0] - 2026-01-01\n")).toBe("");
  });
});

describe("the shipped paths", () => {
  it("keeps the source and asset files and drops the rest", () => {
    expect(
      shippedPaths([
        "packages/qfai/src/cli/main.ts",
        "packages/qfai/assets/init/root/AGENTS.md",
        "packages/qfai/tests/unit/a.test.ts",
        "scripts/check-bidi.mjs",
      ]),
    ).toEqual(["packages/qfai/src/cli/main.ts", "packages/qfai/assets/init/root/AGENTS.md"]);
  });
});

const trees: string[] = [];
afterEach(async () => {
  await Promise.all(trees.splice(0).map((tree) => removeTempTree(tree)));
});

function git(root: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf-8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}

describe("the changed paths of a range", () => {
  it("reads a shipped path whose name git would quote as it is", async () => {
    // Git quotes a path holding a non-ASCII byte, so a newline-split
    // `--name-only` reads `"packages/...` and no prefix matches.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-changelog-paths-"));
    trees.push(root);
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "fixture@example.invalid");
    git(root, "config", "user.name", "Changelog fixture");
    git(root, "config", "core.quotePath", "true");
    await writeFile(path.join(root, "README.md"), "base\n");
    git(root, "add", "README.md");
    git(root, "commit", "-m", "Base");
    const dir = path.join(root, "packages", "qfai", "src");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "café.ts"), "export {};\n");
    git(root, "add", "packages");
    git(root, "commit", "-m", "Shipped change");

    const changed = changedPaths("HEAD~1..HEAD", root);

    expect(shippedPaths(changed ?? [])).toEqual(["packages/qfai/src/café.ts"]);
  });

  it("is null when git cannot read the range", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-changelog-paths-"));
    trees.push(root);
    git(root, "init", "-b", "main");

    expect(changedPaths("HEAD~1..HEAD", root)).toBeNull();
  });
});

describe("the problems of one change", () => {
  const withEntry = BASE.replace("## [Unreleased]\n", "## [Unreleased]\n\n- **A new entry.**\n");

  it("reports a shipped change that leaves the unreleased text alone", () => {
    const problems = problemsOf({ base: BASE, head: BASE, changed: ["packages/qfai/src/a.ts"] });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("packages/qfai/src/a.ts");
  });

  it("accepts a shipped change that adds an entry", () => {
    expect(
      problemsOf({ base: BASE, head: withEntry, changed: ["packages/qfai/src/a.ts"] }),
    ).toEqual([]);
  });

  it("accepts a change outside the shipped paths with no entry", () => {
    expect(problemsOf({ base: BASE, head: BASE, changed: ["scripts/check-bidi.mjs"] })).toEqual([]);
  });

  it("reports a dropped entry even when the change is not shipped", () => {
    const head = BASE.replace("- **A released entry.**\n", "");

    expect(problemsOf({ base: BASE, head, changed: ["CHANGELOG.md"] })).toEqual([
      "an entry the base carries is gone: - **A released entry.**",
    ]);
  });
});

describe("the opt-out", () => {
  it("reads the reason from a commit message line", () => {
    expect(
      exemptionReason("fix: x\n\nChangelog-Exempt: internal refactor, no user sees it\n"),
    ).toBe("internal refactor, no user sees it");
  });

  it("needs a reason", () => {
    expect(exemptionReason("fix: x\n\nChangelog-Exempt:\n")).toBeNull();
    expect(exemptionReason("fix: x\n\nChangelog-Exempt:   \n")).toBeNull();
  });

  it("is absent when no commit carries the line", () => {
    expect(exemptionReason("fix: x\n\nBody text.\n")).toBeNull();
  });
});

describe("the arguments", () => {
  it("takes nothing or one base", () => {
    expect(parseBase([])).toBeUndefined();
    expect(parseBase(["--base", "origin/main"])).toBe("origin/main");
  });

  it("refuses anything else", () => {
    expect(parseBase(["--base"])).toBeNull();
    expect(parseBase(["--other"])).toBeNull();
    expect(parseBase(["--base", "a", "b"])).toBeNull();
  });
});
