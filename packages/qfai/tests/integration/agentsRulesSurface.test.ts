import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

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

  it(".agents/rules/README.md lists every rule in the directory", async () => {
    const text = await readFile(path.join(ROOT, ".agents/rules/README.md"), "utf-8");
    for (const name of [
      "version-discipline.md",
      "distributed-surface.md",
      "root-additions-policy.md",
      "temporary-files.md",
    ]) {
      expect(text).toContain(name);
    }
  });

  it.each([
    "version-discipline",
    "distributed-surface",
    "root-additions-policy",
    "temporary-files",
  ])(".claude/rules/%s.md resolves to the master", async (name) => {
    const link = path.join(ROOT, `.claude/rules/${name}.md`);
    const master = path.join(ROOT, `.agents/rules/${name}.md`);
    if (await isSymlinkTo(link, master)) {
      // Symlink path: the resolved master must equal the master file.
      expect(await realpath(link)).toBe(await realpath(master));
      return;
    }
    // Non-symlink fallback. There are two distinct sub-cases here
    // (PR #206 review #11):
    //
    //   1. The checkout was on a platform / git config that supports
    //      symlinks but for some reason the file was committed as a
    //      regular file. Then content equality with the master is the
    //      right contract.
    //   2. Windows + Git for Windows without `core.symlinks=true` /
    //      Developer Mode. The link materialises as a one-line text
    //      file containing the relative target path (e.g.
    //      `../../.agents/rules/version-discipline.md`). Content
    //      equality fails by construction; we should accept this as a
    //      documented platform limitation rather than a contract
    //      violation. AGENTS.md's "Cross-AI rules" section instructs
    //      Windows users to enable `core.symlinks=true`; the
    //      structural guarantee on Windows is that the link CONTENT is
    //      the relative target path string.
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

  it(".codex/README.md references .agents/rules/", async () => {
    const text = await readFile(path.join(ROOT, ".codex/README.md"), "utf-8");
    expect(text).toMatch(/\.agents\/rules\//);
    expect(text).toMatch(/version-discipline/);
  });

  it("CLAUDE.md references the version-discipline rule", async () => {
    const text = await readFile(path.join(ROOT, "CLAUDE.md"), "utf-8");
    expect(text).toMatch(/version-discipline/);
  });
});
