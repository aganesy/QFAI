import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { hasErrnoCode } from "../fs/errno.js";
import { graphEnvironmentKey } from "./layout.js";
import {
  graphStateDirectory,
  GraphLocalStateError,
  GRAPH_UUID,
  readGraphLocalFile,
  writeGraphLocalFile,
} from "./localFiles.js";

export async function withGraphLock<T>(
  root: string,
  kind: "analysis" | "state",
  action: () => Promise<T>,
): Promise<T> {
  const directory = await graphStateDirectory(root);
  const file = path.join(directory, `${kind}.lock`);
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
    const text = await readGraphLocalFile(file);
    let active = false;
    try {
      const existing: unknown = text === undefined ? undefined : JSON.parse(text);
      if (typeof existing !== "object" || existing === null || Array.isArray(existing))
        throw new Error("Invalid graph lock metadata.", { cause });
      const value = existing as Record<string, unknown>;
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
        throw new Error("Invalid graph lock metadata.", { cause });
      try {
        process.kill(value.pid, 0);
        active = true;
      } catch (liveness: unknown) {
        if (!hasErrnoCode(liveness) || liveness.code !== "ESRCH") active = true;
      }
    } catch {
      // Invalid metadata is retained for manual recovery.
    }
    throw new GraphLocalStateError(
      `Project graph ${kind} lock ${active ? "is contended" : "requires manual recovery"}.`,
      active
        ? `Retry after the active worktree ${kind} operation finishes; retain its lock.`
        : `Retain and inspect .qfai/tools/state/${graphEnvironmentKey()}/${kind}.lock; remove only a confirmed abandoned worktree lock before retrying.`,
      { cause },
    );
  }
  try {
    return await action();
  } finally {
    await releaseGraphLock(file, JSON.stringify(owner));
  }
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
