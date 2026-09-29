import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { access, chown, lstat, open, readFile } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode, isEnoent } from "../fs/errno.js";

/**
 * The first component of `target` at or below `destRoot` that is a symbolic
 * link, or `null` when every one of them is an ordinary directory or file.
 */
export async function firstLinkedComponent(
  target: string,
  destRoot: string,
): Promise<string | null> {
  const relative = path.relative(destRoot, target);
  let walked = destRoot;
  for (const segment of relative.split(path.sep)) {
    walked = path.join(walked, segment);
    const entry = await lstat(walked).catch(() => null);
    if (entry?.isSymbolicLink() === true) return walked;
  }
  return null;
}

/**
 * Gives the staged file the original's owner, or says why it could not.
 *
 * A rename makes the staged inode the file, so where ownership is not restored
 * the adopter's own file comes back owned by whoever ran init. At mode `0644`
 * its former owner can then read it and not edit it — a worse outcome than the
 * citation going unwritten, so this refuses rather than proceeding.
 *
 * Nothing is attempted where the process already owns the file, which is the
 * ordinary case, or on a platform with no ownership to restore.
 */
export async function keepOwner(staging: string, original: Stats): Promise<string | null> {
  if (typeof process.getuid !== "function" || typeof process.getgid !== "function") return null;
  if (original.uid === process.getuid() && original.gid === process.getgid()) return null;
  try {
    await chown(staging, original.uid, original.gid);
    return null;
  } catch (cause: unknown) {
    // The code alone. Node puts the full path in the message, and a checkout
    // whose path carries a newline or an escape sequence would then forge
    // report lines through a warning — the separately printed target goes
    // through `formatReportPath` for exactly that reason.
    const code = hasErrnoCode(cause) ? cause.code : "unknown";
    return `Its owner could not be kept (${code}). Renaming over it would leave the file owned by this run, and its owner unable to edit it.`;
  }
}

/** File contents, or `null` when nothing is there. Other read faults throw. */
export async function readTextFileIfPresent(target: string): Promise<string | null> {
  try {
    return await readFile(target, "utf-8");
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return null;
    }
    throw err;
  }
}

export async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * The bytes of a regular file no larger than `maxBytes`, read from the inode
 * the size was measured on, or `null` when the entry is not one.
 *
 * **The ceiling binds the entry that is read**, not the one a previous
 * `lstat` saw. Those are two pathname operations, and between them another
 * process can replace the path with a huge file or a FIFO — a bound checked on
 * the old inode does not bind the new one, and the read then exhausted memory
 * or never returned. One `open`, `fstat` on that handle, a bounded read from
 * it.
 *
 * A read fault is thrown rather than answered `null`: an ACL or a transient
 * `EIO` says the content could not be checked, and reporting that as "not a
 * bounded regular file" is a decision nobody made.
 */
export async function readPinnedRegularFile(
  filePath: string,
  maxBytes: number,
): Promise<string | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, OPEN_READ_FLAGS);
    const pinned = await handle.stat();
    if (!pinned.isFile() || pinned.size > maxBytes) {
      return null;
    }
    // Read to the end, not once: `read` may return fewer bytes than asked for,
    // and the unfilled tail stayed NUL — a correct flattened wrapper then
    // failed its own signature comparison and was left in place.
    //
    // And to `maxBytes + 1`, not to the size just measured. Another process
    // holding this inode from before the rename can append after the `fstat`,
    // and stopping at the old size read a **prefix** — which still matched the
    // target, so the repair went ahead and the cleanup deleted the sidecar with
    // the appended bytes in it. One byte past the ceiling is what distinguishes
    // "this is the whole file" from "this is as much as I asked for".
    const buffer = Buffer.alloc(maxBytes + 1);
    let filled = 0;
    while (filled < buffer.length) {
      const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, filled);
      if (bytesRead === 0) break;
      filled += bytesRead;
    }
    if (filled > maxBytes) return null;
    return buffer.subarray(0, filled).toString("utf-8");
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    // `ENXIO` is what `O_NONBLOCK` returns for a FIFO with no writer, in place
    // of blocking. Neither it nor a directory is a bounded regular file, and
    // `open` is simply where that shows up instead of `fstat`.
    if (code === "ENXIO" || code === "EISDIR") return null;
    throw error;
  } finally {
    await handle?.close();
  }
}

/**
 * One bounded read of a regular file: its bytes, and everything a replacement
 * has to put back.
 *
 * `mode`, `uid` and `gid` because an atomic replace writes a **new** inode;
 * `dev` and `ino` so the replacement can tell it is still about to replace the
 * file it read.
 */
export type PinnedFileRead = {
  content: Buffer;
  mode: number;
  uid: number;
  gid: number;
  dev: number;
  ino: number;
};

/**
 * The same read, returning the bytes.
 *
 * The restore copy writes back what it read, and decoding as UTF-8 first
 * replaces every invalid sequence with U+FFFD — irreversibly, since the sidecar
 * is removed straight after.
 *
 * `dev` / `ino` come off the same handle as the content, so a caller that
 * replaces the pathname afterwards can check that the entry it is about to
 * replace is still the inode it read.
 */
export async function readPinnedRegularFileBytes(
  filePath: string,
  maxBytes: number,
): Promise<PinnedFileRead | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, OPEN_READ_FLAGS);
    const pinned = await handle.stat();
    if (!pinned.isFile() || pinned.size > maxBytes) return null;
    const buffer = Buffer.alloc(maxBytes + 1);
    let filled = 0;
    while (filled < buffer.length) {
      const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, filled);
      if (bytesRead === 0) break;
      filled += bytesRead;
    }
    if (filled > maxBytes) return null;
    // The metadata comes from this `fstat`, not from a separate `stat` on the
    // pathname. Two operations could land on two inodes: content read from a
    // replacement that somebody made `0600` for a reason, restored under the
    // `0644` the old entry carried, and readable by everyone.
    return {
      content: Buffer.from(buffer.subarray(0, filled)),
      mode: pinned.mode & 0o7777,
      uid: pinned.uid,
      gid: pinned.gid,
      dev: pinned.dev,
      ino: pinned.ino,
    };
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    if (code === "ENXIO" || code === "EISDIR") return null;
    throw error;
  } finally {
    await handle?.close();
  }
}

/**
 * Read-only, non-blocking where the platform defines it.
 *
 * Opening a FIFO for reading blocks until a writer appears, and the point of a
 * size check is not to be at the mercy of what is at the path. Windows has no
 * `O_NONBLOCK`, and no FIFOs in this sense either.
 */
const OPEN_READ_FLAGS =
  typeof constants.O_NONBLOCK === "number"
    ? constants.O_RDONLY | constants.O_NONBLOCK
    : constants.O_RDONLY;

/** Message text for an unknown thrown value, without `[object Object]`. */
export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

export function isEpermOnWindows(err: unknown, platform = process.platform): boolean {
  return (
    platform === "win32" &&
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "EPERM"
  );
}

export async function safeLstat(target: string): Promise<Stats | undefined> {
  try {
    return await lstat(target);
  } catch {
    return undefined;
  }
}
