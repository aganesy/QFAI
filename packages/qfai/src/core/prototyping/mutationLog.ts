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

import { appendFile, lstat, mkdir, readlink, rm, stat, truncate } from "node:fs/promises";
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
): Promise<void> {
  if (moves.length === 0) return;
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
  try {
    await appendFile(logAbs, `${lines.join("\n")}\n`, "utf-8");
  } catch (cause) {
    if (prior === null) throw cause;
    const restored = await (
      prior.kind === "created" ? rm(prior.file, { force: true }) : truncate(logAbs, prior.length)
    ).then(
      () => true,
      () => false,
    );
    if (restored) throw cause;
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `${reason}; the log could not be cut back to its prior length and may hold part of this write`,
      { cause },
    );
  }
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
  // A directory or a device takes no append, so a failed one leaves nothing
  // this call could undo.
  if (resolved !== null) {
    return resolved.isFile() ? { kind: "extended", length: resolved.size } : null;
  }
  const link = await lstat(logAbs).then(
    (stats) => stats.isSymbolicLink(),
    () => false,
  );
  if (!link) return { kind: "created", file: logAbs };
  const target = await readlink(logAbs).then(
    (value) => value,
    () => null,
  );
  return target === null
    ? null
    : { kind: "created", file: path.resolve(path.dirname(logAbs), target) };
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
