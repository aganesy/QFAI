/**
 * A forced relink that cannot finish leaves the wrapper it found.
 *
 * `qfai init --force` replaces a project-owned file or directory at a wrapper
 * path with the managed link. It removed that entry recursively and then
 * created the link, and the two can fail independently, so a refused `symlink`
 * left the path empty and the project's own wrapper, with everything in it,
 * gone. The entry is now moved into a hold beside the path first and put back
 * when the link cannot be written.
 *
 * Only a refused link write is reported as missing Developer Mode. A failure
 * to move the entry into the hold, such as a locked file on Windows, is raised
 * as itself, so the operator is not sent to the wrong setting.
 */

import type * as fsPromises from "node:fs/promises";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { runInit } from "../helpers/legacyInit.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

type FsPromises = typeof fsPromises;

const { renameSpy } = vi.hoisted(() => ({ renameSpy: vi.fn() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return { ...actual, rename: (...args: unknown[]) => renameSpy(actual, ...args) };
});

beforeEach(() => {
  renameSpy.mockImplementation((actual: FsPromises, from: string, to: string) =>
    actual.rename(from, to),
  );
});

const SKILL = "qfai-implement";
const PLURAL_TARGET = path.join("..", "..", ".qfai", "assistant", "skills", SKILL);

function eperm(): NodeJS.ErrnoException {
  return Object.assign(new Error("simulated EPERM"), { code: "EPERM" });
}

/** A `rename` that refuses to move `source` with `EPERM`, as a locked file on Windows does. */
function lockedAt(source: string): void {
  renameSpy.mockImplementation((actual: FsPromises, from: string, to: string) =>
    path.resolve(from) === path.resolve(source) ? Promise.reject(eperm()) : actual.rename(from, to),
  );
}

function eio(): NodeJS.ErrnoException {
  return Object.assign(new Error("simulated EIO"), { code: "EIO" });
}

/** A writer that refuses only the link at `refused` and writes every other one. */
function refusingAt(refused: string): typeof symlink {
  return (target, linkPath, type) =>
    path.resolve(String(linkPath)) === path.resolve(refused)
      ? Promise.reject(eio())
      : symlink(target, linkPath, type);
}

async function withInitializedProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-forced-relink-"));
  try {
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    await task(root);
  } finally {
    await removeTempTree(root);
  }
}

async function holdsBeside(wrapper: string): Promise<string[]> {
  return (await readdir(path.dirname(wrapper))).filter((name) =>
    name.startsWith(`${path.basename(wrapper)}.qfai-repair-`),
  );
}

/** The first agent wrapper `init` wrote under `.claude/agents/`. */
async function firstAgentWrapper(root: string): Promise<string> {
  const dir = path.join(root, ".claude", "agents");
  for (const name of (await readdir(dir)).sort()) {
    const candidate = path.join(dir, name);
    if ((await lstat(candidate)).isSymbolicLink()) return candidate;
  }
  throw new Error(`no agent wrapper under ${dir}`);
}

describe("qfai init --force over a project-owned wrapper", () => {
  it("keeps a wrapper directory and its content when the link cannot be created", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = path.join(root, ".claude", "skills", SKILL);
      await rm(wrapper, { recursive: true, force: true });
      await mkdir(path.join(wrapper, "references"), { recursive: true });
      await writeFile(path.join(wrapper, "SKILL.md"), "project skill\n", "utf-8");
      await writeFile(path.join(wrapper, "references", "notes.md"), "project notes\n", "utf-8");

      await expect(
        captureStdout(() =>
          runInit(
            { dir: root, force: true, dryRun: false, yes: true },
            { createSymlink: refusingAt(wrapper) },
          ),
        ),
      ).rejects.toThrow("simulated EIO");

      const kept = await lstat(wrapper);
      expect(kept.isSymbolicLink()).toBe(false);
      expect(kept.isDirectory()).toBe(true);
      expect(await readFile(path.join(wrapper, "SKILL.md"), "utf-8")).toBe("project skill\n");
      expect(await readFile(path.join(wrapper, "references", "notes.md"), "utf-8")).toBe(
        "project notes\n",
      );
      expect(await holdsBeside(wrapper)).toEqual([]);
    });
  });

  it("keeps a wrapper file when the link cannot be created", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = await firstAgentWrapper(root);
      await rm(wrapper);
      await writeFile(wrapper, "project agent\n", "utf-8");

      await expect(
        captureStdout(() =>
          runInit(
            { dir: root, force: true, dryRun: false, yes: true },
            { createSymlink: refusingAt(wrapper) },
          ),
        ),
      ).rejects.toThrow("simulated EIO");

      expect((await lstat(wrapper)).isFile()).toBe(true);
      expect(await readFile(wrapper, "utf-8")).toBe("project agent\n");
      expect(await holdsBeside(wrapper)).toEqual([]);
    });
  });

  it("replaces the wrapper with the link and leaves no hold when the link is created", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = path.join(root, ".claude", "skills", SKILL);
      await rm(wrapper, { recursive: true, force: true });
      await mkdir(wrapper, { recursive: true });
      await writeFile(path.join(wrapper, "SKILL.md"), "project skill\n", "utf-8");

      await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

      expect((await lstat(wrapper)).isSymbolicLink()).toBe(true);
      expect(await holdsBeside(wrapper)).toEqual([]);
    });
  });
});

describe("a wrapper that cannot be moved aside", () => {
  it("is not reported as missing Developer Mode under --force on Windows", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = path.join(root, ".claude", "skills", SKILL);
      await rm(wrapper, { recursive: true, force: true });
      await mkdir(wrapper, { recursive: true });
      await writeFile(path.join(wrapper, "SKILL.md"), "project skill\n", "utf-8");
      lockedAt(wrapper);

      const failure: unknown = await captureStdout(() =>
        runInit({ dir: root, force: true, dryRun: false, yes: true }, { platform: "win32" }),
      ).then(
        () => null,
        (err: unknown) => err,
      );

      expect(failure).toMatchObject({ code: "EPERM", message: "simulated EPERM" });
      expect(String(failure)).not.toContain("Developer Mode");
      expect(await readFile(path.join(wrapper, "SKILL.md"), "utf-8")).toBe("project skill\n");
      expect(await holdsBeside(wrapper)).toEqual([]);
    });
  });

  it("is not reported as missing Developer Mode when a plural link is repointed on Windows", async () => {
    await withInitializedProject(async (root) => {
      const wrapper = path.join(root, ".claude", "skills", SKILL);
      await rm(wrapper, { recursive: true, force: true });
      await symlink(PLURAL_TARGET, wrapper, "dir");
      lockedAt(wrapper);

      const failure: unknown = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }, { platform: "win32" }),
      ).then(
        () => null,
        (err: unknown) => err,
      );

      expect(failure).toMatchObject({ code: "EPERM", message: "simulated EPERM" });
      expect(String(failure)).not.toContain("Developer Mode");
      expect(path.normalize(await readlink(wrapper))).toBe(PLURAL_TARGET);
      expect(await holdsBeside(wrapper)).toEqual([]);
    });
  });
});
