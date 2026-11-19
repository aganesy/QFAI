/**
 * Acceptance test for the staging cleanup of `qfai init --force`: before it refreshes the
 * instructions files, init removes a file in `.github/instructions/` only when its name is exactly
 * a staging name init writes and the file is over an hour old. A recent staging file may belong to
 * another init still between its write and its rename, and a file whose name only resembles a
 * staging name is the project's.
 *
 * The case runs the real command against a temporary project and reads what it left on disk.
 */
import { mkdir, readdir, readFile, utimes, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../helpers/legacyInit.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-init-staging-cleanup-");

const HOUR_MS = 60 * 60 * 1000;

/** A staging name as init writes it: the file name, the infix, a base-36 pid and a 32-hex-digit token. */
function stagingName(dest: string, pid: string, token: string): string {
  return `${dest}.qfai-init-${pid}-${token}`;
}

describe("qfai init --force staging cleanup", () => {
  // QFAI:AC-0001-0031-02 QFAI:EX-0001-0031-04
  it("removes only old files named exactly as init stages them", async () => {
    const root = await newTempDir();
    const instrDir = path.join(root, ".github", "instructions");
    await mkdir(instrDir, { recursive: true });

    const removed = [
      stagingName("code-review.instructions.md", "1a2b", "c3".repeat(16)),
      stagingName("principles.instructions.md", "1z141z3", "d4".repeat(16)),
    ];
    const recent = [
      stagingName("code-review.instructions.md", "1a2b", "a1".repeat(16)),
      stagingName("principles.instructions.md", "1a2b", "b2".repeat(16)),
    ];
    // Old, so only the name keeps them: another file name, a short token, a pid
    // with a leading zero and a pid longer than any 32-bit pid in base 36.
    const lookAlikes = [
      stagingName("notes.md", "1a2b", "e5".repeat(16)),
      stagingName("code-review.instructions.md", "1a2b", "e5"),
      stagingName("principles.instructions.md", "01a2b", "e5".repeat(16)),
      stagingName("principles.instructions.md", "z".repeat(100), "e5".repeat(16)),
    ];
    const longAgo = new Date(Date.now() - 2 * HOUR_MS);
    for (const name of [...removed, ...recent, ...lookAlikes]) {
      const file = path.join(instrDir, name);
      await writeFile(file, "staged\n", "utf-8");
      if (!recent.includes(name)) await utimes(file, longAgo, longAgo);
    }

    await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

    const left = (await readdir(instrDir)).filter((entry) => entry.includes(".qfai-init-"));
    expect(left.sort()).toEqual([...recent, ...lookAlikes].sort());
    for (const name of [...recent, ...lookAlikes]) {
      expect(await readFile(path.join(instrDir, name), "utf-8")).toBe("staged\n");
    }
    // The refresh itself still ran.
    expect(await readdir(instrDir)).toEqual(
      expect.arrayContaining(["code-review.instructions.md", "principles.instructions.md"]),
    );
  });
});
