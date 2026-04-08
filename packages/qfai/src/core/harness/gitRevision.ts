/**
 * Git revision resolution — v1.7.15
 *
 * Resolves current commit SHA from .git/HEAD.
 * Full-harness requires commitSha on every iteration.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

export async function resolveCommitSha(root: string): Promise<string> {
  try {
    const headPath = path.join(root, ".git", "HEAD");
    const headContent = (await readFile(headPath, "utf-8")).trim();

    if (headContent.startsWith("ref: ")) {
      const refPath = path.join(root, ".git", headContent.slice(5));
      const sha = (await readFile(refPath, "utf-8")).trim();
      return sha;
    }
    // Detached HEAD — content is the SHA itself
    return headContent;
  } catch {
    throw new Error(
      "Cannot resolve git commit SHA. " +
        "Full-harness mode requires a valid git repository with at least one commit.",
    );
  }
}
