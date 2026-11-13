/**
 * A discussion pack left in a checkout from before the pack was removed.
 *
 * The removal also dropped the ignore line that kept `.qfai/discussion/` out of
 * git, so an old pack turned into untracked files. Both `prettier -c .` and
 * `markdownlint-cli2` read untracked files, and the old pack is neither
 * Prettier-formatted nor lint-clean, so `pnpm format:check` and `pnpm lint:md`
 * failed on files the repository does not hold. Both checks now skip the
 * directory; the migration step that says to delete it still stands.
 *
 * The Markdown case runs the linter's entry script rather than importing it: the
 * package ships no type declarations, and a suite that imports it has to leave
 * the type-check enumeration.
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as prettier from "prettier";
import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const packFile = path.join(".qfai", "discussion", "discussion-20260101-000000", "pack.md");

// The linter's entry script, run through Node: a `.cmd` shim under `.bin` cannot
// be spawned without a shell on Windows.
const LINTER = path.join(
  repoRoot,
  "node_modules",
  "markdownlint-cli2",
  "markdownlint-cli2-bin.mjs",
);

/** The linter's exit status over `directory`, and everything it printed. */
function lint(directory: string): { status: number | null; output: string } {
  const run = spawnSync(process.execPath, [LINTER, "**/*.md"], {
    cwd: directory,
    encoding: "utf-8",
  });
  if (run.error) throw run.error;
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

describe("a leftover discussion pack", () => {
  it("is skipped by the formatting check", async () => {
    const info = await prettier.getFileInfo(path.join(repoRoot, packFile), {
      ignorePath: [path.join(repoRoot, ".gitignore"), path.join(repoRoot, ".prettierignore")],
    });

    expect(info.ignored).toBe(true);

    // The entry is no wider than the directory: the story tree beside it is still checked.
    const tracked = await prettier.getFileInfo(
      path.join(repoRoot, ".qfai", "spec", "01_policy", "glossary.md"),
      {
        ignorePath: [path.join(repoRoot, ".gitignore"), path.join(repoRoot, ".prettierignore")],
      },
    );
    expect(tracked.ignored).toBe(false);
  });

  it("is skipped by the Markdown lint", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-discussion-pack-"));
    try {
      await copyFile(
        path.join(repoRoot, ".markdownlint-cli2.jsonc"),
        path.join(tempRoot, ".markdownlint-cli2.jsonc"),
      );
      // A clean file the linter must still read, so a pass means the run
      // happened and found nothing rather than matching no file at all.
      await writeFile(path.join(tempRoot, "README.md"), "# Temp\n\nOne line.\n", "utf-8");
      const absolute = path.join(tempRoot, packFile);
      await mkdir(path.dirname(absolute), { recursive: true });
      // No top-level heading, a trailing space and no final newline.
      await writeFile(absolute, "pack body \n## Section", "utf-8");

      const ignored = lint(tempRoot);
      expect(ignored.status, ignored.output).toBe(0);
      expect(ignored.output).toMatch(/Linting: 1 file/);

      // The same tree without the ignore entry: the pack's findings surface,
      // which is the failure a contributor met.
      await writeFile(
        path.join(tempRoot, ".markdownlint-cli2.jsonc"),
        JSON.stringify({ ignores: ["**/node_modules/**"] }),
        "utf-8",
      );
      const linted = lint(tempRoot);
      expect(linted.status, linted.output).toBe(1);
      expect(linted.output).toContain("pack.md");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
