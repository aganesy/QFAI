/**
 * `qfai init` repairs a wrapper whose target string is right but which the OS
 * will not follow (#1095).
 *
 * On Windows a `git worktree add` writes every `.claude/skills/*` link as a
 * FILE symlink pointing at a directory — at the moment git writes one, its
 * target does not yet exist in the new worktree and it has no reftype hint —
 * and the OS refuses to resolve that. `readlink` returns the correct target, so
 * `ensureSymlink` declared the entry sound and returned `"skipped"`, while
 * `qfai validate` reported it as damage. The remedy that finding prints is
 * "re-run `qfai init`", which landed on that skip and changed nothing: a
 * finding an operator cannot clear by following it.
 *
 * The condition is Windows-only, so it is simulated by rejecting `stat` on that
 * one path with `EPERM` — the errno Windows actually raises. `lstat` and
 * `readlink` are left real, because in the live failure they both succeed and
 * that is exactly what made the entry look healthy.
 *
 * This file is separate from `initRepairsFlattenedLinks.test.ts` for the reason
 * that file's sibling gives: `vi.mock` is hoisted to module scope, so a mock
 * added there would apply to every case in it.
 */
import { lstat, mkdtemp, readlink, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { statSpy } = vi.hoisted(() => ({ statSpy: vi.fn() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return { ...actual, stat: (...args: unknown[]) => statSpy(actual, ...args) };
});

const { runInit } = await import("../../src/cli/commands/init.js");

const LINK = path.join(".claude", "skills", "qfai-atdd");

function errno(code: string): NodeJS.ErrnoException {
  const error = new Error(`simulated ${code}`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-unfollowable-"));
  try {
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** `stat` raises EPERM for `target` alone; everything else is real. */
function rejectStatOn(target: string): void {
  statSpy.mockImplementation((actual: FsPromises, probed: string) =>
    path.resolve(String(probed)) === path.resolve(target)
      ? Promise.reject(errno("EPERM"))
      : actual.stat(probed),
  );
}

beforeEach(() => {
  statSpy.mockReset();
  statSpy.mockImplementation((actual: FsPromises, probed: string) => actual.stat(probed));
});

describe("qfai init repairs a link the OS will not follow", () => {
  it("recreates it without --force, so the printed remedy clears the finding", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const linkPath = path.join(root, LINK);

      // Precondition: init made a symlink whose target is correct.
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
      const targetBefore = await readlink(linkPath);

      // Now it is the Windows wrong-reparse-type case: intact, unfollowable.
      rejectStatOn(linkPath);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // Still a symlink, still the same target — recreated rather than removed
      // or replaced with something else.
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
      expect(path.normalize(await readlink(linkPath))).toBe(path.normalize(targetBefore));
    });
  });

  it("leaves a followable link alone", async () => {
    // The negative control, and the reason the check is `stat`-based rather
    // than unconditional: a second `init` over a healthy tree must still skip,
    // or every run would churn every wrapper.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const linkPath = path.join(root, LINK);
      const before = await lstat(linkPath);

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const after = await lstat(linkPath);
      expect(after.isSymbolicLink()).toBe(true);
      // Recreating would move the inode; skipping keeps it.
      expect(after.ino).toBe(before.ino);
      // And the real `stat` still resolves it.
      expect((await stat(linkPath)).isDirectory()).toBe(true);
    });
  });

  it("reports a dry run as a repair it would make, and makes none", async () => {
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const linkPath = path.join(root, LINK);
      const before = await lstat(linkPath);
      rejectStatOn(linkPath);

      await runInit({ dir: root, force: false, dryRun: true, yes: true });

      // A dry run that had recreated the link would have moved the inode.
      expect((await lstat(linkPath)).ino).toBe(before.ino);
    });
  });
});
