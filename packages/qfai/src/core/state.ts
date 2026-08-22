import { createHash, randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { mkdir, open, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * `.qfai/state.json` is the single SSOT for ephemeral, per-runtime
 * session state (NOT committed configuration). It currently records
 * the active discussion session pointer under `discussion.currentId`
 * and the ATDD scaffold escalation counters under `atdd`.
 *
 * Read helpers tolerate a missing file / missing keys / malformed JSON
 * by returning `null` (no throw to the caller). Write helpers
 * create-or-merge without clobbering unrelated top-level keys, and go
 * through {@link updateState} so that two concurrent CLI runs cannot
 * lose each other's increments (see the lock notes below).
 */
const STATE_REL = path.join(".qfai", "state.json");

/**
 * Advisory-lock tuning. The lock is held only across one
 * read-modify-write of a small JSON file, so the wait budget is short.
 * `LOCK_STALE_MS` is when a lock first becomes a reap *candidate*;
 * `LOCK_ABANDON_MS` is the backstop for a lock whose recorded owner
 * cannot be trusted (see {@link reapStaleLock}).
 */
const LOCK_STALE_MS = 10_000;
const LOCK_ABANDON_MS = 60_000;
const LOCK_RETRY_MS = 10;
const LOCK_TIMEOUT_MS = 5_000;

function stateAbsPath(root: string): string {
  return path.join(root, STATE_REL);
}

/**
 * Resolve `target` through symlinks, tolerating a path that does not
 * exist yet: the deepest existing ancestor is canonicalized and the
 * missing tail re-joined onto it.
 *
 * Keying the lock on raw `path.resolve` output is not enough — the same
 * project reached once by its real path and once through a symlink
 * would hash to two different lock names, and both writers would then
 * sit inside the critical section at the same time.
 */
async function realpathBestEffort(target: string): Promise<string> {
  const absolute = path.resolve(target);
  let current = absolute;
  const tail: string[] = [];
  for (;;) {
    try {
      return path.join(await realpath(current), ...tail);
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return absolute;
      tail.unshift(path.basename(current));
      current = parent;
    }
  }
}

/**
 * Lock path for one project root.
 *
 * It lives in the OS temp dir rather than next to `state.json`: the
 * QFAI-managed `.gitignore` block ignores `.qfai/state.json` by exact
 * name, so a sibling `.qfai/state.json.lock` would surface as an
 * untracked file in every consumer repo. Concurrency here is between
 * CLI runs on one machine, which a temp-dir lock covers.
 *
 * The key is the symlink-resolved real path so that every alias of one
 * project maps to one lock. Windows paths are case-insensitive, so the
 * key is lowercased there — otherwise `C:\repo` and `c:\repo` would
 * take two different locks.
 */
async function stateLockPath(root: string): Promise<string> {
  const resolved = await realpathBestEffort(root);
  const key = process.platform === "win32" ? resolved.toLowerCase() : resolved;
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 16);
  return path.join(os.tmpdir(), `qfai-state-${digest}.lock`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow an unknown throwable to its `errno` code without a cast. */
function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  const { code } = error;
  return typeof code === "string" ? code : null;
}

/** Render an unknown throwable for an error message, without a cast. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Identity stamped into the lock file so a holder can prove it owns it. */
interface LockOwner {
  readonly pid: number;
  readonly token: string;
}

/** A held state lock: the open handle plus the owner stamped on disk. */
interface StateLock {
  readonly handle: FileHandle;
  readonly owner: LockOwner;
}

/** Is `pid` still running on this machine? */
function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but belongs to another user.
    return errorCode(error) === "EPERM";
  }
}

