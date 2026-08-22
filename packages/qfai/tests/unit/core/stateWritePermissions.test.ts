/**
 * Unit: what the atomic `.qfai/state.json` write must NOT change about
 * the file it replaces.
 *
 * The sibling temp + `rename` needs rights the direct `writeFile` it
 * replaced did not (a writable parent directory), and it cannot carry
 * rights that write kept (the document's owner/group, and its mode from
 * the first byte). Each case here pins one of those.
 *
 * `lstat` / `open` / `writeFile` are mocked because the interesting
 * states — a `0600` document, a document owned by another account, a
 * directory that refuses new entries, a scratch file swapped by another
 * account between the write and the rename — are either unreachable on
 * Windows, require a second uid, or cannot be timed from a test. This
 * file lives apart from `state.test.ts` because `vi.mock` is hoisted to
 * module scope and would otherwise apply to every case in that file.
 */
// QFAI:SPEC-0010:TC-0010-0012

import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { lstatSpy, openSpy, writeFileSpy } = vi.hoisted(() => ({
  lstatSpy: vi.fn(),
  openSpy: vi.fn(),
  writeFileSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    lstat: (...args: unknown[]) => lstatSpy(actual, ...args),
    open: (...args: unknown[]) => openSpy(actual, ...args),
    writeFile: (...args: unknown[]) => writeFileSpy(actual, ...args),
  };
});

const { writeStateFile } = await import("../../../src/core/state.js");
const { QFAI_STATE_SCRATCH_IGNORE, gitignorePatternMatches } =
  await import("../../../src/core/gitignore.js");

let root: string;
let abs: string;

/** The paths `writeFile` was asked to fill, in call order. */
function writtenPaths(): string[] {
  return writeFileSpy.mock.calls.map((call) => String(call[1]));
}

/** The `open` call that created the scratch file, if there was one. */
function scratchOpen(): unknown[] | undefined {
  return openSpy.mock.calls.find((call) => String(call[1]).endsWith(".tmp"));
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-state-perm-"));
  abs = path.join(root, ".qfai", "state.json");
  await mkdir(path.dirname(abs), { recursive: true });
  lstatSpy.mockReset();
  openSpy.mockReset();
  writeFileSpy.mockReset();
  lstatSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.lstat(...args));
  openSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.open(...args));
  writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
    actual.writeFile(...args),
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/**
 * Report the existing `state.json` with the given permission bits and
 * owner, leaving every other path on the real filesystem.
 */
function reportExistingAs(overrides: {
  mode?: number;
  uid?: number;
  gid?: number;
  nlink?: number;
}): void {
  lstatSpy.mockImplementation(async (actual: FsPromises, target: string, ...rest: never[]) => {
    const real = await actual.lstat(target, ...rest);
    if (path.resolve(String(target)) !== abs) return real;
    return {
      isSymbolicLink: () => false,
      isFile: () => true,
      mode: overrides.mode ?? real.mode,
      uid: overrides.uid ?? real.uid,
      gid: overrides.gid ?? real.gid,
      nlink: overrides.nlink ?? real.nlink,
    };
  });
}

