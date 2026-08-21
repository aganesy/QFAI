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
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const {
  symlinkSpy,
  writeFileSpy,
  readFileSpy,
  renameSpy,
  linkSpy,
  rmSpy,
  lstatSpy,
  openSpy,
  chmodSpy,
} = vi.hoisted(() => ({
  symlinkSpy: vi.fn(),
  writeFileSpy: vi.fn(),
  readFileSpy: vi.fn(),
  renameSpy: vi.fn(),
  linkSpy: vi.fn(),
  rmSpy: vi.fn(),
  lstatSpy: vi.fn(),
  openSpy: vi.fn(),
  chmodSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    symlink: (...args: unknown[]) => symlinkSpy(actual, ...args),
    writeFile: (...args: unknown[]) => writeFileSpy(actual, ...args),
    readFile: (...args: unknown[]) => readFileSpy(actual, ...args),
    rename: (...args: unknown[]) => renameSpy(actual, ...args),
    link: (...args: unknown[]) => linkSpy(actual, ...args),
    rm: (...args: unknown[]) => rmSpy(actual, ...args),
    lstat: (...args: unknown[]) => lstatSpy(actual, ...args),
    open: (...args: unknown[]) => openSpy(actual, ...args),
    chmod: (...args: unknown[]) => chmodSpy(actual, ...args),
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
  renameSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.rename(...args));
  linkSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.link(...args));
  rmSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.rm(...args));
  lstatSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.lstat(...args));
  openSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.open(...args));
  chmodSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.chmod(...args));
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
    // Swallowing the restore error reported "The original file was restored" on the
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
      // The restore claims the path with `link`, falling back to an exclusive
      // write; failing both is what leaves the content in the sidecar.
      linkSpy.mockImplementation(() => Promise.reject(new Error("simulated restore failure")));
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

      expect(error?.message).toContain("Restoring the original file failed as well");
      expect(error?.message).not.toContain("The original file was restored.");
      // The content is on disk in the sidecar, and the message names where —
      // a path is more use than a copy pasted into an error.
      expect(error?.message).toContain("The original content is kept here");
      expect(error?.message).toContain(".qfai-repair-");
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

      // The signature is read through a handle now, so the failure is injected
      // where the handle is taken.
      openSpy.mockImplementation((actual: FsPromises, file: string, ...rest: never[]) =>
        file === linkPath
          ? Promise.reject(Object.assign(new Error("simulated EACCES"), { code: "EACCES" }))
          : actual.open(file, ...rest),
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

      // The repair renames the file aside and reads *that*, so the content is
      // replaced under the sidecar pathname the moment the rename lands: what
      // it holds is no longer the flattened signature. Injected through the
      // filesystem rather than through the read call, because the read is now
      // pinned to the inode it measured — which is the point.
      const theirs = "# mine now\n";
      renameSpy.mockImplementation(async (actual: FsPromises, from: string, to: string) => {
        await actual.rename(from, to);
        if (to.includes(".qfai-repair-")) await actual.writeFile(to, theirs, "utf-8");
      });

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      renameSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.rename(...args),
      );
      expect(await readFile(linkPath, "utf-8")).toBe(theirs);
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(false);
    });
  });
});

describe("a sidecar left by an earlier failed repair is not overwritten", () => {
  it("claims a fresh name instead of taking the one already there", async () => {
    // A PID alone is not unique: a second run in the same process would rename
    // over the file the first one preserved, and the success path removes the
    // sidecar — so the message that said the content was kept would describe a
    // file that is gone.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // What an earlier failed repair would have left behind.
      const stranded = linkPath + ".qfai-repair-" + String(process.pid);
      const strandedContent = "# preserved by an earlier run";
      await writeFile(stranded, strandedContent, "utf-8");

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      expect(await readFile(stranded, "utf-8")).toBe(strandedContent);
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
    });
  });
});

