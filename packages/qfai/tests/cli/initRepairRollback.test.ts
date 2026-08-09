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

import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { symlinkSpy, writeFileSpy, readFileSpy } = vi.hoisted(() => ({
  symlinkSpy: vi.fn(),
  writeFileSpy: vi.fn(),
  readFileSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    symlink: (...args: unknown[]) => symlinkSpy(actual, ...args),
    writeFile: (...args: unknown[]) => writeFileSpy(actual, ...args),
    readFile: (...args: unknown[]) => readFileSpy(actual, ...args),
  };
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

// Every spy passes through by default; each test overrides only the call whose
// failure it is about.
beforeEach(() => {
  symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.symlink(...args));
  writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
    actual.writeFile(...args),
  );
  readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
    actual.readFile(...args),
  );
});

describe("a repair that cannot finish leaves the file it found", () => {
  it("restores the flattened file when the symlink cannot be created", async () => {
    await withProject(async (root) => {
      writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.writeFile(...args),
      );
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
  it("says the restore failed, and carries the content, when it could not write", async () => {
    // Swallowing the restore error reported "元のファイルは復元しました" on the
    // one path where the operator has to know the file is gone.
    await withProject(async (root) => {
      writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.writeFile(...args),
      );
      symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.symlink(...args),
      );
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      symlinkSpy.mockImplementation((_actual: FsPromises, _target: string, linkArg: string) =>
        linkArg === linkPath ? Promise.reject(eperm()) : Promise.resolve(undefined),
      );
      writeFileSpy.mockImplementation((actual: FsPromises, file: string, ...rest: never[]) =>
        file === linkPath
          ? Promise.reject(new Error("simulated restore failure"))
          : actual.writeFile(file, ...rest),
      );

      const error = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      ).then(
        () => null,
        (err: unknown) => err as Error,
      );

      expect(error?.message).toContain("元のファイルの復元にも失敗しました");
      expect(error?.message).not.toContain("元のファイルは復元しました。");
      // The content is not recoverable from the filesystem any more, so it has
      // to be in the message.
      expect(error?.message).toContain(FLATTENED);
    });
  });
  it("does not file an unreadable wrapper as somebody else's content", async () => {
    // `lstat` already succeeded, so the file is there and small. Answering
    // "not the signature" on a read failure put the path in the reassuring
    // `skipped` list and left the flattened wrapper in place, with
    // QFAI-LINK-001 failing and nothing to act on.
    await withProject(async (root) => {
      writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.writeFile(...args),
      );
      readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.readFile(...args),
      );
      symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.symlink(...args),
      );
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      readFileSpy.mockImplementation((actual: FsPromises, file: string, ...rest: never[]) =>
        file === linkPath
          ? Promise.reject(Object.assign(new Error("simulated EACCES"), { code: "EACCES" }))
          : actual.readFile(file, ...rest),
      );

      await expect(
        captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true })),
      ).rejects.toThrow("simulated EACCES");
    });
  });
});

describe("the flattened-link probe does not re-stat what the caller holds", () => {
  it("does not turn a transient lstat failure into somebody else's file", async () => {
    // `ensureSymlink` has already `lstat`ed the path; re-probing it inside
    // `isFlattenedLink` let `safeLstat` turn an `EIO` into `undefined`, which
    // reads as "not the signature" — so init left a flattened wrapper in the
    // reassuring `skipped` list. The `Stats` is passed through now, so the
    // second probe cannot fail at all.
    await withProject(async (root) => {
      writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.writeFile(...args),
      );
      readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.readFile(...args),
      );
      symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.symlink(...args),
      );
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      const stdout = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      );

      expect(stdout).toContain("was a flattened symlink");
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
    });
  });
});

describe("a wrapper that changed under the check is not deleted", () => {
  it("skips when the content no longer matches the flattened signature", async () => {
    // Between `isFlattenedLink` reading the file and the removal, an editor or
    // another process can replace it. Deleting on the strength of the earlier
    // read destroyed that content without `--force`, and the rollback does not
    // fire when the symlink then succeeds.
    await withProject(async (root) => {
      writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.writeFile(...args),
      );
      symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.symlink(...args),
      );
      readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.readFile(...args),
      );
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // The second read — the one immediately before the delete — sees the
      // content somebody else just wrote.
      const theirs = "# mine now\n";
      let reads = 0;
      readFileSpy.mockImplementation((actual: FsPromises, file: string, ...rest: never[]) => {
        if (file !== linkPath) return actual.readFile(file, ...rest);
        reads += 1;
        return Promise.resolve(reads === 1 ? FLATTENED : theirs);
      });

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      // Read through the real fs: the spy above answers every read.
      readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.readFile(...args),
      );
      expect(await readFile(linkPath, "utf-8")).toBe(FLATTENED);
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(false);
    });
  });
});
