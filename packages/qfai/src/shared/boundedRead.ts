/**
 * Reading a file out of a tree QFAI did not create.
 *
 * Three call sites needed the same posture and each had its own partial version of it, which is how
 * PR #794's review found the same defect three times — `[02]` and `[33]` in the doctor's drift
 * reader, `[05]` in the retired-workflow prune. Each did `lstat`-then-`readFile`, or no check and an
 * unbounded `readFile`, against a path the adopter controls. A FIFO, a device, a multi-gigabyte file,
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
 *    between the two calls changes them, and a mismatch is refused rather than read.
 * 5. Read at most `maxBytes + 1`. A file that GREW past the size `fstat` reported is no longer the
 *    file that was measured, and the extra byte is how that is noticed rather than truncated.
 *
 * Every refusal returns `undefined`. Callers turn that into their own conservative answer — an empty
 * record, an unreadable-file finding, a name left un-pruned — because a reader that throws in a
 * diagnostic path converts a hostile tree into a crash.
 */
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
    if (stats.dev !== inspected.dev || stats.ino !== inspected.ino) {
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