describe("a claim that never took anything is released", () => {
  it("removes the empty sidecar when the rename fails", async () => {
    // Prune deliberately leaves these alone and the next attempt sidesteps the
    // name, so repeated failures would pile them up to the ceiling and refuse
    // every later repair.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      renameSpy.mockImplementation((actual: FsPromises, from: string, to: string) =>
        from === linkPath
          ? Promise.reject(new Error("simulated rename failure"))
          : actual.rename(from, to),
      );

      await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      ).catch(() => undefined);

      renameSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.rename(...args),
      );
      const leftovers = (await readdir(path.dirname(linkPath))).filter((name) =>
        name.includes(".qfai-repair-"),
      );
      expect(leftovers).toEqual([]);
    });
  });

  it("restores the wrapper when the post-move probe fails", async () => {
    // By then the wrapper has moved, so an error here left the pathname empty
    // and the original in the sidecar with nothing said about either.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // The probe is the `open` that pins the moved inode; the kind and the
      // ceiling are read from that handle, so this is where it can fail.
      openSpy.mockImplementation((actual: FsPromises, target: string, ...rest: never[]) =>
        target.includes(".qfai-repair-")
          ? Promise.reject(new Error("simulated probe failure"))
          : actual.open(target, ...rest),
      );

      await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      ).catch(() => undefined);

      openSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.open(...args));
      expect(await readFile(linkPath, "utf-8")).toBe(FLATTENED);
    });
  });
});

describe("a sidecar survives the next run", () => {
  it("is not pruned as a stale qfai- wrapper", async () => {
    // It is named after the wrapper it holds, so it matches the prune prefix —
    // and prune runs before the repair, so a `--force` re-run deleted the very
    // file an earlier failed repair preserved.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      const stranded = linkPath + ".qfai-repair-" + String(process.pid);
      const strandedContent = "# preserved by an earlier run";
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");
      await writeFile(stranded, strandedContent, "utf-8");

      await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

      expect(await readFile(stranded, "utf-8")).toBe(strandedContent);
    });
  });

  it("does not turn a cleanup failure into a failed repair", async () => {
    // The symlink is in place, so removing the sidecar is cleanup. Inside the
    // rollback try it ran against a path the new symlink already occupies, so
    // the restore raised EEXIST and init reported a repair that had succeeded.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      rmSpy.mockImplementation((actual: FsPromises, target: string, ...rest: never[]) =>
        target.startsWith(linkPath + ".qfai-repair-")
          ? Promise.reject(new Error("simulated cleanup failure"))
          : actual.rm(target, ...rest),
      );

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
    });
  });
});