/** Read the owner stamp, or `null` when it is absent / unparsable. */
async function readLockOwner(lockPath: string): Promise<LockOwner | null> {
  let raw: string;
  try {
    raw = await readFile(lockPath, "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const { pid, token } = parsed;
    if (typeof pid !== "number" || typeof token !== "string") return null;
    return { pid, token };
  } catch {
    return null;
  }
}

/**
 * What one lock file looked like at one instant: enough to judge it
 * AND to prove later that the file on that path is still that same
 * file. `ino`/`dev` are 0 on filesystems that do not report them
 * (notably some Windows volumes), so the owner token and the mtime
 * carry the identity check there.
 */
interface LockSnapshot {
  readonly mtimeMs: number;
  readonly ino: number;
  readonly dev: number;
  readonly owner: LockOwner | null;
}

/** Snapshot the lock file, or `null` when it is gone / unreadable. */
async function readLockSnapshot(lockPath: string): Promise<LockSnapshot | null> {
  let info: Stats;
  try {
    info = await stat(lockPath);
  } catch {
    return null;
  }
  return {
    mtimeMs: info.mtimeMs,
    ino: info.ino,
    dev: info.dev,
    owner: await readLockOwner(lockPath),
  };
}

/** Do two snapshots describe the same lock file, taken by the same holder? */
function isSameLock(before: LockSnapshot, after: LockSnapshot): boolean {
  if (before.ino !== 0 && after.ino !== 0) {
    if (before.ino !== after.ino || before.dev !== after.dev) return false;
  }
  if (before.mtimeMs !== after.mtimeMs) return false;
  return before.owner?.token === after.owner?.token;
}

/**
 * Unlink the lock only while it is still the file `before` describes.
 *
 * Deletion is by path, and between the decision to delete and the
 * `rm` another waiter can reap the same lock and take a fresh one on
 * that path. Removing it then would drop the NEW holder's lock while
 * that holder keeps writing through its unlinked handle — two
 * `updateState` calls inside the critical section at once, which is
 * the exact race this module exists to close. Re-reading the file and
 * requiring the same identity (inode/device when reported, mtime,
 * owner token) keeps a replaced lock alive; the loser simply waits
 * one more retry.
 */
async function removeLockIfUnchanged(lockPath: string, before: LockSnapshot): Promise<void> {
  const after = await readLockSnapshot(lockPath);
  if (after === null || !isSameLock(before, after)) return;
  try {
    await rm(lockPath, { force: true });
  } catch {
    // The lock vanished or is unreadable — the next acquire attempt decides.
  }
}

/**
 * Remove a lock whose holder is gone.
 *
 * An old mtime is not evidence of death: a holder stalled on slow I/O
 * or suspended by the scheduler keeps its mtime frozen while it is
 * still inside the critical section, and deleting that lock would admit
 * a second writer (and let the original holder unlink the newcomer's
 * lock on release). So an aged lock is only reaped once the pid stamped
 * inside it is no longer running. `LOCK_ABANDON_MS` is the backstop for
 * the cases where that pid check cannot be trusted — a recycled pid, or
 * a lock leaked by this very process.
 *
 * A lock whose stamped owner is provably dead is reaped IMMEDIATELY,
 * with no age gate: `LOCK_STALE_MS` is longer than `LOCK_TIMEOUT_MS`,
 * so gating the dead-owner case on age would make every run that
 * starts within the stale window after a holder crashed time out and
 * fail (`qfai atdd scaffold`, `qfai discussion use`) even though the
 * lock is known to be free. The age gate still governs the locks whose
 * owner cannot be read — a lock created microseconds ago but not yet
 * stamped must not be mistaken for an abandoned one.
 */
async function reapStaleLock(lockPath: string): Promise<void> {
  const before = await readLockSnapshot(lockPath);
  if (before === null) return;
  const ownerAlive = before.owner !== null && isProcessAlive(before.owner.pid);
  if (before.owner === null || ownerAlive) {
    const age = Date.now() - before.mtimeMs;
    if (age < LOCK_STALE_MS) return;
    if (age < LOCK_ABANDON_MS && ownerAlive) return;
  }
  await removeLockIfUnchanged(lockPath, before);
}

/**
 * Take the exclusive state lock, or throw.
 *
 * Giving up and proceeding unlocked would reopen the exact lost-update
 * race this module exists to close: the holder that outran our wait
 * budget resumes, writes back the snapshot it read before us, and our
 * increment disappears. Refusing to write is the safe failure —
 * `.qfai/state.json` is bookkeeping, and its callers either surface the
 * error (`qfai discussion use`, `qfai atdd scaffold`) or degrade to
 * "counter unavailable" (the scaffold-placeholder validator, which
 * already catches per-TC state failures).
 */
async function acquireStateLock(lockPath: string): Promise<StateLock> {
  const owner: LockOwner = { pid: process.pid, token: randomUUID() };
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    let handle: FileHandle | null = null;
    try {
      handle = await open(lockPath, "wx");
    } catch (error) {
      if (errorCode(error) !== "EEXIST") {
        throw new Error(`qfai: cannot create state lock ${lockPath}: ${describeError(error)}`);
      }
    }
    if (handle !== null) return stampLockOwner(lockPath, handle, owner);
    await reapStaleLock(lockPath);
    if (Date.now() >= deadline) {
      throw new Error(
        `qfai: state lock ${lockPath} is still held after ${LOCK_TIMEOUT_MS}ms; ` +
          "refusing to update .qfai/state.json without it.",
      );
    }
    await delay(LOCK_RETRY_MS);
  }
}