describe("TC-0010-0012: the atomic state.json write preserves what it replaces", () => {
  it("creates the scratch file with the document's mode, not the umask default", async () => {
    await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 1 } })}\n`, "utf-8");
    reportExistingAs({ mode: 0o100600 });

    await writeStateFile(root, { discussion: { currentId: "discussion-A" } });

    // A `0644` scratch that is only chmod-ed after the last byte lets
    // another account on a shared host read the state mid-write.
    const scratchCall = scratchOpen();
    expect(scratchCall).toBeDefined();
    expect(scratchCall?.[3]).toBe(0o600);
    // `wx` is `O_CREAT|O_EXCL`: a symlink already planted at the scratch
    // name must fail the open, not be followed and then renamed onto the
    // document.
    expect(scratchCall?.[2]).toBe("wx");
  });

  it("names the scratch so the managed .gitignore already covers it", async () => {
    await writeStateFile(root, { discussion: { currentId: "discussion-IGNORED" } });

    // A run killed between the write and the rename leaves this name
    // behind, and only the ignore keeps `git add .` off it.
    const scratchCall = scratchOpen();
    expect(scratchCall).toBeDefined();
    const relative = `.qfai/${path.basename(String(scratchCall?.[1]))}`;
    expect(gitignorePatternMatches(QFAI_STATE_SCRATCH_IGNORE, relative)).toBe(true);
  });

  it("rewrites in place instead of stranding the document's other hard links", async () => {
    await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 4 } })}\n`, "utf-8");
    reportExistingAs({ nlink: 2 });

    await writeStateFile(root, { discussion: { currentId: "discussion-LINKED" } });

    // `rename` re-points one directory entry; every other name for the
    // document would keep resolving to the pre-write inode.
    expect(writtenPaths().at(-1)).toBe(abs);
    expect(await readdir(path.dirname(abs))).toEqual(["state.json"]);
  });

  it("refuses to rename a scratch that was replaced after it was written", async () => {
    const original = `${JSON.stringify({ atdd: { cycles: 5 } })}\n`;
    await writeFile(abs, original, "utf-8");
    openSpy.mockImplementation(async (actual: FsPromises, target: string, ...rest: never[]) => {
      const handle = await actual.open(target, ...rest);
      if (!String(target).endsWith(".tmp")) return handle;
      const close = handle.close.bind(handle);
      // Stand in for the other account that owns the shared directory:
      // it swaps the scratch the moment the descriptor is released.
      // Renamed over rather than unlinked-and-rewritten, so the decoy is
      // holding its own inode while the scratch still holds one — an
      // unlink first lets the filesystem hand the freed number straight
      // back and the swap becomes invisible.
      handle.close = async (): Promise<void> => {
        await close();
        const decoy = `${String(target)}.decoy`;
        await actual.writeFile(decoy, "not the state document", "utf-8");
        await actual.rename(decoy, String(target));
      };
      return handle;
    });

    await expect(
      writeStateFile(root, { discussion: { currentId: "discussion-D" } }),
    ).rejects.toThrow(/was replaced after it was written/u);
    expect(await readFile(abs, "utf-8")).toBe(original);
    expect(await readdir(path.dirname(abs))).toEqual(["state.json"]);
  });

  it("rewrites in place instead of renaming a scratch owned by someone else", async () => {
    const original = `${JSON.stringify({ atdd: { cycles: 2 } })}\n`;
    await writeFile(abs, original, "utf-8");
    const before = await stat(abs);
    reportExistingAs({ uid: before.uid + 1, gid: before.gid + 1 });

    await writeStateFile(root, { discussion: { currentId: "discussion-B" } });

    // `rename` keeps the SCRATCH file's uid/gid, so moving it over a
    // co-owned document would transfer the document to this user.
    expect(writtenPaths().at(-1)).toBe(abs);
    expect(await readdir(path.dirname(abs))).toEqual(["state.json"]);
    const parsed = JSON.parse(await readFile(abs, "utf-8")) as {
      discussion?: { currentId?: string };
    };
    expect(parsed.discussion?.currentId).toBe("discussion-B");
  });

  it("rewrites in place when the directory refuses new files but the document is writable", async () => {
    await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 3 } })}\n`, "utf-8");
    openSpy.mockImplementation(async (actual: FsPromises, target: string, ...rest: never[]) => {
      if (String(target).endsWith(".tmp")) {
        const denied: NodeJS.ErrnoException = new Error("simulated EACCES");
        denied.code = "EACCES";
        throw denied;
      }
      return actual.open(target, ...rest);
    });

    // File-update-only permissions: the direct write this replaced
    // worked here, so `discussion use` must keep working here.
    await writeStateFile(root, { discussion: { currentId: "discussion-C" } });

    expect(writtenPaths().at(-1)).toBe(abs);
    expect(await readdir(path.dirname(abs))).toEqual(["state.json"]);
    const parsed = JSON.parse(await readFile(abs, "utf-8")) as {
      discussion?: { currentId?: string };
    };
    expect(parsed.discussion?.currentId).toBe("discussion-C");
  });

  it("still fails when the document cannot be created at all", async () => {
    const deny = (): never => {
      const denied: NodeJS.ErrnoException = new Error("simulated EACCES");
      denied.code = "EACCES";
      throw denied;
    };
    openSpy.mockImplementation(deny);
    writeFileSpy.mockImplementation(deny);

    // No existing document means no in-place fallback to take: an
    // unwritable directory must surface, not be swallowed.
    await expect(writeStateFile(root, { discussion: { currentId: "x" } })).rejects.toThrow(
      /EACCES/u,
    );
  });
});