describe("what was moved aside is what gets checked", () => {
  it("keeps the sidecar when its content changed before the cleanup", async () => {
    // The handle that vetted the content closes when the read returns, and a
    // process holding the inode from before the rename can append in the window
    // that follows. Deleting on the strength of the earlier read discarded
    // bytes nothing had seen — and the symlink now standing in that path means
    // they cannot be recovered.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // The append lands after the repair has read and vetted the sidecar,
      // while the symlink is being created.
      let sidecarPath: string | undefined;
      symlinkSpy.mockImplementation(async (actual: FsPromises, ...args: never[]) => {
        if (sidecarPath !== undefined) {
          await actual.writeFile(sidecarPath, `${FLATTENED}\nappended\n`, "utf-8");
        }
        return actual.symlink(...args);
      });
      renameSpy.mockImplementation(async (actual: FsPromises, from: string, to: string) => {
        if (to.includes(".qfai-repair-")) sidecarPath = to;
        return actual.rename(from, to);
      });

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.symlink(...args),
      );
      renameSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.rename(...args),
      );
      // The repair stands, and the changed content is still on disk.
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
      expect(sidecarPath).toBeDefined();
      expect(await readFile(sidecarPath ?? "", "utf-8")).toBe(`${FLATTENED}\nappended\n`);
    });
  });

  it("declines an entry that was appended to after its size was measured", async () => {
    // A process holding the inode from before the rename can append after the
    // `fstat`. Reading only the size just measured took a **prefix**, which
    // still matched the target — so the repair went ahead and the cleanup
    // deleted the sidecar with the appended bytes in it.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // The append lands between the `fstat` and the read, so the handle
      // reports the pre-append size: exactly what another process holding this
      // inode from before the rename produces. The bytes on disk are longer.
      const appended = `${FLATTENED}\n${"x".repeat(8192)}`;
      renameSpy.mockImplementation(async (actual: FsPromises, from: string, to: string) => {
        if (from === linkPath) await actual.writeFile(linkPath, appended, "utf-8");
        return actual.rename(from, to);
      });
      openSpy.mockImplementation(async (actual: FsPromises, target: string, ...rest: never[]) => {
        const handle = await actual.open(target, ...rest);
        if (!target.includes(".qfai-repair-")) return handle;
        const stale = await handle.stat();
        return Object.create(handle, {
          stat: {
            value: () => Promise.resolve({ ...stale, isFile: () => true, size: FLATTENED.length }),
          },
        }) as typeof handle;
      });

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      renameSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.rename(...args),
      );
      openSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.open(...args));
      // Put back whole, not truncated to the prefix that matched.
      expect(await readFile(linkPath, "utf-8")).toBe(appended);
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(false);
    });
  });

  it("skips an entry that grew past the ceiling between the probe and the rename", async () => {
    // The caller checked a small regular file; another process left a large one
    // at the path before the rename, so the unbounded read would have run on an
    // inode nothing had vetted.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // Swap in the oversized file at the moment the repair renames.
      const theirs = "x".repeat(8192);
      renameSpy.mockImplementation(async (actual: FsPromises, from: string, to: string) => {
        if (from === linkPath) await actual.writeFile(linkPath, theirs, "utf-8");
        return actual.rename(from, to);
      });

      // The point is that the content is never read: a large enough entry
      // would exhaust memory, and a FIFO would block for ever, so the outcome
      // has to come from the check rather than from reading it.
      const readsOfSidecar: string[] = [];
      readFileSpy.mockImplementation((actual: FsPromises, file: string, ...rest: never[]) => {
        if (file.startsWith(`${linkPath}.qfai-repair-`)) readsOfSidecar.push(file);
        return actual.readFile(file, ...rest);
      });

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      renameSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.rename(...args),
      );
      readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.readFile(...args),
      );
      expect(readsOfSidecar).toEqual([]);
      expect(await readFile(linkPath, "utf-8")).toBe(theirs);
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(false);
    });
  });

  it("reads the sidecar from the inode it measured, not from the pathname", async () => {
    // The kind and the ceiling were checked with `lstat` and the content then
    // read by pathname — two operations on two possibly different inodes.
    // Replace the sidecar between them and the read ran on something nothing
    // had vetted, with the original already moved aside.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // The gap only exists where the kind and the ceiling come from an `lstat`
      // and the content from a later `readFile`: replace the sidecar the moment
      // that `lstat` answers and the read runs on an inode nothing vetted.
      // Pinned to the measured handle, this injection never fires at all.
      lstatSpy.mockImplementation(async (actual: FsPromises, target: string, ...rest: never[]) => {
        const stats = await actual.lstat(target, ...rest);
        if (target.includes(".qfai-repair-")) {
          await actual.rm(target, { force: true });
          await actual.writeFile(target, "x".repeat(8192), "utf-8");
        }
        return stats;
      });
      const readsOfSidecar: string[] = [];
      readFileSpy.mockImplementation((actual: FsPromises, file: string, ...rest: never[]) => {
        if (file.includes(".qfai-repair-")) readsOfSidecar.push(file);
        return actual.readFile(file, ...rest);
      });

      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      lstatSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.lstat(...args));
      readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.readFile(...args),
      );
      // Nothing read it by pathname, and the repair finished on the entry it
      // had measured.
      expect(readsOfSidecar).toEqual([]);
      expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
    });
  });
});

