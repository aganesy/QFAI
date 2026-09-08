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

/** Runs git for its stdout, or returns `null` when the command cannot run. */
function gitStdout(root: string, args: readonly string[]): string | null {
  try {
    return execFileSync("git", [...args], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

/**
 * Whether `file` still differs once a CR at end of line is ignored.
 *
 * `--quiet` is the only formatter git computes strictly from the diff it just
 * ran: it reports "no changes" for a pair whose patch came out empty under the
 * ignore flag, and "changes" for one that emitted anything at all — including
 * the header-only patch of a mode change or of an added empty file. The
 * `--name-only` and `--numstat` formatters do not carry that guarantee on every
 * git a consumer may have installed, which is why this second call exists.
 *
 * **Three-dot, matching {@link getChangedFilesAgainstBase}.** This confirms a
 * `0 0` row that function's own listing produced, so the two must address the
 * same pair of trees. Against a two-dot range the confirmation reads a file
 * that only `base` changed as differing, the `0 0` row survives, and a path
 * whose entire diff is line endings is reported as drift — the case this
 * function exists to drop.
 *
 * A git failure here is read as "changed": the caller's job is to flag drift,
 * and staying silent because a subprocess broke would be the wrong default.
 */
function differsIgnoringEol(root: string, baseBranch: string, file: string): boolean {
  try {
    execFileSync(
      "git",
      ["diff", "--ignore-cr-at-eol", "--quiet", `${baseBranch}...HEAD`, "--", file],
      { cwd: root, encoding: "utf-8", stdio: ["ignore", "ignore", "ignore"] },
    );
    return false;
  } catch {
    return true;
  }
}

/**
 * Files this branch changed since it diverged from `baseBranch`, as
 * repo-relative paths.
 *
 * **Three-dot, deliberately.** `<base>..HEAD` answers "how do these two trees
 * differ", which includes everything `<base>` gained after the branch left it —
 * so a file changed on `origin/main` and never touched here was reported as
 * "modified on this branch", and `QFAI-DRIFT-001`'s error count grew as main
 * advanced, on a branch whose review cycle the gate itself makes slow. Gate
 * item 12's step 4 is `qfai validate --fail-on error`, so the gate became a
 * function of wall-clock time rather than of the tree.
 *
 * `<base>...HEAD` is the merge-base comparison, which is what both callers
 * mean: `upstreamSsotGuard` asks whether a downstream phase edited a protected
 * artifact, and `traceabilityIntegrity` asks which spec packs this branch
 * changed. Neither question is about what happened on `base`.
 *
 * Returns `null` — not an empty set — when git is unavailable, the base branch
 * cannot be resolved, or the directory is not a repository. "git could not
 * answer" and "git answered: nothing changed" are different facts, and folding
 * the first into the second let a shallow CI clone or a missing base ref
 * silently disable diff-gated checks. A validator that hard-failed outside a
 * git checkout would make `qfai validate` unusable in a tarball export, so the
 * failure stays non-fatal — but callers can now report it.
 *
 * Paths whose only difference is the line ending are dropped. A whole-file
 * CRLF rewrite on Windows changes every byte of a protected artifact without
 * changing a single line of its content, and the drift protocol tells the
 * reviewer to read exactly such a diff as "not evidence of drift". Listing the
 * path anyway would leave the operator owing a Change Request for a change that
 * carries no content — with no edit that could ever satisfy it short of
 * reverting the line endings.
 *
 * The listing is taken from `--numstat` rather than `--name-only` because only
 * the line counts are derived from the diff itself. Whether `--name-only`
 * suppresses a pair that `--ignore-cr-at-eol` emptied has varied across git
 * releases — recent versions drop it, older ones still print the name — so a
 * `0 0` row is treated as a candidate and confirmed with a second, per-path
 * `--quiet` diff. That confirmation is what keeps mode-only changes and added
 * empty files, which also count `0 0`, in the result.
 *
 * `--no-renames` keeps the row format to three tab-separated fields (rename
 * detection prints `old => new` in the path column) and makes a moved artifact
 * report both endpoints, which is what a drift guard wants to see.
 *
 * `-z` because the path column is otherwise C-quoted under the default
 * `core.quotePath`: a path with a non-ASCII character arrives wrapped in quotes
 * with its bytes octal-escaped, and that string matches no file on disk. It
 * would then reach the per-path confirmation below as a pathspec matching
 * nothing, read as clean, and drop out of the result — silently exempting
 * exactly the artifacts a non-English project names.
 *
 * A caller that asks "was the file this row points at modified?" wants
 * {@link withoutPathsGoneAtHead} over this set.
 */
export function getChangedFilesAgainstBase(root: string, baseBranch: string): Set<string> | null {
  const output = gitStdout(root, [
    "diff",
    "--ignore-cr-at-eol",
    "--no-renames",
    "--numstat",
    "-z",
    `${baseBranch}...HEAD`,
  ]);
  if (output === null) {
    return null;
  }

  const changed = new Set<string>();
  // Under `-z` a record is `added TAB deleted TAB path`, NUL-terminated, and
  // the path is raw. `--no-renames` rules out the two-path rename record.
  for (const record of output.split("\0")) {
    if (record.length === 0) {
      continue;
    }
    const fields = record.split("\t");
    if (fields.length < 3) {
      continue;
    }
    const [added, deleted] = fields;
    const file = fields.slice(2).join("\t");
    if (file.length === 0) {
      continue;
    }
    // Binary pairs count `-`, so only a literal `0 0` is a candidate.
    if (added === "0" && deleted === "0" && !differsIgnoringEol(root, baseBranch, file)) {
      continue;
    }
    changed.add(normalizeRepoPath(file));
  }

  return changed;
}

/**
 * `changed` without the paths this branch removed.
 *
 * Asking "was the file this ledger row points at modified?" is answered wrongly
 * by any path the branch **removed**: it no longer exists, and finding it in the
 * set let a ledger still naming it pass as though its implementation had been
 * touched. A separate function rather than an option on the listing above,
 * because the same caller needs both sets — the raw one says which spec
 * directories the branch touched, deletions included, and pruning that would
 * hide a spec deleted whole.
 *
 * Keyed on removal rather than on rename detection, because rename detection is
 * a similarity score. A file moved and substantially rewritten in one commit
 * falls under the threshold and is reported as a delete plus an add, so a set
 * that subtracted only detected renames left that source behind — and a ledger
 * row still naming it passed. So does a plain deletion, whose path is equally
 * gone. Removal is the property the caller is actually asking about, and it is
 * not a heuristic.
 */
export function withoutPathsGoneAtHead(
  root: string,
  baseBranch: string,
  changed: ReadonlySet<string>,
): Set<string> {
  const kept = new Set(changed);
  for (const removed of getRemovedPathsAgainstBase(root, baseBranch)) {
    kept.delete(removed);
  }
  return kept;
}

/**
 * Whether anything under `paths` changed between `revision` and `HEAD`.
 *
 * Three answers, not two. {@link getChangedFilesAgainstBase} collapses every
 * failure into an empty set because its caller reads that as "nothing to
 * check"; here the same collapse would read as "the evidence is fresh", which
 * is the silent failure this exists to detect. An unresolvable
 * revision is its own answer and the caller must say something about it.
 *
 * `unresolvable` is not rare or necessarily wrong: a shallow clone or an
 * unfetched branch produces it for a perfectly good revision, which is why
 * `QFAI-REVIEW-009` treats the same condition as a warning.
 *
 * `paths` is a pathspec. Passing the observation's own test file plus the
 * source directory is the computation `#what-makes-evidence-stale` specifies
 * in prose — "a commit that changes any file the observation covered".
 *
 * **Two-dot here, unlike {@link getChangedFilesAgainstBase} above, and not an
 * oversight.** `revision` is a POINT on this branch's own history, not another
 * branch: the question is whether the tree moved between that point and now.
 * Three-dot would compare against a merge base with a point, which excludes
 * changes on the far side of it and means nothing for a recorded observation.
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

/**
 * Every path present on `baseBranch` and gone at `HEAD`.
 *
 * `--diff-filter=D` under `--no-renames` is the whole answer: with rename
 * detection off a rename is a deletion plus an addition, so the sources of
 * detected renames, the sources of moves too rewritten to be detected as one,
 * and plain deletions all arrive as `D` rows. One list, no similarity score.
 *
 * `--name-only -z` is used so a path holding a quote or a non-ASCII byte comes
 * back verbatim rather than in git's C-style quoted form.
 *
 * **Three-dot, matching {@link getChangedFilesAgainstBase}.** These paths are
 * subtracted from that function's set, so a removal listed against a different
 * pair of trees removes a path the set never held, or fails to remove one it
 * does — either way this function stops meaning what its caller reads it
 * to mean.
 */
function getRemovedPathsAgainstBase(root: string, baseBranch: string): Set<string> {
  const output = gitStdout(root, [
    "diff",
    "--no-renames",
    "--diff-filter=D",
    "--name-only",
    "-z",
    `${baseBranch}...HEAD`,
  ]);
  const removed = new Set<string>();
  if (output === null) {
    return removed;
  }
  for (const record of output.split("\0")) {
    if (record.length > 0) {
      removed.add(normalizeRepoPath(record));
    }
  }
  return removed;
}
