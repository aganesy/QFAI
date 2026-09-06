/**
 * Unit: what the atomic `.qfai/state.json` write must NOT change about
 * the file it replaces, and what it must not expose while replacing it.
 *
 * Staging + `rename` needs rights the direct `writeFile` it replaced did
 * not (a parent directory that accepts new entries), and it cannot carry
 * rights that write kept (the document's owner/group, and its mode).
 * Each case here pins one of those, plus the two properties the staging
 * directory itself has to hold: nobody else may write into it, and a
 * leftover has to stay ignorable wherever the document resolves to.
 *
 * `lstat` / `mkdir` / `open` / `writeFile` are mocked because the
 * interesting states — a `0600` document, a document owned by another
 * account, a directory that refuses new entries, a scratch file swapped
 * by another account between the write and the rename — are either
 * unreachable on Windows, require a second uid, or cannot be timed from
 * a test. This file lives apart from `state.test.ts` because `vi.mock`
 * is hoisted to module scope and would otherwise apply to every case in
 * that file.
 */
// QFAI:SPEC-0010:TC-0010-0012

import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type * as fsPromises from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const { lstatSpy, mkdirSpy, openSpy, writeFileSpy } = vi.hoisted(() => ({
  lstatSpy: vi.fn(),
  mkdirSpy: vi.fn(),
  openSpy: vi.fn(),
  writeFileSpy: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    lstat: (...args: unknown[]) => lstatSpy(actual, ...args),
    mkdir: (...args: unknown[]) => mkdirSpy(actual, ...args),
    open: (...args: unknown[]) => openSpy(actual, ...args),
    writeFile: (...args: unknown[]) => writeFileSpy(actual, ...args),
  };
});

const { writeStateFile } = await import("../../../src/core/state.js");
const { QFAI_STATE_SCRATCH_IGNORE, QFAI_STATE_SCRATCH_SUFFIX, gitignorePatternMatches } =
  await import("../../../src/core/gitignore.js");

let root: string;
let abs: string;
/** Staging directories seen while they existed, mapped to their permission bits. */
let stagingModes: Map<string, number>;

/**
 * The mode each staging directory was CREATED with, as asked for.
 *
 * Separate from {@link stagingModes}, which stats the directory that
 * resulted. The two agree on POSIX and cannot on Windows, where the
 * filesystem has no permission bits to carry the request: Node ignores
 * `mode` there and `stat()` answers `0o666` for every file and directory
 * alike. Asserting only the stat made this case fail on Windows for a
 * platform property rather than for anything the source does (#1182).
 */
let stagingRequestedModes: Map<string, number | undefined>;

/** The paths `writeFile` was asked to fill, in call order. */
function writtenPaths(): string[] {
  return writeFileSpy.mock.calls.map((call) => String(call[1]));
}

/**
 * The `open` call that created the scratch file, if there was one.
 * Matched on `.tmp` anywhere in the path so the helper describes the
 * scratch rather than one particular layout of it.
 */
function scratchOpen(): unknown[] | undefined {
  return openSpy.mock.calls.find((call) => String(call[1]).includes(".tmp"));
}

/** Repository-relative path of the scratch file, in gitignore's separator. */
function scratchRelPath(): string {
  return path.relative(root, String(scratchOpen()?.[1])).split(path.sep).join("/");
}

