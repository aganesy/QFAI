import path from "node:path";
import type { Stats } from "node:fs";
import { realpath, stat } from "node:fs/promises";

import { isEnoent } from "../fs/errno.js";

/**
 * Where a manifest write is allowed to land, and whether the directory that
 * answered that question is still the directory being written into.
 *
 * The merge replaces a project manifest **by pathname**, and a pathname is
 * re-resolved on every syscall. Node exposes no `openat` / `renameat`, so the
 * checked directory cannot be held as a descriptor and operated on relatively;
 * what it can do is record the directory's identity at the moment the write is
 * authorised and require that same identity again immediately before the
 * replacement. A `manifest/` swapped for a link out of the tree in between is
 * then detected instead of followed.
 */

/** A directory's identity at the moment it cleared the write-safety check. */
export type DirectoryPin = {
  readonly dir: string;
  readonly dev: number;
  readonly ino: number;
};

type RealpathOutcome =
  | { kind: "resolved"; real: string }
  | { kind: "missing" }
  | { kind: "unresolvable" };

/**
 * `true` when `dir` is inside `destRoot` once every symlink on the way to both
 * is resolved.
 *
 * A path that is simply **absent** passes: the manifest layer is missing, which
 * the read reports as nothing to merge (and `--dry-run` reaches here before the
 * create-only copy has made anything). A path that exists and cannot be
 * resolved does not: the caller has no way to tell where a write would land,
 * and the merge is skippable.
 */
export async function resolvesInsideRoot(destRoot: string, dir: string): Promise<boolean> {
  const [rootReal, dirReal] = await Promise.all([safeRealpath(destRoot), safeRealpath(dir)]);
  if (rootReal.kind === "missing" || dirReal.kind === "missing") return true;
  if (rootReal.kind !== "resolved" || dirReal.kind !== "resolved") return false;
  const rel = path.relative(rootReal.real, dirReal.real);
  if (rel === "") return true;
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

/**
 * Pin `dir` by identity, or `null` when it is not a directory that can be
 * stat'd — in which case there is nothing safe to write into and the caller
 * must not try.
 */
export async function pinDirectory(dir: string): Promise<DirectoryPin | null> {
  const stats = await safeStat(dir);
  if (stats === null || !stats.isDirectory()) return null;
  return { dir, dev: stats.dev, ino: stats.ino };
}

/**
 * `true` when the pinned directory is still the same directory, and still
 * inside `destRoot`.
 *
 * Both halves matter and neither subsumes the other: `dev`/`ino` catch a swap
 * for a different directory (including one on the same volume), and the
 * containment re-check catches an escape even where a filesystem reports no
 * usable inode number — which is the harm the pin exists to prevent.
 */
export async function directoryPinIntact(
  destRoot: string,
  pin: DirectoryPin | null,
): Promise<boolean> {
  if (pin === null) return false;
  const stats = await safeStat(pin.dir);
  if (stats === null || !stats.isDirectory()) return false;
  if (stats.dev !== pin.dev || stats.ino !== pin.ino) return false;
  return await resolvesInsideRoot(destRoot, pin.dir);
}

/** The resolved path, or why it could not be resolved. */
async function safeRealpath(target: string): Promise<RealpathOutcome> {
  try {
    return { kind: "resolved", real: await realpath(target) };
  } catch (err: unknown) {
    return isEnoent(err) ? { kind: "missing" } : { kind: "unresolvable" };
  }
}

/** `stat` following links, or `null` when the path cannot be stat'd at all. */
async function safeStat(target: string): Promise<Stats | null> {
  try {
    return await stat(target);
  } catch {
    return null;
  }
}
