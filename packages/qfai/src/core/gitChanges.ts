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
 * Returns an empty set when git is unavailable, the base branch cannot be
 * resolved, or the directory is not a repository. Callers treat "no changed
 * files" as "nothing to check": a validator that hard-failed outside a git
 * checkout would make `qfai validate` unusable in a tarball export.
 */
export function getChangedFilesAgainstBase(root: string, baseBranch: string): Set<string> {
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
    return new Set();
  }
}

/**
 * Whether anything under `paths` changed between `revision` and `HEAD`.
 *
 * Three answers, not two. {@link getChangedFilesAgainstBase} collapses every
 * failure into an empty set because its caller reads that as "nothing to
 * check"; here the same collapse would read as "the evidence is fresh", which
 * is the silent failure this exists to detect (#1146). An unresolvable
 * revision is its own answer and the caller must say something about it.
 *
 * `unresolvable` is not rare or necessarily wrong: a shallow clone or an
 * unfetched branch produces it for a perfectly good revision, which is why
 * `QFAI-REVIEW-009` treats the same condition as a warning.
 *
 * `paths` is a pathspec. Passing the observation's own test file plus the
 * source directory is the computation `#what-makes-evidence-stale` specifies
 * in prose — "a commit that changes any file the observation covered".
 */
export type ChangedSince =
  | { readonly kind: "changed"; readonly files: readonly string[] }
  | { readonly kind: "unchanged" }
  | { readonly kind: "unresolvable" };

export function changedFilesSince(
  root: string,
  revision: string,
  paths: readonly string[],
): ChangedSince {
  // Resolved first, and separately, so a bad revision is distinguishable from
  // a clean diff. `git diff` against an unknown ref fails the same way a
  // repository-less directory does, and the two need different answers.
  try {
    execFileSync("git", ["rev-parse", "--verify", `${revision}^{commit}`], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    return { kind: "unresolvable" };
  }

  try {
    const output = execFileSync(
      "git",
      ["diff", "--name-only", `${revision}..HEAD`, "--", ...paths],
      { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const files = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map(normalizeRepoPath);
    return files.length === 0 ? { kind: "unchanged" } : { kind: "changed", files };
  } catch {
    // The revision resolved a moment ago, so this is not a bad ref — a broken
    // worktree or a pathspec git rejects. Reporting it as unchanged would be
    // the collapse this function exists to avoid.
    return { kind: "unresolvable" };
  }
}
