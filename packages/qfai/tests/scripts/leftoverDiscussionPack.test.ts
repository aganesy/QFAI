/**
 * A discussion pack left in a checkout from before the pack was removed.
 *
 * The removal also dropped the ignore line that kept `.qfai/discussion/` out of
 * git, so an old pack turned into untracked files. `prettier -c .` and
 * `markdownlint-cli2 "**\/*.md"` both read untracked files, and the old pack is
 * neither Prettier-formatted nor lint-clean, so `pnpm format:check` and
 * `pnpm lint:md` failed on files the repository does not hold. Both checks now
 * skip the directory; the migration step that says to delete it still stands.
 */
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { main as markdownlintCli2Main } from "markdownlint-cli2";
import * as prettier from "prettier";
import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const packFile = path.join(".qfai", "discussion", "discussion-20260101-000000", "pack.md");

describe("a leftover discussion pack", () => {
  it("is skipped by the formatting check", async () => {
    const info = await prettier.getFileInfo(path.join(repoRoot, packFile), {
      ignorePath: [path.join(repoRoot, ".gitignore"), path.join(repoRoot, ".prettierignore")],
    });

    expect(info.ignored).toBe(true);
  });

  it("is skipped by the Markdown lint", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-discussion-pack-"));
    try {
      await copyFile(
        path.join(repoRoot, ".markdownlint-cli2.jsonc"),
        path.join(tempRoot, ".markdownlint-cli2.jsonc"),
      );
      const absolute = path.join(tempRoot, packFile);
      await mkdir(path.dirname(absolute), { recursive: true });
      // No top-level heading, a trailing space and no final newline: three findings.
      await writeFile(absolute, "pack body \n## Section", "utf-8");

      const output: string[] = [];
      const log = (...args: unknown[]): void => {
        output.push(args.map(String).join(" "));
      };
      const exitCode = await markdownlintCli2Main({
        directory: tempRoot,
        argv: ["**/*.md"],
        logMessage: log,
        logError: log,
        noRequire: true,
      });

      expect(exitCode, output.join("\n")).toBe(0);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
