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

const { symlinkSpy, writeFileSpy, readFileSpy, renameSpy, linkSpy } = vi.hoisted(() => ({
  symlinkSpy: vi.fn(),
  writeFileSpy: vi.fn(),
  readFileSpy: vi.fn(),
  renameSpy: vi.fn(),
  linkSpy: vi.fn(),
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

      expect(error?.message).toContain("元のファイルの復元にも失敗しました");
      expect(error?.message).not.toContain("元のファイルは復元しました。");
      // The content is on disk in the sidecar, and the message names where —
      // a path is more use than a copy pasted into an error.
      expect(error?.message).toContain("元の内容は次の場所に退避してあります");
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

      // The repair renames the file aside and reads *that*, so the injection
      // answers for the sidecar: what it holds is not the flattened signature.
      const theirs = "# mine now\n";
      readFileSpy.mockImplementation((actual: FsPromises, file: string, ...rest: never[]) =>
        file.startsWith(`${linkPath}.qfai-repair-`)
          ? Promise.resolve(theirs)
          : actual.readFile(file, ...rest),
      );

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

describe("what was moved aside is what gets checked", () => {
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
