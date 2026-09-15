/**
 * Reading a file out of a tree QFAI did not create.
 *
 * Three call sites need the same posture, and a partial version at each of them is the same defect
 * three times over: `lstat`-then-`readFile`, or no check and an unbounded `readFile`, against a
 * path the adopter controls. A FIFO, a device, a multi-gigabyte file,
 * or a symlink to any of them hangs the process or exhausts its memory, and `lstat(path)` followed by
 * `readFile(path)` resolves the name TWICE, so what was inspected is not necessarily what is read.
 *
 * One open, one descriptor, every decision on it:
 *
 * 1. `lstat` first and refuse a symlink outright. `O_NOFOLLOW` does not exist on Windows — measured:
 *    `fsConstants.O_NOFOLLOW` is `undefined` and `open` follows the link — so the flag cannot be the
 *    only defence.
 * 2. Open with `O_NOFOLLOW` and `O_NONBLOCK` where they exist. `O_NONBLOCK` is what stops a FIFO
 *    blocking the process in `open` itself.
 * 3. `fstat` the DESCRIPTOR, not the path, and require a regular file within the ceiling.
 * 4. Confirm the descriptor is the object `lstat` inspected, by `dev` and `ino`. A path swapped
 *    between the two calls changes them, and a mismatch is refused rather than read. On a volume
 *    that reports no inode, the size, mode and times stand in for it — see {@link sameObject}.
 * 5. Read at most `maxBytes + 1`. A file that GREW past the size `fstat` reported is no longer the
 *    file that was measured, and the extra byte is how that is noticed rather than truncated.
 *
 * Every refusal returns `undefined`. Callers turn that into their own conservative answer — an empty
 * record, an unreadable-file finding, a name left un-pruned — because a reader that throws in a
 * diagnostic path converts a hostile tree into a crash.
 */
import type { Stats } from "node:fs";
import { constants as fsConstants } from "node:fs";
import { lstat, open } from "node:fs/promises";

/** `O_RDONLY`, plus the two flags that matter where the platform has them. */
function readOnlyNoFollowFlags(): number {
  let flags = fsConstants.O_RDONLY;
  if (typeof fsConstants.O_NOFOLLOW === "number") {
    flags |= fsConstants.O_NOFOLLOW;
  }
  if (typeof fsConstants.O_NONBLOCK === "number") {
    flags |= fsConstants.O_NONBLOCK;
  }
  return flags;
}

/** What both calls measure, and all this module compares them by. */
export type ObjectIdentity = Pick<
  Stats,
  "dev" | "ino" | "size" | "mode" | "mtimeMs" | "ctimeMs" | "birthtimeMs"
>;

/**
 * Whether the opened descriptor is the object the path was inspected as.
 *
 * `dev` and `ino` settle it wherever the volume reports an inode. Some report
 * `0` for every file, and there `0 === 0` proves nothing, so what both calls
 * still measured is compared instead: the size, the mode and the three times.
 * A swap those all survive is possible; one no check at all survives is
 * certain.
 *
 * Refusing outright where the inode is missing is not the answer — every file
 * on such a volume would then be reported unreadable — and the `fstat` beside
 * this call already holds the floor that does not depend on identity: the
 * descriptor is a regular file within the ceiling, whatever the path now names.
 */
export function sameObject(inspected: ObjectIdentity, opened: ObjectIdentity): boolean {
  if (inspected.dev !== opened.dev) return false;
  if (inspected.ino !== 0 && opened.ino !== 0) return inspected.ino === opened.ino;
  return (
    inspected.size === opened.size &&
    inspected.mode === opened.mode &&
    inspected.mtimeMs === opened.mtimeMs &&
    inspected.ctimeMs === opened.ctimeMs &&
    inspected.birthtimeMs === opened.birthtimeMs
  );
}

/**
 * The bytes of a regular file at `filePath`, or `undefined` for anything else.
 *
 * "Anything else" is deliberately wide: absent, a symlink, a FIFO, a device, a directory, larger than
 * `maxBytes`, unreadable, or an object that changed between the inspection and the open.
 */
export async function readBoundedRegularFile(
  filePath: string,
  maxBytes: number,
): Promise<Buffer | undefined> {
  let inspected;
  try {
    inspected = await lstat(filePath);
  } catch {
    return undefined;
  }
  if (inspected.isSymbolicLink() || !inspected.isFile()) {
    return undefined;
  }

  let handle;
  try {
    handle = await open(filePath, readOnlyNoFollowFlags());
  } catch {
    return undefined;
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > maxBytes) {
      return undefined;
    }
    if (!sameObject(inspected, stats)) {
      return undefined;
    }
    const ceiling = Math.min(stats.size, maxBytes);
    const buffer = Buffer.alloc(ceiling + 1);
    let filled = 0;
    while (filled < buffer.length) {
      const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, null);
      if (bytesRead === 0) {
        break;
      }
      filled += bytesRead;
    }
    return filled > ceiling ? undefined : buffer.subarray(0, filled);
  } catch {
    return undefined;
  } finally {
    await handle.close().catch(() => undefined);
  }
}

/** How much of a streamed file is held at once. */
const SCAN_CHUNK_BYTES = 64 * 1024;

/**
 * A regular file's bytes handed to `onChunk` a block at a time, under the same
 * posture {@link readBoundedRegularFile} takes — one open, one descriptor, every
 * decision on it.
 *
 * For a file too large to hold whose bytes still have to be judged: nothing is
 * retained beyond one block, and no size ceiling applies, because the size is
 * the reason for reading it this way.
 *
 * `onChunk` answers `"stop"` once it has seen enough, and the read ends there
 * with `"stopped"`. A file whose first block settles the question is not read
 * to its end for the sake of reading it, and the caller learns which of the two
 * ended the read without keeping its own flag for it.
 *
 * `"refused"` covers every reason the bytes were not read in full: absent, a
 * symlink, a FIFO, a device, a directory, an object that changed between the
 * inspection and the open, or a read that failed part-way. A caller cannot tell
 * those apart and does not need to — each is a file this run could not read.
 */
export async function scanBoundedRegularFile(
  filePath: string,
  onChunk: (chunk: Buffer) => "continue" | "stop",
): Promise<"read" | "stopped" | "refused"> {
  let inspected;
  try {
    inspected = await lstat(filePath);
  } catch {
    return "refused";
  }
  if (inspected.isSymbolicLink() || !inspected.isFile()) {
    return "refused";
  }

  let handle;
  try {
    handle = await open(filePath, readOnlyNoFollowFlags());
  } catch {
    return "refused";
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) return "refused";
    if (!sameObject(inspected, stats)) return "refused";
    const buffer = Buffer.alloc(SCAN_CHUNK_BYTES);
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) return "read";
      if (onChunk(buffer.subarray(0, bytesRead)) === "stop") return "stopped";
    }
  } catch {
    return "refused";
  } finally {
    await handle.close().catch(() => undefined);
  }
}
