/**
 * Branch diff against the configured base branch.
 *
 * Extracted from `validators/traceabilityIntegrity.ts`, which was the only
 * consumer: the same file list answers "which spec packs changed?" and "did a
 * downstream phase edit a protected upstream artifact?", and there is no reason
 * to shell out twice or to keep two copies of the failure handling.
 */
import { execFileSync } from "node:child_process";

/** Repo-relative, forward-slashed, with any leading `./` removed. */
export function normalizeRepoPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * Files changed between `baseBranch` and `HEAD`, as repo-relative paths.
 *
 * Returns `null` — not an empty set — when git is unavailable, the base branch
 * cannot be resolved, or the directory is not a repository. "git could not
 * answer" and "git answered: nothing changed" are different facts, and folding
 * the first into the second let a shallow CI clone or a missing base ref
 * silently disable diff-gated checks. A validator that hard-failed outside a
 * git checkout would make `qfai validate` unusable in a tarball export, so the
 * failure stays non-fatal — but callers can now report it.
 */
export function getChangedFilesAgainstBase(root: string, baseBranch: string): Set<string> | null {
  try {
    const output = execFileSync("git", ["diff", "--name-only", `${baseBranch}..HEAD`], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(
      output
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map(normalizeRepoPath),
    );
  } catch {
    return null;
  }
}
