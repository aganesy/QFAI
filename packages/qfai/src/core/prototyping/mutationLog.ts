/**
 * iter-NN evidence-mutation audit log.
 *
 * Every destructive mutation under `.qfai/evidence/prototyping/iter-NN/*`
 * (delete / overwrite / move) appends a JSONL line to
 * `.qfai/evidence/prototyping/mutation-log.jsonl` shaped:
 *
 *   { ts, caller, path, action, priorSize, newSize }
 *
 * The log itself is git-ignored (see the shipped `.gitignore` template).
 * A code path that mutates iter-NN evidence without funneling through
 * this writer surfaces `R-EVIDENCE-MUTATION-UNLOGGED` (error) via the
 * SSOT-sync pair scan (see
 * `core/validators/evidenceMutationUnlogged.ts`, which carries the
 * `EVIDENCE_MUTATION_PAIRS` SSOT).
 *
 * The functions here are the ONLY supported entry point — call them
 * BEFORE the destructive fs call so the prior size is captured from
 * the live file, and AFTER for the new size on overwrites.
 */

import type { FileHandle } from "node:fs/promises";
import { appendFile, lstat, mkdir, open, readlink, rm, stat } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";

export const MUTATION_LOG_REL = ".qfai/evidence/prototyping/mutation-log.jsonl";

export type MutationAction = "move" | "overwrite" | "delete";

export type MutationLogEntry = {
  readonly caller: string;
  readonly path: string;
  readonly action: MutationAction;
  readonly priorSize: number;
  readonly newSize: number;
};

/**
 * Append one entry to the mutation log. Creates the parent directory
 * tree when absent. The entry timestamp (`ts`) is added at write time
 * (ISO-8601 UTC).
 */
export async function appendMutationLogEntry(root: string, entry: MutationLogEntry): Promise<void> {
  const logAbs = path.join(root, MUTATION_LOG_REL);
  await mkdir(path.dirname(logAbs), { recursive: true });
  const ts = new Date().toISOString();
  const line = JSON.stringify({
    ts,
    caller: entry.caller,
    path: entry.path,
    action: entry.action,
    priorSize: entry.priorSize,
    newSize: entry.newSize,
  });
  await appendFile(logAbs, `${line}\n`, "utf-8");
}

/**
 * Record a `move` mutation. `priorSize` is the size of the source
 * before the rename; `newSize` is implicitly 0 (the source is gone).
 */
export async function logEvidenceMove(
  root: string,
  caller: string,
  relPath: string,
  priorSize: number,
): Promise<void> {
  await appendMutationLogEntry(root, {
    caller,
    path: relPath,
    action: "move",
    priorSize,
    newSize: 0,
  });
}

/**
 * Record several `move` mutations in one append. An append can write part of
 * its data before it fails, for example when the disk fills, so a failed one
 * cuts the log back to the length it had: the log then holds none of these
 * entries, rather than the first few or a line cut short.
 */
export async function logEvidenceMoves(
  root: string,
  caller: string,
  moves: readonly { readonly path: string; readonly priorSize: number }[],
): Promise<LoggedMoves | null> {
  if (moves.length === 0) return null;
  const logAbs = path.join(root, MUTATION_LOG_REL);
  await mkdir(path.dirname(logAbs), { recursive: true });
  const ts = new Date().toISOString();
  const lines = moves.map((move) =>
    JSON.stringify({
      ts,
      caller,
      path: move.path,
      action: "move",
      priorSize: move.priorSize,
      newSize: 0,
    }),
  );
  const prior = await priorLogState(logAbs);
  const payload = `${lines.join("\n")}\n`;
  try {
    await appendFile(logAbs, payload, "utf-8");
  } catch (cause) {
    if (prior === null) throw cause;
    // Only what this write put there is taken back. Another run appending a
    // valid entry between the two reads leaves bytes this one did not write,
    // and cutting to the prior length would delete that entry with this batch.
    const restored =
      prior.kind === "created"
        ? // Emptied through the descriptor that read it, then taken away while
          // it is still empty, so a failed first write leaves no log behind.
          (await cutBackToThisWrite(prior.file, 0, payload)) && (await removeIfEmpty(prior.file))
        : await cutBackToThisWrite(logAbs, prior.length, payload);
    if (restored) throw cause;
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `${reason}; the log could not be cut back to its prior length and may hold part of this write`,
      { cause },
    );
  }
  return { prior, payload };
}

/**
 * What one batch of `move` entries wrote, enough to take it back.
 *
 * A reset logs its moves and then goes on: a later step failing puts the moves
 * back, and entries claiming moves that no longer stand would outlive them.
 */
export type LoggedMoves = { readonly prior: PriorLog | null; readonly payload: string };

/**
 * Take back the entries {@link logEvidenceMoves} wrote, while they are still
 * the last thing in the log.
 *
 * Answers `false` where anything else has been appended since, which is another
 * run's record and not this one's to remove. The caller reports what it could
 * not take back rather than deleting somebody else's line.
 */
export async function revertLoggedMoves(root: string, logged: LoggedMoves): Promise<boolean> {
  const logAbs = path.join(root, MUTATION_LOG_REL);
  const { prior, payload } = logged;
  // Nothing this call could cut back to: the path took no append that left a
  // prior length, so there is no state to restore and no claim to take back.
  if (prior === null) return false;
  if (prior.kind === "created") {
    return (await cutBackToThisWrite(prior.file, 0, payload)) && (await removeIfEmpty(prior.file));
  }
  return await cutBackToThisWrite(logAbs, prior.length, payload);
}