beforeEach(async () => {
  stagingModes = new Map();
  stagingRequestedModes = new Map();
  // Implementations first: `mkdir` below is the mocked export too, and a
  // reset spy silently does nothing.
  lstatSpy.mockReset();
  mkdirSpy.mockReset();
  openSpy.mockReset();
  writeFileSpy.mockReset();
  lstatSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.lstat(...args));
  mkdirSpy.mockImplementation(async (actual: FsPromises, target: string, ...rest: never[]) => {
    const made = await actual.mkdir(target, ...rest);
    // Recorded here because the staging directory is gone by the time
    // the write returns.
    if (String(target).endsWith(QFAI_STATE_SCRATCH_SUFFIX)) {
      stagingModes.set(String(target), (await actual.stat(String(target))).mode & 0o7777);
      const options = rest[0] as { mode?: number } | number | undefined;
      stagingRequestedModes.set(
        String(target),
        typeof options === "number" ? options : options?.mode,
      );
    }
    return made;
  });
  openSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.open(...args));
  writeFileSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
    actual.writeFile(...args),
  );
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-state-perm-"));
  abs = path.join(root, ".qfai", "state.json");
  await mkdir(path.dirname(abs), { recursive: true });
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
  it("creates the scratch file at 0600, whatever the document's mode", async () => {
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

  it("fills the scratch privately until the document's group is confirmed", async () => {
    await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 6 } })}\n`, "utf-8");
    const before = await stat(abs);
    // A `0640` document owned by a group this user only holds as a
    // supplementary member: outside a setgid directory the scratch is
    // created with the user's PRIMARY group instead, so copying the
    // document's mode onto it hands the whole state to that unrelated
    // group for the length of the write.
    reportExistingAs({ mode: 0o100640, gid: before.gid + 1 });

    await writeStateFile(root, { discussion: { currentId: "discussion-G" } });

    expect(scratchOpen()?.[3]).toBe(0o600);
    // And the mismatch this scratch would have leaked to is exactly the
    // one that sends the write back in place, so it is never widened.
    expect(writtenPaths().at(-1)).toBe(abs);
  });

  it("stages the scratch in a directory no other account may write", async () => {
    await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 7 } })}\n`, "utf-8");

    await writeStateFile(root, { discussion: { currentId: "discussion-S" } });

    // A scratch lying directly beside the document is swappable by every
    // account that may rename entries there, and noticing the swap before
    // the rename is a check against a separate pathname lookup. Its own
    // `0700` directory denies the swap outright instead.
    const scratchDir = path.dirname(String(scratchOpen()?.[1]));
    // What the source asks for, on every platform.
    expect(stagingRequestedModes.get(scratchDir)).toBe(0o700);
    // And what the filesystem made of it, where there are bits to make it of.
    // Windows has none: Node ignores `mode` in `mkdir` there and `stat()`
    // answers `0o666` for every entry, so the stat says nothing about this
    // source and asserting it failed the case on the platform, not the code.
    if (process.platform !== "win32") {
      expect(stagingModes.get(scratchDir)).toBe(0o700);
    }
    expect(scratchDir).not.toBe(path.dirname(abs));
    expect(path.dirname(scratchDir)).toBe(path.dirname(abs));
    expect(await readdir(path.dirname(abs))).toEqual(["state.json"]);
  });

  it("names the staging directory so the managed .gitignore already covers it", async () => {
    await writeStateFile(root, { discussion: { currentId: "discussion-IGNORED" } });

    // A run killed between the write and the rename leaves this path
    // behind, and only the ignore keeps `git add .` off it.
    expect(scratchOpen()).toBeDefined();
    expect(gitignorePatternMatches(QFAI_STATE_SCRATCH_IGNORE, scratchRelPath())).toBe(true);
  });

  it.skipIf(process.platform === "win32")(
    "keeps the staging ignorable when the document is a symlink out of .qfai",
    async () => {
      const shared = path.join(root, "runtime", "shared.json");
      await mkdir(path.dirname(shared), { recursive: true });
      await writeFile(shared, `${JSON.stringify({ unrelated: { keep: true } })}\n`, "utf-8");
      await symlink(shared, abs);

      await writeStateFile(root, { discussion: { currentId: "discussion-LINK" } });

      // The write follows the link, so the scratch is staged next to the
      // RESOLVED file — a `.qfai/`-anchored ignore never covers it, and a
      // killed run leaves tracked-looking state under `runtime/`.
      const relative = scratchRelPath();
      expect(relative.startsWith("runtime/")).toBe(true);
      expect(gitignorePatternMatches(QFAI_STATE_SCRATCH_IGNORE, relative)).toBe(true);
      expect(await readdir(path.join(root, "runtime"))).toEqual(["shared.json"]);
    },
  );

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
      if (!String(target).includes(".tmp")) return handle;
      const close = handle.close.bind(handle);
      // The staging directory's `0700` denies another account the swap
      // itself; this stands in for what it cannot deny — that account
      // renaming the staging directory away and putting its own in the
      // place, so the scratch name resolves elsewhere once released.
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
      if (String(target).includes(".tmp")) {
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

  it("rewrites in place when the directory refuses the staging directory", async () => {
    await writeFile(abs, `${JSON.stringify({ atdd: { cycles: 8 } })}\n`, "utf-8");
    mkdirSpy.mockImplementation(async (actual: FsPromises, target: string, ...rest: never[]) => {
      if (String(target).endsWith(QFAI_STATE_SCRATCH_SUFFIX)) {
        const denied: NodeJS.ErrnoException = new Error("simulated EACCES");
        denied.code = "EACCES";
        throw denied;
      }
      return actual.mkdir(target, ...rest);
    });
    // Only the write under test may count towards `writtenPaths`.
    writeFileSpy.mockClear();

    // Staging asks the parent directory for a new entry the sibling
    // scratch also needed, so file-update-only permissions must still
    // fall back to the direct write rather than surface EACCES.
    await writeStateFile(root, { discussion: { currentId: "discussion-M" } });

    expect(writtenPaths()).toEqual([abs]);
    expect(await readdir(path.dirname(abs))).toEqual(["state.json"]);
    const parsed = JSON.parse(await readFile(abs, "utf-8")) as {
      discussion?: { currentId?: string };
    };
    expect(parsed.discussion?.currentId).toBe("discussion-M");
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
