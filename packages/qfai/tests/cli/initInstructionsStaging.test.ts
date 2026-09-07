/**
 * The staging file a `--force` instructions refresh goes through is removed on
 * every path that does not consume it.
 *
 * `replaceWithRegularFile` writes `<dest>.qfai-init-<pid>-<ts>` and renames it
 * into place. The rename failures were already cleaned up, but the staging
 * write itself sat outside the guard: an `ENOSPC` or a mid-transfer I/O fault
 * that had already committed bytes left a partial `.qfai-init-*` inside
 * `.github/instructions/`, a tracked directory — one more on every retry, each
 * under a different name, all of them commit candidates.
 *
 * `vi.mock` is hoisted to module scope, so this lives apart from
 * `init.test.ts`, where the real `writeFile` must work.
 */

import type * as fsPromises from "node:fs/promises";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { writeFileSpy } = vi.hoisted(() => ({ writeFileSpy: vi.fn() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    writeFile: (...args: unknown[]) => writeFileSpy(actual, ...args),
  };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { captureStdout } = await import("../helpers/stdout.js");

/** A staging path, by the only marker that is stable across pid and clock. */
const isStagingPath = (target: unknown): target is string =>
  typeof target === "string" && target.includes(".qfai-init-");

function enospc(): NodeJS.ErrnoException {
  const error = new Error("simulated ENOSPC") as NodeJS.ErrnoException;
  error.code = "ENOSPC";
  return error;
}

beforeEach(() => {
  writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
    actual.writeFile(...args),
  );
});

describe("a --force instructions refresh leaves no staging file behind", () => {
  it("removes the partial staging file when the write fails mid-transfer", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-staging-"));
    try {
      const instrDir = path.join(root, ".github", "instructions");
      await mkdir(instrDir, { recursive: true });
      await writeFile(path.join(instrDir, "code-review.instructions.md"), "local-cr\n", "utf-8");
      await writeFile(path.join(instrDir, "principles.instructions.md"), "local-pr\n", "utf-8");

      // Commit bytes first, then fail: the state the guard exists for. A mock
      // that only rejects would pass even with no cleanup at all.
      writeFileSpy.mockImplementation(async (actual: FsPromises, ...args: never[]) => {
        const [target] = args;
        if (isStagingPath(target)) {
          await actual.writeFile(target, "partially-written", "utf-8");
          throw enospc();
        }
        return actual.writeFile(...args);
      });

      await expect(
        captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true })),
      ).rejects.toThrow("ENOSPC");

      expect((await readdir(instrDir)).filter((entry) => entry.includes(".qfai-init-"))).toEqual(
        [],
      );
      // And the file the refresh could not finish is the one it found.
      expect(await readFile(path.join(instrDir, "code-review.instructions.md"), "utf-8")).toBe(
        "local-cr\n",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
