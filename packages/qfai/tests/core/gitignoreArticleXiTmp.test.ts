/**
 * Constitution Article XI rule 2 sends every agent's scratch work to the
 * repository-root `tmp/`, and rule 3 requires that directory to be in
 * `.gitignore` so the scratch work never reaches a commit. The managed block
 * `qfai init` owns is the only component that can satisfy rule 3, and it did
 * not carry the entry — so the first agent that obeyed Article XI left an
 * untracked directory for the next `git add .` to stage.
 *
 * These tests pin the entry in both constants, the anchoring the block writes,
 * and the `QFAI-REVIEW-008` reporting that nudges an older project.
 */

import { execFile as execFileCb } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_MARKER,
  QFAI_GITIGNORE_RECOMMENDED_ENTRIES,
} from "../../src/core/gitignore.js";
import { validateReviewArtifacts } from "../../src/core/validators/reviewArtifacts.js";

const execFile = promisify(execFileCb);

// tests/core/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const CONSTITUTION = path.join(
  repoRoot,
  "packages/qfai/assets/init/.qfai/assistant/constitution/constitution.md",
);

async function withGitignore(
  content: string,
  assertion: (issues: Awaited<ReturnType<typeof validateReviewArtifacts>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gitignore-tmp-"));
  try {
    await writeFile(path.join(root, ".gitignore"), content, "utf-8");
    assertion(await validateReviewArtifacts(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

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

  it("recommends the unanchored spelling, so either form satisfies the check", () => {
    // `reviewArtifacts` matches with `content.includes(entry)` over the whole
    // file: `tmp/` is a substring of the block's `/tmp/` and of a project's own
    // `tmp/` line, so neither spelling is reported as missing.
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).toContain("tmp/");
    expect(QFAI_GITIGNORE_BLOCK).toContain("tmp/");
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
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("QFAI-REVIEW-008 nudges a project whose block predates the entry", () => {
  /** A managed block from before `/tmp/` shipped: every other entry, no `tmp/`. */
  const preTmpBlock = [
    QFAI_GITIGNORE_MARKER,
    ".qfai/report/*",
    ".qfai/evidence/*",
    ".qfai/discussion/*",
    ".qfai/review/*",
    ".qfai/state.json",
    "",
  ].join("\n");

  it("names `tmp/` at info when nothing in the file ignores it", async () => {
    await withGitignore(preTmpBlock, (issues) => {
      const notice = issues.find((entry) => entry.code === "QFAI-REVIEW-008");
      expect(notice?.severity).toBe("info");
      expect(notice?.refs).toContain("tmp/");
    });
  });

  it("stays silent when the project ignores `tmp/` from its own section", async () => {
    // `qfai init` never re-adds a recommended entry to an existing block, so
    // this is the shape a long-lived project keeps. Reporting it would push
    // the author to duplicate a rule they already have.
    await withGitignore(`/tmp/\n\n${preTmpBlock}`, (issues) => {
      expect(issues.some((entry) => entry.code === "QFAI-REVIEW-008")).toBe(false);
    });
  });
});
