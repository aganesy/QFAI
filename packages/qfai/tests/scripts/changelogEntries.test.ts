/**
 * What a pull request may do to the changelog entries.
 *
 * The cases follow the two failures the guard exists for: an entry that a merge
 * conflict resolution dropped, and a change to shipped behaviour with no entry.
 */
import { describe, expect, it } from "vitest";

import {
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
