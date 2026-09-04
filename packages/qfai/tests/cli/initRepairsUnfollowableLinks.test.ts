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
import { lstat, mkdtemp, readdir, readlink, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { statSpy, symlinkSpy } = vi.hoisted(() => ({ statSpy: vi.fn(), symlinkSpy: vi.fn() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    stat: (...args: unknown[]) => statSpy(actual, ...args),
    symlink: (...args: unknown[]) => symlinkSpy(actual, ...args),
  };
});

/** Every `symlink` call made for `linkPath`, whatever the target or type. */
function symlinkCallsFor(linkPath: string): unknown[][] {
  return symlinkSpy.mock.calls.filter(
    (call: unknown[]) => path.resolve(String(call[2])) === path.resolve(linkPath),
  );
}

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

/** The first agent wrapper `qfai init` wrote — a `type: "file"` link. */
async function firstAgentWrapper(root: string): Promise<string> {
  const dir = path.join(root, ".claude", "agents");
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  const first = names[0];
  if (first === undefined) {
    throw new Error(`no agent wrapper under ${dir} to exercise the narrowing against`);
  }
  return path.join(dir, first);
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
  symlinkSpy.mockReset();
  symlinkSpy.mockImplementation(
    (actual: FsPromises, target: string, linkPath: string, type?: string) =>
      actual.symlink(target, linkPath, type),
  );
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

      const identityBefore = await lstat(linkPath);
      symlinkSpy.mockClear();

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      // The entry was a symlink with the right target BEFORE this run too, so
      // "is a symlink, same target" cannot tell a repair from the `"skipped"`
      // this change exists to stop. The `symlink` call is the proof that the
      // link was recreated, and the identity is the proof on disk.
      // The spy rather than the inode: Windows does not report a stable `ino`
      // for a symlink, so an identity comparison there passes whether or not
      // the entry was replaced, which is the same defect as the assertions it
      // would be standing in for.
      expect(symlinkCallsFor(linkPath)).toHaveLength(1);
      expect(identityBefore.isSymbolicLink()).toBe(true);

      // And it is still the link it was meant to be, not something else.
      const identityAfter = await lstat(linkPath);
      expect(identityAfter.isSymbolicLink()).toBe(true);
      expect(path.normalize(await readlink(linkPath))).toBe(path.normalize(targetBefore));
    });
  });

  it("leaves an agent wrapper alone even when stat refuses it", async () => {
    // The narrowing. An agent wrapper is a `type: "file"` link at a `.md`
    // document, and git writes those with the kind they need already — so an
    // `EPERM` there is an ACL or filesystem failure, and recreating an
    // identical link cannot clear it. Repairing would churn the entry and
    // report the same finding on the next run.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const agentLink = await firstAgentWrapper(root);
      const before = await lstat(agentLink);
      rejectStatOn(agentLink);
      symlinkSpy.mockClear();

      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      expect(symlinkCallsFor(agentLink)).toHaveLength(0);
      expect((await lstat(agentLink)).ino).toBe(before.ino);
    });
  });

  it("restores the original link when the recreate fails", async () => {
    // Without the rollback the failure mode is worse than the state being
    // repaired: the wrapper ends up ABSENT, and an absent wrapper is the one
    // state `QFAI-LINK-001` deliberately treats as benign — so the damage
    // becomes invisible to the gate whose remedy sent the operator here.
    await withProject(async (root) => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      const linkPath = path.join(root, LINK);
      const targetBefore = await readlink(linkPath);
      rejectStatOn(linkPath);
      symlinkSpy.mockImplementation(
        (actual: FsPromises, target: string, created: string, type?: string) =>
          path.resolve(created) === path.resolve(linkPath)
            ? Promise.reject(errno("EPERM"))
            : actual.symlink(target, created, type),
      );

      await expect(
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      ).rejects.toMatchObject({ code: "EPERM" });

      // The wrapper is still there, and still names the same target.
      const after = await lstat(linkPath);
      expect(after.isSymbolicLink()).toBe(true);
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
