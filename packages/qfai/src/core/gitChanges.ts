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
 * A git failure here is read as "changed": the caller's job is to flag drift,
 * and staying silent because a subprocess broke would be the wrong default.
 */
function differsIgnoringEol(root: string, baseBranch: string, file: string): boolean {
  try {
    execFileSync(
      "git",
      ["diff", "--ignore-cr-at-eol", "--quiet", `${baseBranch}..HEAD`, "--", file],
      { cwd: root, encoding: "utf-8", stdio: ["ignore", "ignore", "ignore"] },
    );
    return false;
  } catch {
    return true;
  }
}

/**
 * Files changed between `baseBranch` and `HEAD`, as repo-relative paths.
 *
 * Returns an empty set when git is unavailable, the base branch cannot be
 * resolved, or the directory is not a repository. Callers treat "no changed
 * files" as "nothing to check": a validator that hard-failed outside a git
 * checkout would make `qfai validate` unusable in a tarball export.
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
 */
export function getChangedFilesAgainstBase(root: string, baseBranch: string): Set<string> {
  const output = gitStdout(root, [
    "diff",
    "--ignore-cr-at-eol",
    "--no-renames",
    "--numstat",
    `${baseBranch}..HEAD`,
  ]);
  if (output === null) {
    return new Set();
  }

  const changed = new Set<string>();
  for (const raw of output.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.length === 0) {
      continue;
    }
    const fields = line.split("\t");
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
