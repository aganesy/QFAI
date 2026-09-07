/**
 * Whether moving a directory would take it out of version control.
 *
 * `doctor --clean` archives a stale review pack by RENAMING it. That is a
 * retention move, not a deletion — unless the destination is git-ignored and
 * the source was tracked, in which case git sees the files disappear and the
 * next commit removes them from the repository. The pack survives on the
 * operator's disk and nowhere else, and the deletion reads as intentional in
 * review: twenty files removed by a command called "remediate".
 *
 * The two halves are both required. A project on the current shipped
 * `.gitignore` does not track its packs at all, so an ignored destination costs
 * it nothing and refusing there would make `--clean` useless for the common
 * case. A project that force-added its packs — which QFAI's own repository
 * does — is the one that loses them.
 */

import { execFileSync } from "node:child_process";

/** Why a pack was kept, in the words the operator needs to act on. */
export const WOULD_UNTRACK_REASON =
  "would delete committed review evidence: the archive destination is git-ignored and this pack is tracked";

/** Runs git in `root`, returning `null` when git or the repository is absent. */
function git(root: string, args: readonly string[]): { status: number; stdout: string } | null {
  try {
    const stdout = execFileSync("git", [...args], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { status: 0, stdout };
  } catch (error: unknown) {
    // A non-zero exit is an ANSWER here, not a failure: `check-ignore` exits 1
    // for "not ignored" and `ls-files` prints nothing for "not tracked". Only a
    // missing binary or a tree outside a repository means the question cannot
    // be asked, and those surface as an error with no numeric status.
    const failure: Record<string, unknown> =
      typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
    const status = failure["status"];
    if (typeof status !== "number") {
      return null;
    }
    const stdout = failure["stdout"];
    return { status, stdout: typeof stdout === "string" ? stdout : "" };
  }
}

/**
 * True when `fromPath` holds at least one tracked file and `toPath` is ignored.
 *
 * `false` when the question cannot be asked — no git, or a tree outside a
 * repository. That is the safe direction: without version control there is no
 * version control to lose, and refusing to archive would strand every pack.
 */
export function moveWouldLeaveVersionControl(
  root: string,
  fromPath: string,
  toPath: string,
): boolean {
  const ignored = git(root, ["check-ignore", "-q", "--", toPath]);
  const tracked = git(root, ["ls-files", "--", fromPath]);
  // One expression, deliberately. Both calls answer `null` for the same
  // condition — no git, or a tree outside a repository — so a separate early
  // return for it is unreachable: written as two guards, inverting either
  // `null` branch changed no test, because when one is `null` so is the other
  // and the remaining condition already cannot hold. Stating the fail-open
  // direction once leaves nothing untested behind it.
  return ignored?.status === 0 && (tracked?.stdout.trim().length ?? 0) > 0;
}
