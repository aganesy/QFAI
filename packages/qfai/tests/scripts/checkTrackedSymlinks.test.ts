/**
 * The mode a link is staged with, which content comparison cannot see.
 *
 * `ln -s` in Git Bash on Windows copies the target unless
 * `MSYS=winsymlinks:nativestrict` is set. The copy is byte-identical, so every
 * check that reads content passes, and the tree says nothing until someone
 * edits the master and the copy stays behind.
 *
 * These cases drive `expectedLinks` over a synthetic index rather than the real
 * one: the repository's own tree is checked by running the script in CI, and a
 * case that could only fail when this repository is misconfigured would say
 * nothing about the rule.
 */
import { describe, expect, it } from "vitest";

import { expectedLinks } from "../../../../scripts/check-tracked-symlinks.mjs";

type Entry = { mode: string; path: string };

const LINK = "120000";
const FILE = "100644";

/** An index holding one shipped rule, its operating link and its Claude link. */
function index(overrides: Partial<Record<string, string>> = {}): Entry[] {
  const modes: Record<string, string> = {
    "packages/qfai/assets/init/root/.agents/rules/grilling.md": FILE,
    ".agents/rules/grilling.md": LINK,
    ".claude/rules/grilling.md": LINK,
    ...overrides,
  };
  return Object.entries(modes).map(([path, mode]) => ({ mode, path }));
}

describe("expectedLinks derives the paths that must be symlinks", () => {
  it("expects an operating rule that the package also ships", () => {
    const found = expectedLinks(index()).map((item: { path: string }) => item.path);

    expect(found).toContain(".agents/rules/grilling.md");
    expect(found).toContain(".claude/rules/grilling.md");
  });

  it("reports the mode a path is staged with, so a copy is visible", () => {
    const entries = index({ ".agents/rules/grilling.md": FILE });
    const rule = expectedLinks(entries).find(
      (item: { path: string }) => item.path === ".agents/rules/grilling.md",
    );

    expect(rule?.mode).toBe(FILE);
  });

  it("leaves a rule with no shipped copy alone", () => {
    // `repository-language.md` governs this repository and nothing else, so it
    // is a real file and expecting a link would report every correct tree.
    const entries = [...index(), { mode: FILE, path: ".agents/rules/repository-language.md" }];
    const found = expectedLinks(entries).map((item: { path: string }) => item.path);

    expect(found).not.toContain(".agents/rules/repository-language.md");
  });

  it("asks nothing of a Claude entry point that does not exist", () => {
    // Adding the rule and linking it from a tool directory are separate
    // changes; the rules register is what fails on a master nothing registers.
    const entries = index();
    const withoutClaude = entries.filter((entry) => !entry.path.startsWith(".claude/"));
    const found = expectedLinks(withoutClaude).map((item: { path: string }) => item.path);

    expect(found).toEqual([".agents/rules/grilling.md"]);
  });

  it("ignores a nested path under a rules directory", () => {
    // Only the direct children are the link surface; a `references/` beneath a
    // rule would otherwise be expected to be a link too.
    const entries = [...index(), { mode: FILE, path: ".agents/rules/nested/deep.md" }];
    const found = expectedLinks(entries).map((item: { path: string }) => item.path);

    expect(found).not.toContain(".agents/rules/nested/deep.md");
  });
});
