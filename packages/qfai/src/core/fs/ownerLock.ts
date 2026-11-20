/**
 * A lock held by one process at a time: a file created exclusively that records its owner, and
 * removed by that owner when its work is done. A second process that finds the file is refused,
 * not made to wait; whether the lock belongs to a running owner decides what it is told.
 */
import { randomUUID } from "node:crypto";
import { lstat, open, unlink } from "node:fs/promises";

import { readPinnedRegularFileBytes } from "../init/fsGuards.js";
import { hasErrnoCode, isEnoent } from "./errno.js";

const LOCK_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type OwnerLockOptions = {
  /** The `kind` the owner record carries, so one lock's record is never taken for another's. */
  kind: string;
  /** The largest lock file read back. */
  maxBytes: number;
  /** The error for a lock file that is not one plain file of at most `maxBytes`. */
  invalid: () => Error;
  /**
   * The error for a lock another process holds: `active` when its owner is running or still
   * writing its record, so the caller retries, and otherwise one left for manual recovery.
   */
  refused: (active: boolean, cause: unknown) => Error;
  /** The error for a lock whose record is no longer this process's when it is released. */
  changed: () => Error;
};

/**
 * Runs `action` while this process holds the lock at `file`. Throws the `refused` error when the
 * lock is held already; the lock file is then left as it was.
 */
export async function withOwnerLock<T>(
  file: string,
  options: OwnerLockOptions,
  action: () => Promise<T>,
): Promise<T> {
  const owner = {
    kind: options.kind,
    pid: process.pid,
    createdAt: Date.now(),
    token: randomUUID(),
  };
  try {
    await writeLockFile(file, owner, options);
  } catch (cause: unknown) {
    if (!hasErrnoCode(cause) || cause.code !== "EEXIST") throw cause;
    throw options.refused(await lockIsActive(file, options), cause);
  }
  try {
    return await action();
  } finally {
    await releaseLock(file, JSON.stringify(owner), options);
  }
}

/** Reads a lock file, or undefined when it is not there; one that is not one plain file throws. */
export async function readLockFile(
  file: string,
  options: Pick<OwnerLockOptions, "maxBytes" | "invalid">,
): Promise<string | undefined> {
  try {
    const before = await lstat(file);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) throw options.invalid();
    const pinned = await readPinnedRegularFileBytes(file, options.maxBytes);
    const after = await lstat(file);
    if (
      !pinned ||
      before.dev !== pinned.dev ||
      before.ino !== pinned.ino ||
      after.dev !== pinned.dev ||
      after.ino !== pinned.ino ||
      !after.isFile() ||
      after.isSymbolicLink() ||
      after.nlink !== 1
    )
      throw options.invalid();
    return pinned.content.toString("utf8");
  } catch (cause: unknown) {
    if (isEnoent(cause)) return undefined;
    throw cause;
  }
}

/** Creates a lock file exclusively and writes `value` to it; one already there throws EEXIST. */
export async function writeLockFile(
  file: string,
  value: unknown,
  options: Pick<OwnerLockOptions, "maxBytes" | "invalid">,
): Promise<void> {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > options.maxBytes) throw options.invalid();
  const handle = await open(file, "wx", 0o600);
  try {
    await handle.writeFile(text, "utf8");
  } finally {
    await handle.close();
  }
}

/**
 * How long a lock without a complete owner record counts as still being written. The exclusive
 * create publishes an empty file before its owner record lands, a gap of one write; the ceiling
 * leaves room for slow disks and coarse modification times. After it, an incomplete record is
 * abandoned and kept for manual recovery.
 */
const INITIALIZING_LOCK_MS = 10_000;

/**
 * Whether the existing lock belongs to a live operation, so the caller retries rather than
 * recovering it by hand: its owner is running, its owner record is still being written, or it
 * was released after the exclusive create saw it.
 */
async function lockIsActive(file: string, options: OwnerLockOptions): Promise<boolean> {
  const text = await readLockFile(file, options);
  if (text === undefined) return true;
  let existing: unknown;
  try {
    existing = JSON.parse(text);
  } catch {
    return lockIsInitializing(file);
  }
  const pid = ownerPid(existing, options.kind);
  // Complete but invalid metadata is retained for manual recovery.
  if (pid === undefined) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (liveness: unknown) {
    return !hasErrnoCode(liveness) || liveness.code !== "ESRCH";
  }
}

async function lockIsInitializing(file: string): Promise<boolean> {
  try {
    const { mtimeMs } = await lstat(file);
    return Date.now() - mtimeMs < INITIALIZING_LOCK_MS;
  } catch (cause: unknown) {
    if (isEnoent(cause)) return true;
    throw cause;
  }
}

function ownerPid(existing: unknown, kind: string): number | undefined {
  if (typeof existing !== "object" || existing === null || Array.isArray(existing))
    return undefined;
  const value: Record<string, unknown> = { ...existing };
  if (
    Object.keys(value).length !== 4 ||
    value.kind !== kind ||
    typeof value.pid !== "number" ||
    !Number.isSafeInteger(value.pid) ||
    value.pid <= 0 ||
    typeof value.createdAt !== "number" ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0 ||
    typeof value.token !== "string" ||
    !LOCK_TOKEN.test(value.token)
  )
    return undefined;
  return value.pid;
}

async function releaseLock(file: string, owner: string, options: OwnerLockOptions): Promise<void> {
  const text = await readLockFile(file, options);
  if (text !== owner) throw options.changed();
  await unlink(file);
}
