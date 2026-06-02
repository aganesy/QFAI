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

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

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
