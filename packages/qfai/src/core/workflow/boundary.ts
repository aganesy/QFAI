import { lstat, readFile, readlink } from "node:fs/promises";
import path from "node:path";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import { isEnoent } from "../fs/errno.js";
import { gitStdout, uncommittedPaths } from "../gitChanges.js";
import type { WorkflowBoundaryStart } from "./types.js";

// The runtime tree is never tracked, so nothing under it is a run change.
const RUNTIME = ".qfai/run/";

// What a path holds, as the boundary compares it: a regular file's content digest after CRLF
// normalization, a link's target, the type of anything else, or `null` when nothing is there.
// The link itself is judged, never what it points at, so a link out of the project is a change
// like any other. Any other failure to read it is the caller's.
async function contentDigest(root: string, file: string): Promise<string | null> {
  const full = path.join(root, ...file.split("/"));
  try {
    const stats = await lstat(full);
    if (stats.isSymbolicLink()) return `link:${await readlink(full)}`;
    if (!stats.isFile()) return `type:${stats.isDirectory() ? "directory" : "other"}`;
    return hashAssistantAssetText(await readFile(full, "utf8"));
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
}

function nulSeparated(output: string | null): string[] {
  return (output ?? "").split("\0").filter((entry) => entry.length > 0);
}

// What `start` fixes: the commit checked out, and each path already changed then, with its
// content digest.
export async function boundaryStartOf(root: string): Promise<WorkflowBoundaryStart> {
  const head = gitStdout(root, ["rev-parse", "--verify", "--quiet", "HEAD"])?.trim() || null;
  const dirty = (uncommittedPaths(root) ?? []).filter((file) => !file.startsWith(RUNTIME));
  const digests = await Promise.all(dirty.map((file) => contentDigest(root, file)));
  return {
    head,
    dirty: Object.fromEntries(dirty.map((file, index) => [file, digests[index] ?? null])),
  };
}

// Every path changed since `start`: each commit since the fixed `HEAD`, the index, the working
// tree and each untracked file git does not ignore. A path already changed at `start` counts
// only once its content moves on from what `start` recorded.
// SIMPLIFIED: a path's content is compared, not its file type or mode.
// Lift when: a run is found changing only a path's type or mode.
export async function changedSinceStart(
  root: string,
  start: WorkflowBoundaryStart,
): Promise<string[]> {
  const committed = start.head
    ? nulSeparated(gitStdout(root, ["diff", "--name-only", "-z", "--no-renames", start.head]))
    : [];
  const paths = [...new Set([...committed, ...(uncommittedPaths(root) ?? [])])].filter(
    (file) => !file.startsWith(RUNTIME),
  );
  const moved = await Promise.all(
    paths.map(async (file) => {
      if (!Object.hasOwn(start.dirty, file)) return true;
      return (await contentDigest(root, file)) !== start.dirty[file];
    }),
  );
  return paths.filter((_, index) => moved[index]).sort();
}
