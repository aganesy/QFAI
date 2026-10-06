import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { access, lstat, open, readFile, stat } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";

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

async function safeStat(target: string): Promise<Stats | undefined> {
  try {
    return await stat(target);
  } catch {
    return undefined;
  }
}

/**
 * A path component init must not write through, relative to the project, and
 * whether it is a symlink (a junction included) or not a directory.
 */
export type UnsafeComponent = { readonly relativePath: string; readonly symlink: boolean };

/**
 * The first component of `relativeDir` under `destRoot` that must not be
 * written through, or `undefined` when the whole chain is safe.
 *
 * `.codex/agents` is a path an untrusted repository controls, and a directory
 * component of it can be a symlink out of the tree — a checked-in
 * `.codex/agents -> /home/user/.config` is enough. `mkdir` follows it,
 * `writeFile` follows it, and `removeSymlinkAt` cannot see it: that guard
 * looks at the leaf `<name>.toml` only. A plain `qfai init` would then write
 * every profile into that external directory, and `--force` would let it
 * delete the orphan profiles there. So every component is `lstat`-ed before
 * anything is written or removed, and one link anywhere in the chain skips the
 * step whole rather than writing part of it somewhere unexpected.
 *
 * A component that does not exist yet ends the walk: `mkdir` creates real
 * directories, and nothing below an absent parent can exist either.
 *
 * The answer names the component by its path relative to `destRoot`. An
 * absolute path carries the destination directory's own name, which on an
 * untrusted repository can hold a newline or an ANSI escape.
 */
export async function findUnsafeWrapperComponent(
  destRoot: string,
  relativeDir: string,
): Promise<UnsafeComponent | undefined> {
  const segments = relativeDir.split("/");
  for (let depth = 1; depth <= segments.length; depth += 1) {
    const relativePath = segments.slice(0, depth).join("/");
    const stats = await safeLstat(path.join(destRoot, ...segments.slice(0, depth)));
    if (stats === undefined) {
      return undefined;
    }
    if (stats.isSymbolicLink()) {
      return { relativePath, symlink: true };
    }
    if (!stats.isDirectory()) {
      return { relativePath, symlink: false };
    }
  }
  return undefined;
}

/**
 * The first component of `relativeDir` under `destRoot` that `mkdir` cannot
 * pass: a symbolic link whose target is missing or is not a directory, or an
 * entry that is not a directory. A link to a directory that exists is passed,
 * because the instruction files are written through a shared directory on
 * purpose. `undefined` when the directory can be created or already exists.
 */
export async function findUnreachableHostDirComponent(
  destRoot: string,
  relativeDir: string,
): Promise<UnsafeComponent | undefined> {
  const segments = relativeDir.split("/");
  for (let depth = 1; depth <= segments.length; depth += 1) {
    const relativePath = segments.slice(0, depth).join("/");
    const absolute = path.join(destRoot, ...segments.slice(0, depth));
    const stats = await safeLstat(absolute);
    if (stats === undefined) {
      return undefined;
    }
    if (stats.isSymbolicLink()) {
      if ((await safeStat(absolute))?.isDirectory() !== true) {
        return { relativePath, symlink: true };
      }
    } else if (!stats.isDirectory()) {
      return { relativePath, symlink: false };
    }
  }
  return undefined;
}

/**
 * The component that keeps a file init writes into a host directory, such as
 * a hook file or `.github/copilot-instructions.md`, from being read or
 * written: a directory on its path that is a symbolic link or not a directory,
 * or the file itself when it is a symbolic link, whether its target exists or
 * not. `undefined` when the path is safe.
 */
export async function findUnsafeHostFileComponent(
  destRoot: string,
  segments: readonly string[],
): Promise<UnsafeComponent | undefined> {
  const parent = segments.slice(0, -1).join("/");
  const unsafeParent =
    parent === "" ? undefined : await findUnsafeWrapperComponent(destRoot, parent);
  if (unsafeParent !== undefined) {
    return unsafeParent;
  }
  const leaf = await safeLstat(path.join(destRoot, ...segments));
  return leaf?.isSymbolicLink() === true
    ? { relativePath: segments.join("/"), symlink: true }
    : undefined;
}