/**
 * Remove `file` while it holds nothing; `true` when it is gone or was never
 * there.
 *
 * SIMPLIFIED: the size is read and the file removed as two operations on the
 * path, so a record appended between them goes with it. The window is a `stat`
 * and an `rm` on a file this call had just emptied.
 * Lift when: the writers take a lock around the append, which would let this
 * hold it rather than reading under none.
 */
async function removeIfEmpty(file: string): Promise<boolean> {
  const empty = await stat(file).then(
    (stats) => stats.size === 0,
    () => false,
  );
  if (!empty) return false;
  return await rm(file, { force: true }).then(
    () => true,
    () => false,
  );
}

/**
 * What an append to the log would do to what is already there, and `null` where
 * a failed append leaves nothing to undo.
 *
 * `created` names the file the append brings into existence, which is not always
 * the log's own path: a link whose target is gone is an entry this call did not
 * make, and the append creates the target behind it. Removing the link there
 * destroys an entry that was already present, and removing nothing leaves a
 * part-written file behind it.
 */
type PriorLog =
  | { readonly kind: "created"; readonly file: string }
  | { readonly kind: "extended"; readonly length: number };

async function priorLogState(logAbs: string): Promise<PriorLog | null> {
  const resolved = await stat(logAbs).then(
    (stats) => stats,
    (cause: unknown) => {
      if (isEnoent(cause)) return null;
      throw cause;
    },
  );
  // A non-regular target takes the append and keeps none of it: a link to the
  // null device answers every write and holds no record, so a caller told the
  // write succeeded would treat unrecorded moves as logged. Refused here rather
  // than after the append, which is the only point at which refusing still
  // leaves the caller able to put the moves back.
  if (resolved !== null) {
    if (!resolved.isFile()) {
      throw new Error(`${logAbs} is not a regular file, so it keeps no mutation record`);
    }
    return { kind: "extended", length: resolved.size };
  }
  const created = await firstAbsentInChain(logAbs);
  return created === null ? null : { kind: "created", file: created };
}

/** How many links a chain may hold before this stops following it. */
const LINK_HOPS = 32;

/**
 * The first path in a link chain that holds nothing, which is the file an
 * append through the chain creates.
 *
 * Followed one hop only, a chain of two links named the intermediate link as
 * the created file: the recovery then removed a link that was already there and
 * left the file the write had made. A chain longer than {@link LINK_HOPS}, or a
 * link this cannot read, answers `null` — nothing is removed on a tree this
 * run cannot follow.
 */
async function firstAbsentInChain(from: string): Promise<string | null> {
  let current = from;
  for (let hop = 0; hop < LINK_HOPS; hop += 1) {
    const entry = await lstat(current).then(
      (stats) => stats,
      (cause: unknown) => {
        if (isEnoent(cause)) return null;
        throw cause;
      },
    );
    if (entry === null) return current;
    if (!entry.isSymbolicLink()) return null;
    const target = await readlink(current).then(
      (value) => value,
      () => null,
    );
    if (target === null) return null;
    current = path.resolve(path.dirname(current), target);
  }
  // The budget bounds the links followed, and the entry after the last of them
  // is still the one an append would create. Returning null there left a failed
  // first write with no file to take away.
  return await lstat(current).then(
    () => null,
    (cause: unknown) => {
      if (isEnoent(cause)) return current;
      throw cause;
    },
  );
}

/** Whether the bytes from `from` on, read through `handle`, are this write's own. */
async function tailIsThisWrite(
  handle: FileHandle,
  from: number,
  payload: string,
): Promise<boolean> {
  // A file shorter than `from` is not this write's to cut: another recovery has
  // replaced or truncated it. Read as an empty tail the prefix test passed, and
  // truncating to `from` then extended that file with zero bytes.
  const { size } = await handle.stat();
  if (size < from) return false;
  const expected = Buffer.from(payload, "utf-8");
  const buffer = Buffer.alloc(expected.length + 1);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, from);
  return (
    bytesRead <= expected.length &&
    expected.subarray(0, bytesRead).equals(buffer.subarray(0, bytesRead))
  );
}

/**
 * Cut the log back to `from`, and only while what stands past it is this write's
 * own.
 *
 * The read and the cut go through one descriptor, so nothing reopens the path
 * between them.
 *
 * SIMPLIFIED: an append landing between the read and the cut is still cut away.
 * The two calls are consecutive, where the gap this replaced spanned the whole
 * failed write.
 * Lift when: the writers take a lock around the append, which would let the
 * recovery hold it rather than re-reading under one.
 */
async function cutBackToThisWrite(file: string, from: number, payload: string): Promise<boolean> {
  const handle = await open(file, "r+").catch(() => null);
  if (handle === null) return false;
  try {
    if (!(await tailIsThisWrite(handle, from, payload))) return false;
    await handle.truncate(from);
    return true;
  } catch {
    return false;
  } finally {
    await handle.close().catch(() => undefined);
  }
}

/**
 * Record an `overwrite` mutation. Both sizes must be supplied by the
 * caller (read before / after the write so the log is honest about
 * the byte delta).
 */
export async function logEvidenceOverwrite(
  root: string,
  caller: string,
  relPath: string,
  priorSize: number,
  newSize: number,
): Promise<void> {
  await appendMutationLogEntry(root, {
    caller,
    path: relPath,
    action: "overwrite",
    priorSize,
    newSize,
  });
}

/**
 * Record a `delete` mutation. `newSize` is implicitly 0.
 */
export async function logEvidenceDelete(
  root: string,
  caller: string,
  relPath: string,
  priorSize: number,
): Promise<void> {
  await appendMutationLogEntry(root, {
    caller,
    path: relPath,
    action: "delete",
    priorSize,
    newSize: 0,
  });
}
