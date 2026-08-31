import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "./fs/errno.js";

/**
 * `.qfai/state.json` is the single SSOT for ephemeral, per-runtime
 * session state (NOT committed configuration). It currently records
 * the active discussion session pointer under `discussion.currentId`
 * and the ATDD scaffold escalation counters under `atdd`.
 *
 * Read helpers tolerate a missing file / missing keys / malformed JSON
 * by returning `null` (no throw to the caller); the ones whose caller
 * must not confuse "never written" with "cannot be read" —
 * {@link readDiscussionCurrentIdState} — answer a discriminated union
 * instead. Write helpers create-or-merge without clobbering unrelated
 * top-level keys, and go through {@link updateState} so that two
 * concurrent CLI runs cannot lose each other's increments (see the lock
 * notes below).
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
 * Lock path for one project root: a sibling of the state file it guards.
 *
 * It used to live in the OS temp dir, keyed by a hash of the project's real
 * path, to keep an untracked `.qfai/state.json.lock` out of consumer repos.
 * That put the lock outside the repository's own permissions: on a machine
 * where several Unix users share a checkout, the first writer's lock is created
 * under that user's uid in a sticky `/tmp`, and no other user can unlink it —
 * so a crash there wedged every later update for everybody, whatever the age or
 * the owner's liveness. Beside `state.json` the lock inherits exactly the
 * permissions that already decide who may write the state, which is the set of
 * people who must be able to reap it. `QFAI_GITIGNORE_BLOCK` carries the
 * matching ignore line.
 *
 * A sibling also needs no key: two aliases of one project resolve to the same
 * file through the filesystem itself, where a hash of the pathname needed
 * `realpath` to notice they were the same project.
 */
function stateLockPath(root: string): string {
  return `${stateAbsPath(root)}.lock`;
}

/**
 * Path of the short-lived lock that serializes **reapers**.
 *
 * Reaping is read-then-unlink, and the two cannot be made one operation: Node
 * has no "unlink only this inode". Two waiters reaping the same stale lock
 * could therefore both pass the identity check, the first delete it and take a
 * fresh one, and the second delete *that* one. Taking this lock first makes at
 * most one process a reaper at a time, so between one reaper's check and its
 * unlink no other reaper can slip a new lock onto the path.
 */
function reapLockPath(lockPath: string): string {
  return `${lockPath}.reap`;
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
  // One reaper at a time. Without this, two waiters could both clear the same
  // identity check, the first unlink and take a fresh lock, and the second
  // unlink that one — see {@link reapLockPath}. Losing the race is not a
  // failure: the caller retries, and by then the winner has finished.
  let reaper: FileHandle;
  try {
    reaper = await open(reapLockPath(lockPath), "wx");
  } catch {
    return;
  }
  try {
    const before = await readLockSnapshot(lockPath);
    if (before === null) return;
    const ownerAlive = before.owner !== null && isProcessAlive(before.owner.pid);
    if (before.owner === null || ownerAlive) {
      const age = Date.now() - before.mtimeMs;
      if (age < LOCK_STALE_MS) return;
      if (age < LOCK_ABANDON_MS && ownerAlive) return;
    }
    await removeLockIfUnchanged(lockPath, before);
  } finally {
    await reaper.close().catch(() => undefined);
    await rm(reapLockPath(lockPath), { force: true }).catch(() => undefined);
  }
}

/**
 * Whether `lockPath` still names the file this holder created.
 *
 * The `LOCK_ABANDON_MS` backstop can take a lock away from a holder that is
 * still alive — a recycled pid, or a critical section stalled past the
 * backstop — and pid liveness alone cannot tell those apart from a genuinely
 * abandoned lock. Prevention is therefore not enough on its own: the holder
 * checks, immediately before it writes, that the lock it took is still on the
 * path. A holder whose lock was reaped writes nothing and reports it, so the
 * worst a wrong reap can do is fail one update — never let two writers into
 * the critical section and lose an increment, which is what this module exists
 * to prevent.
 */
