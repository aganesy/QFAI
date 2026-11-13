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
 * The Markdown case runs the linter's own binary rather than importing it: the
 * package ships no type declarations, and a suite that imports it has to leave
 * the type-check enumeration.
 */
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import * as prettier from "prettier";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const packFile = path.join(".qfai", "discussion", "discussion-20260101-000000", "pack.md");

/** The linter's exit code over `directory`, and everything it printed. */
async function lint(directory: string): Promise<{ code: number; output: string }> {
  const binary = path.join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "markdownlint-cli2.cmd" : "markdownlint-cli2",
  );
  try {
    const { stdout, stderr } = await execFileAsync(binary, ["**/*.md"], { cwd: directory });
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (cause) {
    const read = (key: "code" | "stdout" | "stderr"): unknown =>
      typeof cause === "object" && cause !== null && key in cause
        ? Reflect.get(cause, key)
        : undefined;
    const code = read("code");
    return {
      code: typeof code === "number" ? code : 1,
      output: `${String(read("stdout") ?? "")}${String(read("stderr") ?? "")}`,
    };
  }
}

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
      // A clean file the linter must still read, so a pass means the run
      // happened and found nothing rather than matching no file at all.
      await writeFile(path.join(tempRoot, "README.md"), "# Temp\n\nOne line.\n", "utf-8");
      const absolute = path.join(tempRoot, packFile);
      await mkdir(path.dirname(absolute), { recursive: true });
      // No top-level heading, a trailing space and no final newline.
      await writeFile(absolute, "pack body \n## Section", "utf-8");

      const ignored = await lint(tempRoot);
      expect(ignored.code, ignored.output).toBe(0);
      expect(ignored.output).toContain("Linting: 1 file(s)");

      // The same tree without the ignore entry: the pack's findings surface,
      // which is the failure a contributor met.
      await writeFile(
        path.join(tempRoot, ".markdownlint-cli2.jsonc"),
        JSON.stringify({ ignores: ["**/node_modules/**"] }),
        "utf-8",
      );
      const linted = await lint(tempRoot);
      expect(linted.code).not.toBe(0);
      expect(linted.output).toContain("pack.md");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
