/**
 * Git revision resolution — v1.7.15
 *
 * Resolves current commit SHA from `.git/HEAD`, with support for:
 *   - Standard `.git/` directory layouts
 *   - Linked worktrees (where `.git` is a file containing `gitdir: <path>`
 *     and the worktree gitdir has a `commondir` file pointing at the main
 *     repository's `.git` directory; `refs/heads/*` and `packed-refs` live
 *     in that common gitdir, not the worktree-local gitdir)
 *   - `packed-refs` fallback when the loose ref file is absent
 *
 * Full-harness requires commitSha on every iteration.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

type GitDirs = {
  /** Worktree-local gitdir: where `HEAD` lives. */
  gitDir: string;
  /** Common gitdir: where `refs/heads/*` and `packed-refs` live. Same as
   * gitDir for non-worktree layouts; resolved from `commondir` otherwise. */
  commonDir: string;
};

async function resolveGitDirs(root: string): Promise<GitDirs> {
  const dotGit = path.join(root, ".git");
  const info = await stat(dotGit);
  const gitDir = info.isDirectory() ? dotGit : await resolveWorktreeGitDir(root, dotGit);

  // Linked worktrees write a `commondir` file (relative or absolute path)
  // pointing to the main repository's .git directory. Non-worktree layouts
  // don't have this file; treat gitDir as the common dir.
  try {
    const commondirText = (await readFile(path.join(gitDir, "commondir"), "utf-8")).trim();
    if (commondirText.length > 0) {
      const commonDir = path.isAbsolute(commondirText)
        ? commondirText
        : path.resolve(gitDir, commondirText);
      return { gitDir, commonDir };
    }
  } catch {
    // No commondir file — standard layout.
  }

  return { gitDir, commonDir: gitDir };
}

async function resolveWorktreeGitDir(root: string, dotGitFile: string): Promise<string> {
  const text = (await readFile(dotGitFile, "utf-8")).trim();
  const match = /^gitdir:\s*(.+)$/m.exec(text);
  if (!match?.[1]) {
    throw new Error(`Unrecognized .git file format at ${dotGitFile}`);
  }
  const gitdirValue = match[1].trim();
  return path.isAbsolute(gitdirValue) ? gitdirValue : path.resolve(root, gitdirValue);
}

async function lookupPackedRef(commonDir: string, refName: string): Promise<string | null> {
  try {
    const packedPath = path.join(commonDir, "packed-refs");
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

async function readRefLoose(dir: string, refName: string): Promise<string | null> {
  try {
    const sha = (await readFile(path.join(dir, refName), "utf-8")).trim();
    return sha.length > 0 ? sha : null;
  } catch {
    return null;
  }
}

export async function resolveCommitSha(root: string): Promise<string> {
  try {
    const { gitDir, commonDir } = await resolveGitDirs(root);
    const headPath = path.join(gitDir, "HEAD");
    const headContent = (await readFile(headPath, "utf-8")).trim();

    if (headContent.startsWith("ref: ")) {
      const refName = headContent.slice(5).trim();
      // Try the worktree-local gitdir first (e.g. per-worktree HEAD refs),
      // then fall back to the common gitdir where branch refs actually live,
      // then to packed-refs in the common gitdir.
      const looseLocal = await readRefLoose(gitDir, refName);
      if (looseLocal) return looseLocal;
      if (commonDir !== gitDir) {
        const looseCommon = await readRefLoose(commonDir, refName);
        if (looseCommon) return looseCommon;
      }
      const packed = await lookupPackedRef(commonDir, refName);
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
