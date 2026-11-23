import { randomUUID } from "node:crypto";
import { cp, lstat, mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../fs/errno.js";
import {
  graphAnalysisStaging,
  graphRetainedDirectory,
  isGraphAnalysisStaging,
  type GraphAnalysisEngine,
} from "./layout.js";

export async function assertGraphStoragePath(root: string, directory: string): Promise<void> {
  const relative = path.relative(root, directory);
  const parts = relative.split(path.sep);
  if (
    path.isAbsolute(relative) ||
    parts[0] !== ".qfai" ||
    parts[1] !== "tools" ||
    parts.includes("..")
  ) {
    throw new Error("Graph storage must stay inside project-local .qfai/tools.");
  }
  for (let depth = 1; depth <= parts.length; depth += 1) {
    try {
      const stats = await lstat(path.join(root, ...parts.slice(0, depth)));
      if (stats.isSymbolicLink() || !stats.isDirectory())
        throw new Error(
          "Graph storage has an unsafe path component; retain it and repair the project configuration.",
        );
    } catch (cause: unknown) {
      if (isEnoent(cause)) return;
      throw cause;
    }
  }
}

export async function assertIndependentAnalysis(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    const stats = await lstat(child);
    if (stats.isSymbolicLink() || (stats.isFile() && stats.nlink > 1)) {
      throw new Error(
        "Graph analysis contains a shared file or unsafe link; retain it and prepare an independent copy.",
      );
    }
    if (stats.isDirectory()) await assertIndependentAnalysis(child);
  }
}

export async function replaceGraphDirectory(
  staged: string,
  current: string,
  root: string,
): Promise<void> {
  await assertGraphStoragePath(root, staged);
  await assertGraphStoragePath(root, current);
  const parent = path.dirname(current);
  await mkdir(parent, { recursive: true });
  const previous = graphRetainedDirectory(current, randomUUID());
  let retained = false;
  try {
    await rename(current, previous);
    retained = true;
  } catch (cause: unknown) {
    if (!isEnoent(cause)) throw cause;
  }
  try {
    await rename(staged, current);
  } catch (cause: unknown) {
    if (retained) await rename(previous, current);
    throw cause;
  }
  if (retained) await rm(previous, { recursive: true, force: true });
}

/**
 * Refreshes and checks an independent copy of the active `analysis`, made beside it, and switches
 * the copy in only when `current` accepts what `check` found, so a failed refresh leaves the
 * previous graph paired with the inputs it was built from. The copy is discarded in every case,
 * and so are the copies earlier queries could not discard. The caller holds the graph lock, so no
 * other query is using one of them.
 */
export async function checkRefreshCopy<T>(
  root: string,
  analysis: string,
  engine: GraphAnalysisEngine,
  check: (staged: string) => Promise<T>,
  current: (result: T) => boolean,
): Promise<T> {
  const staged = graphAnalysisStaging(analysis, "refreshing", engine, randomUUID());
  await assertGraphStoragePath(root, staged);
  await discardLeftoverRefreshCopies(analysis, engine);
  try {
    await cp(analysis, staged, { recursive: true, dereference: false });
    const result = await check(staged);
    if (current(result)) await replaceGraphDirectory(staged, analysis, root);
    return result;
  } finally {
    await discardRefreshCopy(staged);
  }
}

/**
 * Removes, best effort, the refresh copies of `engine` left beside `analysis` by earlier queries,
 * such as one a Windows process still held open when its query tried to remove it.
 */
async function discardLeftoverRefreshCopies(
  analysis: string,
  engine: GraphAnalysisEngine,
): Promise<void> {
  const parent = path.dirname(analysis);
  for (const name of await readdir(parent))
    if (isGraphAnalysisStaging(name, "refreshing", engine))
      await discardRefreshCopy(path.join(parent, name));
}

async function discardRefreshCopy(staged: string): Promise<void> {
  try {
    await rm(staged, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    // The status already decided stands: a left-over hidden copy is never read as analysis.
  }
}
