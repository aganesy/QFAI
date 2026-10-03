/**
 * Constitution Article XI rule 2 sends every agent's scratch work to the
 * repository-root `tmp/`, and rule 3 requires that directory to be in
 * `.gitignore` so the scratch work never reaches a commit. The managed block
 * `qfai init` owns is the only component that can satisfy rule 3, and it did
 * not carry the entry — so the first agent that obeyed Article XI left an
 * untracked directory for the next `git add .` to stage.
 *
 * These tests pin the entry and the anchoring the block writes.
 */

import { execFile as execFileCb } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { QFAI_GITIGNORE_BLOCK } from "../../src/core/gitignore.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFile = promisify(execFileCb);

// tests/core/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const CONSTITUTION = path.join(
  repoRoot,
  "packages/qfai/assets/init/.qfai/assistant/rule/constitution.md",
);

describe("the managed block ships the ignore Article XI mandates", () => {
  it("still states rule 3, the obligation the entry discharges", async () => {
    const constitution = await readFile(CONSTITUTION, "utf-8");
    expect(constitution).toContain(
      "`tmp/` MUST be listed in `.gitignore` so temporary files are never committed.",
    );
  });

  it("writes the entry anchored to the repository root", () => {
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    expect(lines).toContain("/tmp/");
    // Before the negations, which git's last-match rule requires to stay last.
    expect(lines.indexOf("/tmp/")).toBeLessThan(lines.indexOf("!.qfai/"));
  });
});

describe("git honours the entry the block writes", () => {
  async function isIgnored(root: string, relativePath: string): Promise<boolean> {
    try {
      await execFile("git", ["check-ignore", "-q", "--", relativePath], { cwd: root });
      return true;
    } catch (error: unknown) {
      // exit 1 is `check-ignore`'s "not ignored" answer, not a failure.
      if (typeof error === "object" && error !== null && "code" in error && error.code === 1) {
        return false;
      }
      throw error;
    }
  }

  it("ignores root scratch work and leaves a nested `tmp/` tracked", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-git-tmp-"));
    try {
      await execFile("git", ["init"], { cwd: root });
      await writeFile(path.join(root, ".gitignore"), QFAI_GITIGNORE_BLOCK, "utf-8");
      for (const relativePath of ["tmp/glossary/draft.md", "src/tmp/fixture.ts"]) {
        await mkdir(path.join(root, path.dirname(relativePath)), { recursive: true });
        await writeFile(path.join(root, relativePath), "x\n", "utf-8");
      }

      expect(await isIgnored(root, "tmp/glossary/draft.md")).toBe(true);
      // Anchored, so a source directory that happens to be named `tmp` is not
      // swallowed — Article XI only claims the repository root.
      expect(await isIgnored(root, "src/tmp/fixture.ts")).toBe(false);
    } finally {
      await removeTempTree(root);
    }
  });
});
