/**
 * A hold records a path a repair emptied, and nothing else.
 *
 * `qfai init` moves a link into `<link>.qfai-repair-<n>/` before replacing it,
 * and a migration restores an absent wrapper only when such a hold is beside
 * it. That reading is sound only while every writer that fills the path also
 * removes the holds beside it, so this file holds `init` to it, and to the two
 * platform inputs the replacement reads: the platform, which decides how link
 * targets compare, and the symlink writer, which may be refused.
 */

import { lstat, mkdir, mkdtemp, readdir, readlink, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const SKILL = "qfai-atdd";
const PLURAL_TARGET = path.join("..", "..", ".qfai", "assistant", "skills", SKILL);
const SINGULAR_TARGET = path.join("..", "..", ".qfai", "assistant", "skill", SKILL);

function eperm(): NodeJS.ErrnoException {
  return Object.assign(new Error("operation not permitted"), { code: "EPERM" });
}

async function withInitializedProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-holds-"));
  try {
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    await task(root);
  } finally {
    await removeTempTree(root);
  }
}

const wrapperOf = (root: string): string => path.join(root, ".claude", "skills", SKILL);

async function holdsBeside(wrapper: string): Promise<string[]> {
  return (await readdir(path.dirname(wrapper))).filter((name) =>
    name.startsWith(`${path.basename(wrapper)}.qfai-repair-`),
  );
}

describe("qfai init and the holds of an interrupted repair", () => {
  it("removes the hold beside a wrapper it recreates, and leaves an unrelated one", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = wrapperOf(root);
      await rm(wrapper);
      const stale = `${wrapper}.qfai-repair-4242`;
      await mkdir(stale);
      await symlink(PLURAL_TARGET, path.join(stale, SKILL), "dir");
      const unrelated = `${wrapper}.qfai-repair-5151`;
      await mkdir(unrelated);
      await symlink(path.join("..", "..", "nowhere"), path.join(unrelated, SKILL), "dir");

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      expect(path.normalize(await readlink(wrapper))).toBe(SINGULAR_TARGET);
      await expect(lstat(stale)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readlink(path.join(unrelated, SKILL))).toBe(path.join("..", "..", "nowhere"));
    });
  });

  it("compares a plural target without letter case on Windows, and puts it back when symlinks are refused", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = wrapperOf(root);
      await rm(wrapper);
      const oldTarget = PLURAL_TARGET.toUpperCase();
      await symlink(oldTarget, wrapper, "dir");
      let attempts = 0;

      await expect(
        runInit(
          { dir: root, force: false, dryRun: false, yes: true },
          {
            platform: "win32",
            createSymlink: async () => {
              attempts += 1;
              throw eperm();
            },
          },
        ),
      ).rejects.toThrow(/Failed to create a symlink \(EPERM\)/);

      // Read as the plural link, it went through the hold: one refused write
      // for the new link and one for the put-back, which then fell back to
      // `rename`. Read as some other link, it would have been deleted before
      // the one refused write and the path left empty.
      expect(attempts).toBe(2);
      expect(await readlink(wrapper)).toBe(oldTarget);
      expect(await holdsBeside(wrapper)).toEqual([]);
    });
  });

  it("reads a singular target in another letter case as right on Windows", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = wrapperOf(root);
      await rm(wrapper);
      const current = SINGULAR_TARGET.toUpperCase();
      await symlink(current, wrapper, "dir");
      let attempts = 0;

      await captureStdout(() =>
        runInit(
          { dir: root, force: false, dryRun: false, yes: true },
          {
            platform: "win32",
            createSymlink: async () => {
              attempts += 1;
              throw eperm();
            },
          },
        ),
      );

      expect(attempts).toBe(0);
      expect(await readlink(wrapper)).toBe(current);
    });
  });
});
