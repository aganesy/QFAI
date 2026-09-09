import { readdirSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

/**
 * Every rule master, read off the directory.
 *
 * The two cases below used to iterate a list written beside them, which made
 * each of them ask about the rules someone remembered to add rather than the
 * rules that exist: a master registered in neither `README.md` nor
 * `.claude/rules/` had no entry, so nothing asked about it and both passed.
 * Read from disk, a master that skips either step is named by the case that
 * finds it missing.
 *
 * Synchronous because `it.each` needs the names while the file is collected.
 */
const RULE_MASTERS = readdirSync(path.join(ROOT, ".agents/rules"))
  .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
  .sort();

async function readMaybeSymlink(linkPath: string): Promise<string> {
  return readFile(linkPath, "utf-8");
}

async function isSymlinkTo(linkPath: string, masterPath: string): Promise<boolean> {
  const stat = await lstat(linkPath);
  if (!stat.isSymbolicLink()) return false;
  const linkReal = await realpath(linkPath);
  const masterReal = await realpath(masterPath);
  return linkReal === masterReal;
}

describe("cross-AI rules surface (.agents/rules/ master)", () => {
  it("master version-discipline.md exists with required content", async () => {
    const text = await readFile(path.join(ROOT, ".agents/rules/version-discipline.md"), "utf-8");
    for (const term of [
      "ブランチ",
      "package\\.json",
      "chore\\(release\\)",
      "Version Discipline",
      "VERSION_PIN_SKIP",
      "禁止",
    ]) {
      expect(text).toMatch(new RegExp(term));
    }
  });

  it("finds the rule masters it reads the directory for", () => {
    // An empty read passes both cases below without asking anything, and the
    // two ways to get one — a moved directory, a filter that matches nothing —
    // look identical to a green run.
    expect(RULE_MASTERS.length, ".agents/rules holds no rule master").toBeGreaterThan(0);
    expect(RULE_MASTERS, "README.md is the register, not a rule").not.toContain("README.md");
  });

  it(".agents/rules/README.md lists every rule in the directory", async () => {
    const text = await readFile(path.join(ROOT, ".agents/rules/README.md"), "utf-8");
    for (const name of RULE_MASTERS) {
      expect(text, `${name} is a rule master that README.md does not register`).toContain(name);
    }
  });

  it.each(RULE_MASTERS)(".claude/rules/%s resolves to the master", async (fileName) => {
    const link = path.join(ROOT, ".claude/rules", fileName);
    const master = path.join(ROOT, ".agents/rules", fileName);
    if (await isSymlinkTo(link, master)) {
      // Symlink path: the resolved master must equal the master file.
      expect(await realpath(link)).toBe(await realpath(master));
      return;
    }
    // Non-symlink fallback, two shapes:
    //   1. The file was committed as a regular file on a platform that
    //      supports symlinks. Content equality with the master is the
    //      contract.
    //   2. Windows without `core.symlinks=true` / Developer Mode. Git writes
    //      the link as a one-line text file holding the relative target path
    //      (e.g. `../../.agents/rules/version-discipline.md`). Content
    //      equality fails by construction, so the contract is that the path
    //      resolves to the master. `.agents/rules/README.md` documents the
    //      setup.
    const linked = await readMaybeSymlink(link);
    const trimmed = linked.trim();
    const looksLikeRelativePath = /^\.\.\/.+\.md$/.test(trimmed);
    if (looksLikeRelativePath) {
      // Validate the path string actually points at the master.
      const linkDir = path.dirname(link);
      const resolvedTarget = path.resolve(linkDir, trimmed);
      expect(path.resolve(master)).toBe(resolvedTarget);
      return;
    }
    const masterText = await readFile(master, "utf-8");
    expect(linked).toBe(masterText);
  });

  it("AGENTS.md references the master rules directory and version-discipline", async () => {
    const text = await readFile(path.join(ROOT, "AGENTS.md"), "utf-8");
    expect(text).toMatch(/バージョン規律/);
    expect(text).toMatch(/\.agents\/rules\/version-discipline\.md/);
    expect(text).toMatch(/\.agents\/rules\//);
  });

  it(".github/copilot-instructions.md references .agents/rules/", async () => {
    const text = await readFile(path.join(ROOT, ".github/copilot-instructions.md"), "utf-8");
    expect(text).toMatch(/\.agents\/rules\//);
    expect(text).toMatch(/version-discipline/);
  });

  it("CLAUDE.md references the version-discipline rule", async () => {
    const text = await readFile(path.join(ROOT, "CLAUDE.md"), "utf-8");
    expect(text).toMatch(/version-discipline/);
  });

  // A repository-only rule, like `document-schema.md`: it governs what this
  // tree stores, and `packages/qfai/assets/init/root/.agents/rules/` does not
  // carry it. An adopter picks the language of their own repository, and a
  // copy under the shipped masters would both say otherwise and oblige every
  // shipped entry point to cite it.
  describe("repository-language rule", () => {
    const MASTER = ".agents/rules/repository-language.md";

    it("states the scope and both exclusions", async () => {
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      expect(text).toMatch(/written in English/);
      // One token per clause that no other clause carries, so a clause cannot
      // be dropped while the master still looks complete.
      for (const clause of [
        /CHANGELOG\.md/,
        /communication\.md/,
        /qfai init/,
        /cliMessageLanguage/,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    it.each(["AGENTS.md", "CLAUDE.md"])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("repository-language.md");
    });

    it("is not shipped to adopters", async () => {
      const shipped = path.join(
        ROOT,
        "packages/qfai/assets/init/root/.agents/rules/repository-language.md",
      );
      await expect(lstat(shipped)).rejects.toThrow();
    });
  });

  // The writing standard reaches an agent two ways: as a rule master every
  // entry point cites, and as the hook reminder that restates it at the moment
  // it is easiest to skip. Both halves are asserted, in this repository and in
  // the tree `qfai init` writes, because either one alone leaves the other free
  // to drift out of the surface without a test noticing.
  describe("documentation-clarity rule", () => {
    const MASTERS = [
      ".agents/rules/documentation-clarity.md",
      "packages/qfai/assets/init/root/.agents/rules/documentation-clarity.md",
    ];

    it.each(MASTERS)("%s states every clause of the standard", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/documentation-clarity|Documentation Clarity/i);
      // One token per clause that no other clause in the file carries, so a
      // clause cannot be dropped and still leave the master looking complete.
      for (const clause of [/#123|GH-123/, /git (history|log)/, /PostToolUse/]) {
        expect(text).toMatch(clause);
      }
    });

    it.each(
      [
        ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"],
        ["packages/qfai/assets/init/root/AGENTS.md", "packages/qfai/assets/init/root/CLAUDE.md"],
      ].flat(),
    )("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("documentation-clarity.md");
    });
  });
});
