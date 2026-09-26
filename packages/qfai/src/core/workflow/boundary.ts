import { readFile } from "node:fs/promises";
import path from "node:path";

import { hashAssistantAssetText } from "../assistantAssetProvenance.js";
import { gitStdout, uncommittedPaths } from "../gitChanges.js";
import type { WorkflowBoundaryStart } from "./types.js";

// The runtime tree is never tracked, so nothing under it is a run change.
const RUNTIME = ".qfai/run/";

// A path's content digest after CRLF normalization, or `null` when there is no file.
async function contentDigest(root: string, file: string): Promise<string | null> {
  const text = await readFile(path.join(root, ...file.split("/")), "utf8").catch(() => undefined);
  return text === undefined ? null : hashAssistantAssetText(text);
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
