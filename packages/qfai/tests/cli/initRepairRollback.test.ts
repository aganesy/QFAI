/**
 * A failed repair must not be worse than the state it repaired.
 *
 * `ensureSymlink` removed the flattened file and then created the symlink, and
 * the two can fail independently: `symlink` raises `EPERM` on Windows without
 * Developer Mode, which is the same condition that produced the flattened
 * checkout in the first place. `qfai init` then exited non-zero having deleted
 * the wrapper — and an absent wrapper is the one state `QFAI-LINK-001`
 * deliberately treats as benign, since a project that predates a newly shipped
 * skill looks identical. The flattened file at least announced itself.
 *
 * `vi.mock` is hoisted to module scope, so this lives apart from
 * `initRepairsFlattenedLinks.test.ts` where the real `symlink` must work.
 */

import type * as fsPromises from "node:fs/promises";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { symlinkSpy } = vi.hoisted(() => ({ symlinkSpy: vi.fn() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return { ...actual, symlink: (...args: unknown[]) => symlinkSpy(actual, ...args) };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { captureStdout } = await import("../helpers/stdout.js");

const LINK = path.join(".claude", "skills", "qfai-atdd");
const FLATTENED = "../../.qfai/assistant/skills/qfai-atdd";

function eperm(): NodeJS.ErrnoException {
  const error = new Error("simulated EPERM") as NodeJS.ErrnoException;
  error.code = "EPERM";
  return error;
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-repair-rollback-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("a repair that cannot finish leaves the file it found", () => {
  it("restores the flattened file when the symlink cannot be created", async () => {
    await withProject(async (root) => {
      symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.symlink(...args),
      );
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // Only the repair's own recreate fails; everything already on disk stays.
      symlinkSpy.mockImplementation((_actual: FsPromises, _target: string, linkArg: string) =>
        linkArg === linkPath ? Promise.reject(eperm()) : Promise.resolve(undefined),
      );

      await expect(
        captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true })),
      ).rejects.toThrow("EPERM");

      // The point of the test: the wrapper is still there, and still says what
      // it said, so the next run can try again and the operator can see it.
      expect(await readFile(linkPath, "utf-8")).toBe(FLATTENED);
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(false);
    });
  });
});