async function lockStillOurs(lockPath: string, lock: StateLock): Promise<boolean> {
  const owner = await readLockOwner(lockPath);
  return owner !== null && owner.token === lock.owner.token;
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
  // The lock is a sibling of `state.json`, so on a project whose first write
  // this is, `.qfai/` does not exist yet — `writeStateObject` creates it, but
  // the lock has to be taken before that runs.
  await mkdir(path.dirname(lockPath), { recursive: true });
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
 * Outcome of reading `.qfai/state.json`.
 *
 * `"missing"` (no file) and `"corrupt"` (unreadable, not JSON, not a JSON
 * object) are deliberately NOT the same case. A missing state file is the
 * ordinary state of a project that never ran `qfai discussion use`; a corrupt
 * one is broken runtime state that only a repair can clear. Collapsing the two
 * lets a consumer treat "nothing was ever pinned" and "the pin cannot be read"
 * identically and silently substitute an inferred answer.
 */
type StateFileRead =
  | { kind: "missing" }
  | { kind: "corrupt"; detail: string }
  | { kind: "ok"; state: Record<string, unknown> };

/**
 * Load `.qfai/state.json`, discriminating absence from corruption. Each caller
 * re-narrows the fields it reads (so we avoid a bare `as` cast on a typed
 * shape).
 */
async function readStateFile(root: string): Promise<StateFileRead> {
  let raw: string;
  try {
    raw = await readFile(stateAbsPath(root), "utf-8");
  } catch (error) {
    if (isEnoent(error)) return { kind: "missing" };
    return {
      kind: "corrupt",
      detail: `${STATE_REL} could not be read (${error instanceof Error ? error.message : String(error)})`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      kind: "corrupt",
      detail: `${STATE_REL} is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
    };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "corrupt", detail: `${STATE_REL} is not a JSON object` };
  }
  // `Record<string, unknown>` is the structural supertype of any parsed
  // JSON object; callers narrow each field they read.
  return { kind: "ok", state: parsed as Record<string, unknown> };
}

/**
 * Load `.qfai/state.json` as a parsed object, or `null` when the file
 * is missing / unreadable / not a JSON object. Each caller re-narrows
 * the fields it reads.
 *
 * The lossy face of {@link readStateFile}, for the callers — the lock's
 * read-modify-write among them — that treat every unusable state as an
 * empty document.
 */
export async function readStateObject(root: string): Promise<Record<string, unknown> | null> {
  const read = await readStateFile(root);
  return read.kind === "ok" ? read.state : null;
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
  const lockPath = stateLockPath(root);
  const lock = await acquireStateLock(lockPath);
  try {
    const current = (await readStateObject(root)) ?? {};
    const { next, result } = mutate(current);
    if (next !== null) {
      // Re-checked here rather than trusted from the acquire: see
      // {@link lockStillOurs}. Nothing is written without it.
      if (!(await lockStillOurs(lockPath, lock))) {
        throw new Error(
          `qfai: state lock ${lockPath} was taken over while this update ran; ` +
            "refusing to write .qfai/state.json from a stale snapshot.",
        );
      }
      await writeStateObject(root, next);
    }
    return result;
  } finally {
    await releaseStateLock(lockPath, lock);
  }
}

/**
 * Outcome of reading `discussion.currentId`.
 *
 * `"unset"` means the pointer was never written (no state file, no
 * `discussion` block, no `currentId` key) — the ordinary state of a project
 * that never ran `qfai discussion use`. `"corrupt"` means the pointer cannot
 * be read because the surrounding state is broken (invalid JSON, a
 * non-object document, a non-object `discussion`, a non-string or blank
 * `currentId`).
 *
 * Consumers that pick a *fallback* when no pointer is available must branch on
 * this: inferring "latest pack" from a corrupt file substitutes a pack nobody
 * selected, which is how a stale/broken pointer silently drops a gate.
 */
export type DiscussionCurrentIdRead =
  | { kind: "set"; currentId: string }
  | { kind: "unset" }
  | { kind: "corrupt"; detail: string };

/**
 * Read `discussion.currentId` from `.qfai/state.json`, discriminating
 * "never pinned" from "pinned but unreadable". Never throws.
 */
export async function readDiscussionCurrentIdState(root: string): Promise<DiscussionCurrentIdRead> {
  const read = await readStateFile(root);
  if (read.kind === "missing") return { kind: "unset" };
  if (read.kind === "corrupt") return { kind: "corrupt", detail: read.detail };

  const discussion: unknown = read.state.discussion;
  if (discussion === undefined) return { kind: "unset" };
  if (!isRecord(discussion)) {
    return {
      kind: "corrupt",
      detail: `${STATE_REL}#discussion must be an object (got ${describeJsonValue(discussion)})`,
    };
  }
  const currentIdField: unknown = discussion.currentId;
  if (currentIdField === undefined) return { kind: "unset" };
  if (typeof currentIdField !== "string") {
    return {
      kind: "corrupt",
      detail: `${STATE_REL}#discussion.currentId must be a string (got ${describeJsonValue(currentIdField)})`,
    };
  }
  if (currentIdField.trim().length === 0) {
    return {
      kind: "corrupt",
      detail: `${STATE_REL}#discussion.currentId is blank`,
    };
  }
  return { kind: "set", currentId: currentIdField };
}

function describeJsonValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

/**
 * Read `discussion.currentId` from `.qfai/state.json`. Returns `null`
 * when the file, the `discussion` object, or the `currentId` string is
 * absent / not a non-empty string.
 *
 * Callers that must distinguish an unset pointer from a corrupt state file
 * (because they fall back to an inferred pack when none is set) should use
 * {@link readDiscussionCurrentIdState} instead.
 */
export async function readDiscussionCurrentId(root: string): Promise<string | null> {
  const read = await readDiscussionCurrentIdState(root);
  return read.kind === "set" ? read.currentId : null;
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
