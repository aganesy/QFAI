import { createHash } from "node:crypto";
import type { FileHandle } from "node:fs/promises";
import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
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
 * `LOCK_STALE_MS` bounds how long a lock left behind by a killed
 * process can block other runs.
 */
const LOCK_STALE_MS = 10_000;
const LOCK_RETRY_MS = 10;
const LOCK_TIMEOUT_MS = 5_000;

function stateAbsPath(root: string): string {
  return path.join(root, STATE_REL);
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
 * Windows paths are case-insensitive, so the key is lowercased there —
 * otherwise `C:\repo` and `c:\repo` would take two different locks.
 */
function stateLockPath(root: string): string {
  const resolved = path.resolve(root);
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Remove a lock whose holder is gone (mtime older than the stale window). */
async function reapStaleLock(lockPath: string): Promise<void> {
  try {
    const info = await stat(lockPath);
    if (Date.now() - info.mtimeMs < LOCK_STALE_MS) return;
    await rm(lockPath, { force: true });
  } catch {
    // The lock vanished or is unreadable — the next acquire attempt decides.
  }
}

/**
 * Take the exclusive state lock, or give up and return `null`.
 *
 * `null` means "proceed unlocked": a lock we cannot take must never
 * turn a counter update into a thrown error, since the callers are a
 * best-effort validator and a CLI pointer write. Degrading to the old
 * lock-free behaviour after a bounded wait is strictly better than
 * failing the run.
 */
async function acquireStateLock(lockPath: string): Promise<FileHandle | null> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      return await open(lockPath, "wx");
    } catch (error) {
      if (errorCode(error) !== "EEXIST") return null;
      await reapStaleLock(lockPath);
      if (Date.now() >= deadline) return null;
      await delay(LOCK_RETRY_MS);
    }
  }
}

async function releaseStateLock(lockPath: string, handle: FileHandle): Promise<void> {
  try {
    await handle.close();
  } catch {
    // Already closed; the unlink below is what matters.
  }
  try {
    await rm(lockPath, { force: true });
  } catch {
    // Best effort — a leftover lock is reaped as stale by the next writer.
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
 * `mutate` is synchronous on purpose, to keep the critical section to
 * the two filesystem calls this function makes itself. A malformed
 * existing file is treated as empty, matching the read helpers.
 */
export async function updateState<T>(
  root: string,
  mutate: (current: Record<string, unknown>) => StateMutation<T>,
): Promise<T> {
  const lockPath = stateLockPath(root);
  const handle = await acquireStateLock(lockPath);
  try {
    const current = (await readStateObject(root)) ?? {};
    const { next, result } = mutate(current);
    if (next !== null) {
      await writeStateObject(root, next);
    }
    return result;
  } finally {
    if (handle !== null) {
      await releaseStateLock(lockPath, handle);
    }
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
