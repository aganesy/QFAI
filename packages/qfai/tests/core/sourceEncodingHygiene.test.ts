// A NUL byte in a text file makes every text tool treat the whole file as
// binary. `grep` and `ripgrep` report `Binary file ... matches` and print
// nothing, `git diff` shows `Binary files differ`, and any scanner that reads
// the tree with a text reader either skips the file or stops at the NUL. So a
// single stray byte silently removes a file from the reach of every guard the
// repository has, including the ones that look for leaked identifiers.
//
// Two files carried one each, both written as a raw byte where the two-character
// escape was meant: `validators/traceability.ts` in a comment describing an
// invalid glob, and `testFileGlobsConfiguration.test.ts` in the glob itself.
// The second one is load-bearing - the test needs a pattern fast-glob rejects -
// which is exactly why the escape is the right spelling: same value, still text.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/core/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "tmp", ".serena", "coverage"]);

/** Extensions a text tool is expected to be able to read end to end. */
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".mts",
  ".cts",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".json5",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
  ".sh",
  ".feature",
  ".txt",
]);

async function collectTextFiles(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await collectTextFiles(path.join(dir, entry.name), out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name));
    }
  }
}

describe("source encoding hygiene", () => {
  it("holds no NUL byte in any text file", async () => {
    const files: string[] = [];
    await collectTextFiles(repoRoot, files);
    // Non-vacuity: a broken walk that returns nothing would pass silently.
    expect(files.length, "the walk found no text files - the traversal is wrong").toBeGreaterThan(
      500,
    );

    const offenders: string[] = [];
    for (const file of files) {
      const info = await stat(file);
      if (info.size === 0) continue;
      const bytes = await readFile(file);
      const index = bytes.indexOf(0);
      if (index !== -1) {
        const line = bytes.subarray(0, index).toString("utf-8").split("\n").length;
        offenders.push(`${path.relative(repoRoot, file).split(path.sep).join("/")}:${line}`);
      }
    }

    expect(
      offenders.sort(),
      "a NUL byte makes the whole file binary to grep, git diff and every scanner that " +
        "reads it as text - write the two-character escape instead, which is the same value",
    ).toEqual([]);
  });
});
