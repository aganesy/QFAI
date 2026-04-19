/**
 * Git revision resolution — v1.7.15
 *
 * Resolves current commit SHA from `.git/HEAD`, with support for:
 *   - Standard `.git/` directory layouts
 *   - Linked worktrees (where `.git` is a file containing `gitdir: <path>`)
 *   - `packed-refs` fallback when the loose ref file is absent
 *
 * Full-harness requires commitSha on every iteration.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

async function resolveGitDir(root: string): Promise<string> {
  const dotGit = path.join(root, ".git");
  const info = await stat(dotGit);
  if (info.isDirectory()) {
    return dotGit;
  }
  // Linked worktree: `.git` is a file of the form `gitdir: <absolute-or-relative-path>`
  const text = (await readFile(dotGit, "utf-8")).trim();
  const match = /^gitdir:\s*(.+)$/m.exec(text);
  if (!match?.[1]) {
    throw new Error(`Unrecognized .git file format at ${dotGit}`);
  }
  const gitdirValue = match[1].trim();
  return path.isAbsolute(gitdirValue) ? gitdirValue : path.resolve(root, gitdirValue);
}

async function lookupPackedRef(gitDir: string, refName: string): Promise<string | null> {
  try {
    const packedPath = path.join(gitDir, "packed-refs");
    const content = await readFile(packedPath, "utf-8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith("#") || line.startsWith("^")) continue;
      const parts = line.split(/\s+/, 2);
      if (parts.length !== 2) continue;
      const [sha, ref] = parts;
      if (ref === refName && sha) return sha;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveCommitSha(root: string): Promise<string> {
  try {
    const gitDir = await resolveGitDir(root);
    const headPath = path.join(gitDir, "HEAD");
    const headContent = (await readFile(headPath, "utf-8")).trim();

    if (headContent.startsWith("ref: ")) {
      const refName = headContent.slice(5).trim();
      const refPath = path.join(gitDir, refName);
      try {
        const sha = (await readFile(refPath, "utf-8")).trim();
        if (sha.length > 0) return sha;
      } catch {
        // Loose ref missing — fall through to packed-refs lookup
      }
      const packed = await lookupPackedRef(gitDir, refName);
      if (packed) return packed;
      throw new Error(`Could not resolve ${refName} via loose ref or packed-refs.`);
    }
    // Detached HEAD — content is the SHA itself
    return headContent;
  } catch (err: unknown) {
    const detail = err instanceof Error ? ` (${err.message})` : "";
    throw new Error(
      "Cannot resolve git commit SHA. " +
        "Full-harness mode requires a valid git repository with at least one commit." +
        detail,
    );
  }
}