/** Stamp the owner into a freshly created lock file. */
async function stampLockOwner(
  lockPath: string,
  handle: FileHandle,
  owner: LockOwner,
): Promise<StateLock> {
  const lock: StateLock = { handle, owner };
  try {
    await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf-8");
  } catch (error) {
    await releaseStateLock(lockPath, lock);
    throw new Error(`qfai: cannot stamp state lock ${lockPath}: ${describeError(error)}`);
  }
  return lock;
}

async function releaseStateLock(lockPath: string, lock: StateLock): Promise<void> {
  try {
    await lock.handle.close();
  } catch {
    // Already closed; the unlink below is what matters.
  }
  try {
    const snapshot = await readLockSnapshot(lockPath);
    if (snapshot === null) return;
    if (snapshot.owner !== null && snapshot.owner.token !== lock.owner.token) {
      // Our lock was reaped as abandoned and the path re-taken by
      // someone else: removing it now would drop *their* lock, not ours.
      return;
    }
    // Same identity check as the reaper: the path can be re-taken
    // between the read above and the unlink below.
    await removeLockIfUnchanged(lockPath, snapshot);
  } catch {
    // Best effort — a leftover lock is reaped as abandoned by the next writer.
  }
}

/**
 * Load `.qfai/state.json` as a parsed object, or `null` when the file
 * is missing / unreadable / not a JSON object. Each caller re-narrows
 * the fields it reads.
 */
export async function readStateObject(root: string): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await readFile(stateAbsPath(root), "utf-8");
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeStateObject(root: string, state: Record<string, unknown>): Promise<void> {
  const abs = stateAbsPath(root);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

/** What one {@link updateState} mutation decided. */
export interface StateMutation<T> {
  /** The document to persist, or `null` to leave the file untouched. */
  readonly next: Record<string, unknown> | null;
  /** Value handed back to the caller of `updateState`. */
  readonly result: T;
}

/**
 * Serialized read-modify-write of `.qfai/state.json`.
 *
 * Every writer MUST go through this. Loading the whole document,
 * mutating it and writing it back is a lost-update race otherwise: two
 * runs read the same snapshot, both write, and the first increment
 * disappears. Holding the lock across the read as well as the write is
 * what closes that window — a compare-and-swap on the file contents
 * would leave one.
 *
 * Throws when the lock cannot be taken: no lock, no write. Callers on
 * a best-effort path must catch, as the scaffold-placeholder validator
 * already does.
 *
 * `mutate` is synchronous on purpose, to keep the critical section to
 * the two filesystem calls this function makes itself. A malformed
 * existing file is treated as empty, matching the read helpers.
 */
export async function updateState<T>(
  root: string,
  mutate: (current: Record<string, unknown>) => StateMutation<T>,
): Promise<T> {
  const lockPath = await stateLockPath(root);
  const lock = await acquireStateLock(lockPath);
  try {
    const current = (await readStateObject(root)) ?? {};
    const { next, result } = mutate(current);
    if (next !== null) {
      await writeStateObject(root, next);
    }
    return result;
  } finally {
    await releaseStateLock(lockPath, lock);
  }
}

/**
 * Read `discussion.currentId` from `.qfai/state.json`. Returns `null`
 * when the file, the `discussion` object, or the `currentId` string is
 * absent / not a non-empty string.
 */
export async function readDiscussionCurrentId(root: string): Promise<string | null> {
  const state = await readStateObject(root);
  if (state === null) return null;
  const discussion = state.discussion;
  if (!isRecord(discussion)) return null;
  const currentIdField = discussion.currentId;
  if (typeof currentIdField !== "string" || currentIdField.trim().length === 0) {
    return null;
  }
  return currentIdField;
}

/**
 * Set `discussion.currentId` in `.qfai/state.json`, creating the file
 * (and the `.qfai` directory) when absent and preserving unrelated
 * top-level keys. A malformed existing file is replaced rather than
 * failing the write.
 */
export async function writeDiscussionCurrentId(root: string, currentId: string): Promise<void> {
  await updateState(root, (existing) => {
    const discussionField = existing.discussion;
    const discussion = isRecord(discussionField) ? { ...discussionField } : {};
    discussion.currentId = currentId;
    return { next: { ...existing, discussion }, result: undefined };
  });
}