describe("a restore puts back more than the bytes", () => {
  it("refuses to copy back an oversized sidecar instead of reading it whole", async () => {
    // This path also runs when the bounded probe *refused* the entry, so
    // reading it whole into memory to copy it back was exactly the exhaustion
    // that probe exists to avoid. Nothing is lost: the content is in the
    // sidecar, and the message says where.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      await writeFile(linkPath, FLATTENED, "utf-8");

      // Oversized by the time it is moved aside, and no hard links available.
      renameSpy.mockImplementation(async (actual: FsPromises, from: string, to: string) => {
        if (from === linkPath) await actual.writeFile(linkPath, "x".repeat(8192), "utf-8");
        return actual.rename(from, to);
      });
      linkSpy.mockImplementation(() => {
        const err = new Error("simulated EXDEV") as NodeJS.ErrnoException;
        err.code = "EXDEV";
        return Promise.reject(err);
      });
      const readsOfSidecar: string[] = [];
      readFileSpy.mockImplementation((actual: FsPromises, file: string, ...rest: never[]) => {
        if (file.includes(".qfai-repair-")) readsOfSidecar.push(file);
        return actual.readFile(file, ...rest);
      });

      const error = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      ).then(
        () => null,
        (err: unknown) => err as Error,
      );

      renameSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.rename(...args),
      );
      linkSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.link(...args));
      readFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.readFile(...args),
      );
      expect(readsOfSidecar).toEqual([]);
      expect(error?.message).toContain("Cannot restore the sidecar file");
      expect(error?.message).toContain(".qfai-repair-");
    });
  });

  it.skipIf(process.platform === "win32")("keeps the mode when it cannot hard-link", async () => {
    // `writeFile` makes a new inode with the umask and the parent's defaults, so
    // a `0600` file came back `0644` and readable by everyone — and the sidecar
    // that still carried the metadata was removed straight after. POSIX only:
    // Windows has no mode bits for `chmod` to carry.
    await withProject(async (root) => {
      await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

      const linkPath = path.join(root, LINK);
      await rm(linkPath, { recursive: true, force: true });
      await mkdir(path.dirname(linkPath), { recursive: true });
      // A flattened wrapper — so the repair actually runs — that somebody left
      // private. Content the repair does not recognise is skipped outright, and
      // then none of this path is exercised at all.
      await writeFile(linkPath, FLATTENED, { encoding: "utf-8", mode: 0o600 });

      // The recreate fails, which is what sends the repair through its restore;
      // and no hard links here, so that restore falls through to the exclusive
      // write which creates a fresh inode.
      symlinkSpy.mockImplementation((_actual: FsPromises, _target: string, linkArg: string) =>
        linkArg === linkPath ? Promise.reject(eperm()) : Promise.resolve(undefined),
      );
      linkSpy.mockImplementation(() => {
        const err = new Error("simulated EXDEV") as NodeJS.ErrnoException;
        err.code = "EXDEV";
        return Promise.reject(err);
      });

      await expect(
        captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true })),
      ).rejects.toThrow("EPERM");

      symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        actual.symlink(...args),
      );
      linkSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.link(...args));
      expect(await readFile(linkPath, "utf-8")).toBe(FLATTENED);
      expect((await lstat(linkPath)).mode & 0o777).toBe(0o600);
    });
  });

  it.skipIf(process.platform === "win32")(
    "takes the destination back out when the mode cannot be restored",
    async () => {
      // Reporting a wrong-permission restore while leaving it in place fixes
      // nothing: a `0600` file put back as `0644` is readable by everyone. The
      // fallback created the destination exclusively, so it is ours to remove,
      // and the sidecar keeps both the content and the permissions.
      await withProject(async (root) => {
        await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

        const linkPath = path.join(root, LINK);
        await rm(linkPath, { recursive: true, force: true });
        await mkdir(path.dirname(linkPath), { recursive: true });
        await writeFile(linkPath, FLATTENED, { encoding: "utf-8", mode: 0o600 });

        symlinkSpy.mockImplementation((_actual: FsPromises, _target: string, linkArg: string) =>
          linkArg === linkPath ? Promise.reject(eperm()) : Promise.resolve(undefined),
        );
        linkSpy.mockImplementation(() => {
          const err = new Error("simulated EXDEV") as NodeJS.ErrnoException;
          err.code = "EXDEV";
          return Promise.reject(err);
        });
        chmodSpy.mockImplementation(() => Promise.reject(new Error("simulated chmod failure")));

        const error = await captureStdout(() =>
          runInit({ dir: root, force: false, dryRun: false, yes: true }),
        ).then(
          () => null,
          (err: unknown) => err as Error,
        );

        symlinkSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
          actual.symlink(...args),
        );
        linkSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.link(...args));
        chmodSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
          actual.chmod(...args),
        );
        expect(error?.message).toContain("Rolled the restore back");
        // Nothing with the wrong permissions was left behind.
        await expect(lstat(linkPath)).rejects.toThrow();
      });
    },
  );
});

