import { randomUUID } from "node:crypto";
import { lstat, unlink } from "node:fs/promises";
import path from "node:path";
import { hasErrnoCode, isEnoent } from "../fs/errno.js";
import { graphEnvironmentKey } from "./layout.js";
import {
  graphStateDirectory,
  GraphLocalStateError,
  GRAPH_UUID,
  readGraphLocalFile,
  writeGraphLocalFile,
} from "./localFiles.js";

export async function withGraphLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const directory = await graphStateDirectory(root);
  const file = path.join(directory, "analysis.lock");
  const owner = {
    kind: "graph-lock",
    pid: process.pid,
    createdAt: Date.now(),
    token: randomUUID(),
  };
  try {
    await writeGraphLocalFile(file, owner);
  } catch (cause: unknown) {
    if (!hasErrnoCode(cause) || cause.code !== "EEXIST") throw cause;
    const active = await lockIsActive(file);
    throw new GraphLocalStateError(
      `Project graph analysis lock ${active ? "is contended" : "requires manual recovery"}.`,
      active
        ? "Retry after the active worktree graph operation (a graph query, analysis preparation or qfai init) finishes; retain its lock."
        : `Retain and inspect .qfai/tools/state/${graphEnvironmentKey()}/analysis.lock; remove only a confirmed abandoned worktree lock before retrying.`,
      { cause },
    );
  }
  try {
    return await action();
  } finally {
    await releaseGraphLock(file, JSON.stringify(owner));
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
async function lockIsActive(file: string): Promise<boolean> {
  const text = await readGraphLocalFile(file);
  if (text === undefined) return true;
  let existing: unknown;
  try {
    existing = JSON.parse(text);
  } catch {
    return lockIsInitializing(file);
  }
  const pid = ownerPid(existing);
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

function ownerPid(existing: unknown): number | undefined {
  if (typeof existing !== "object" || existing === null || Array.isArray(existing))
    return undefined;
  const value: Record<string, unknown> = { ...existing };
  if (
    Object.keys(value).length !== 4 ||
    value.kind !== "graph-lock" ||
    typeof value.pid !== "number" ||
    !Number.isSafeInteger(value.pid) ||
    value.pid <= 0 ||
    typeof value.createdAt !== "number" ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0 ||
    typeof value.token !== "string" ||
    !GRAPH_UUID.test(value.token)
  )
    return undefined;
  return value.pid;
}

async function releaseGraphLock(file: string, owner: string): Promise<void> {
  const text = await readGraphLocalFile(file);
  if (text !== owner)
    throw new GraphLocalStateError(
      "Project graph lock ownership changed.",
      "Retain the lock and repair the worktree graph state before retrying.",
    );
  await unlink(file);
}
