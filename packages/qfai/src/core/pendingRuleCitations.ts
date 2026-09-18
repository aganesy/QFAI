/**
 * Citations a run could not write, kept for the run that can.
 *
 * `qfai init` cites a rule master in an entry point only in the run that
 * copied the master, because that run alone knows the file cannot have cited
 * it. When the rewrite is refused, the master is on disk and uncited, and the
 * next run's copy skips it, so no later run would offer the citation again.
 *
 * The record keeps that offer. It names, per entry point, the masters a refused
 * run could not cite, and a later run cites them once the file can be rewritten.
 * Only what a run recorded is retried: a bullet the project deleted, with its
 * master still on disk, was never recorded and stays deleted.
 */

import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { hasErrnoCode } from "./fs/errno.js";

/** Where the record lives, beside the masters it names. */
export const PENDING_CITATIONS_BASENAME = ".qfai-citations.pending.json";

/** Entry point, as a repository-relative POSIX path, to the masters it owes. */
export type PendingCitations = Record<string, string[]>;

/** The recorded citations, or an empty record when there is nothing readable. */
export async function readPendingCitations(rulesDir: string): Promise<PendingCitations> {
  let raw: string;
  try {
    raw = await readFile(path.join(rulesDir, PENDING_CITATIONS_BASENAME), "utf-8");
  } catch (error: unknown) {
    if (hasErrnoCode(error) && (error.code === "ENOENT" || error.code === "ENOTDIR")) return {};
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // A record nobody can read owes nothing. The masters it named are still on
    // disk, and the refusal that recorded them already named them to the user.
    return {};
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const pending: PendingCitations = {};
  for (const [entryPoint, masters] of Object.entries(parsed)) {
    if (!Array.isArray(masters)) continue;
    const named = masters.filter((master): master is string => typeof master === "string");
    if (named.length > 0) pending[entryPoint] = named;
  }
  return pending;
}

/** Writes the record, or removes it when nothing is owed. */
export async function writePendingCitations(
  rulesDir: string,
  pending: Readonly<PendingCitations>,
): Promise<void> {
  const target = path.join(rulesDir, PENDING_CITATIONS_BASENAME);
  const owed = Object.entries(pending)
    .filter(([, masters]) => masters.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([entryPoint, masters]) => [entryPoint, [...new Set(masters)].sort()] as const);
  if (owed.length === 0) {
    await rm(target, { force: true });
    return;
  }
  await writeFile(target, `${JSON.stringify(Object.fromEntries(owed), null, 2)}\n`, "utf-8");
}
