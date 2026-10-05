/**
 * Constitution Article XI rule 2 sends every agent's scratch work to the
 * repository-root `tmp/`, and rule 3 requires that directory to be in
 * `.gitignore` so the scratch work never reaches a commit. The managed block
 * `qfai init` owns is the only component that can satisfy rule 3, and it did
 * not carry the entry — so the first agent that obeyed Article XI left an
 * untracked directory for the next `git add .` to stage.
 *
 * These tests pin the entry, the anchoring the block writes, and the
 * `QFAI-HYG-003` notice that nudges an older project.
 */

import { execFile as execFileCb } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  ARTICLE_XI_TMP_ENTRY,
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_MARKER,
  QFAI_GITIGNORE_RECOMMENDED_ENTRIES,
} from "../../src/core/gitignore.js";
import { validateRepositoryHygiene } from "../../src/core/validators/repositoryHygiene.js";
import type { Issue } from "../../src/core/types.js";
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

/** The hygiene findings for a project whose root `.gitignore` is `content`. */
async function hygieneFor(content: string): Promise<Issue[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-tmp-"));
  try {
    await writeFile(path.join(root, ".gitignore"), content, "utf-8");
    return await validateRepositoryHygiene(root, defaultConfig);
  } finally {
    await removeTempTree(root);
  }
}

describe("QFAI-HYG-003 nudges a project whose block predates the entry", () => {
  /**
   * A managed block from before `/tmp/` shipped: every other recommended entry,
   * no `tmp/`. Derived from the constant so `tmp/` stays the only variable.
   */
  const preTmpBlock = [
    QFAI_GITIGNORE_MARKER,
    ...QFAI_GITIGNORE_RECOMMENDED_ENTRIES.filter((entry) => entry !== ARTICLE_XI_TMP_ENTRY),
    "",
  ].join("\n");

  it("stays silent on the block `qfai init` writes", async () => {
    const issues = await hygieneFor(QFAI_GITIGNORE_BLOCK);
    expect(issues.some((entry) => entry.code === "QFAI-HYG-003")).toBe(false);
  });

  it("names `tmp/` at info when nothing in the file ignores it", async () => {
    const notice = (await hygieneFor(preTmpBlock)).find((entry) => entry.code === "QFAI-HYG-003");
    expect(notice?.severity).toBe("info");
    expect(notice?.refs).toContain(ARTICLE_XI_TMP_ENTRY);
  });

  it("stays silent when the project ignores `tmp/` from its own section", async () => {
    const issues = await hygieneFor(`/tmp/\n\n${preTmpBlock}`);
    expect(issues.some((entry) => entry.code === "QFAI-HYG-003")).toBe(false);
  });

  const stillTracked: ReadonlyArray<readonly [string, string]> = [
    ["a nested `src/tmp/`", "src/tmp/"],
    ["a comment that only mentions the directory", "# scratch work belongs in tmp/"],
    ["a later `!/tmp/` that cancels the block's ignore", "/tmp/\n!/tmp/"],
  ];
  for (const [what, lines] of stillTracked) {
    it(`still names \`tmp/\` beside ${what}`, async () => {
      const notice = (await hygieneFor(`${preTmpBlock}\n${lines}\n`)).find(
        (entry) => entry.code === "QFAI-HYG-003",
      );
      expect(notice?.refs).toContain(ARTICLE_XI_TMP_ENTRY);
    });
  }

  it("says nothing about a `.gitignore` that carries no QFAI marker", async () => {
    const issues = await hygieneFor("node_modules/\n");
    expect(issues.some((entry) => entry.code === "QFAI-HYG-003")).toBe(false);
  });
});