describe("the rollback does not overwrite a file created in the gap", () => {
  it("leaves a concurrently created file alone and reports it instead", async () => {
    // Between the `rm` and the `symlink`, another process can create its own
    // file at the path — an `EEXIST` from `symlink` is exactly that. The
    // default `w` flag truncated it and wrote the old flattened content over
    // the top, so the repair destroyed the very thing its rollback exists to
    // protect.
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

      // The other process wins the race: it writes its file after the `rm`,
      // and `symlink` fails with the `EEXIST` that announces it.
      const theirs = "# written between the rm and the symlink\n";
      symlinkSpy.mockImplementation(async (actual: FsPromises, ...args: never[]) => {
        await actual.writeFile(linkPath, theirs, "utf-8");
        return actual.symlink(...args);
      });

      const output = await captureStdout(() =>
        runInit({ dir: root, force: false, dryRun: false, yes: true }),
      ).catch((error: unknown) => (error instanceof Error ? error.message : String(error)));

      expect(await readFile(linkPath, "utf-8")).toBe(theirs);
      // The operator is told the restore did not happen and given the content.
      expect(String(output)).toContain(FLATTENED);
    });
  });
});

/**
 * POSIX only, and not because of a tooling limitation.
 *
 * On Windows `path.relative` yields the target *with* backslashes, so a
 * backslashed file is the native spelling and repairing it is correct. The
 * scenario only exists where the target is written with `/` and a backslash is
 * an ordinary character in a filename — which is every other platform. Faking
 * `process.platform` would not reproduce it either: the target itself would
 * still be backslashed. CI runs this on ubuntu.
 */
describe.skipIf(process.platform === "win32")(
  "a backslash spelling is not a flattened link on POSIX",
  () => {
    it("preserves a file whose only resemblance is a folded separator", async () => {
      // Folding the separator on POSIX made a hand-maintained
      // `..\..\.qfai\assistant\skills\...` — a regular file nobody asked init
      // to own — compare equal to the real link target, so it was deleted
      // without `--force`.
      await withProject(async (root) => {
        await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

        const linkPath = path.join(root, LINK);
        const backslashed = FLATTENED.split("/").join("\\");
        await rm(linkPath, { recursive: true, force: true });
        await mkdir(path.dirname(linkPath), { recursive: true });
        await writeFile(linkPath, backslashed, "utf-8");

        await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

        expect(await readFile(linkPath, "utf-8")).toBe(backslashed);
        expect((await lstat(linkPath)).isSymbolicLink()).toBe(false);
      });
    });
  },
);
