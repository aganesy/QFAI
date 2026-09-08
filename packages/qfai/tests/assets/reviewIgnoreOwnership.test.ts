/**
 * Nothing under a review directory is in version control, and nothing inside
 * one gets to decide that.
 *
 * The two directories used to be ignored by different owners: `.qfai/review/`
 * by the managed block in the repo-root `.gitignore`, and
 * `.qfai/review_archive/` by a nested file of its own. Each carried a README
 * stating which arrangement was theirs, and nothing tied either statement to
 * the tree — one named a nested file that had already been deleted, while a
 * paragraph further down in the same file said the opposite. Both readings
 * were available at once for as long as nobody compared them to the directory.
 *
 * Those statements are gone with the files that made them, so the check is no
 * longer "does the README match the directory". It is the arrangement itself:
 * the root block is the only owner, and a nested ignore file inside one of
 * these directories would outrank it silently, because git applies the deepest
 * matching file.
 *
 * Asked of git rather than of the filesystem. Packs stay on an operator's disk
 * after they leave the index, so `access` answers about one checkout while the
 * policy is about the repository.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The directories a review round writes into. Neither is tracked. */
const REVIEW_DIRECTORIES: readonly string[] = [".qfai/review", ".qfai/review_archive"];

/** Repository-relative paths tracked under `directory`, POSIX-separated as git reports them. */
function trackedUnder(directory: string): string[] {
  const result = spawnSync("git", ["ls-files", "--", directory], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed for ${directory}: status ${String(result.status)}`);
  }
  return result.stdout.split("\n").filter((line) => line.length > 0);
}

/**
 * Git's verdict on one path.
 *
 * `--no-index` because tracking is a separate question, asked above: a path in
 * the index reports as not ignored however the patterns read, so without this
 * the two cases would collapse into one.
 */
function ignoredByGit(samplePath: string): boolean {
  const result = spawnSync("git", ["check-ignore", "--quiet", "--no-index", samplePath], {
    cwd: repoRoot,
  });
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `git check-ignore could not decide ${samplePath}: status ${String(result.status)}`,
    );
  }
  return result.status === 0;
}

describe("no review directory reaches version control", () => {
  it.each(REVIEW_DIRECTORIES)("tracks nothing under %s", (directory) => {
    expect(
      trackedUnder(directory),
      `${directory} is generated output. A file tracked here is one an operator's next round ` +
        `overwrites, and it reaches a commit only because something re-included it.`,
    ).toEqual([]);
  });

  it.each(REVIEW_DIRECTORIES)("leaves git ignoring a pack inside %s", (directory) => {
    // A representative pack path rather than a real one: the point is which
    // rule decides the shape, and a checkout with no packs must answer too.
    const sample = `${directory}/review-20260101000000000/summary.json`;
    expect(
      ignoredByGit(sample),
      `${sample} is not ignored. Either the managed block lost its entry for this directory, or a ` +
        `nested ignore file inside it re-included the packs — git applies the deepest matching ` +
        `file, so a nested one wins without saying so.`,
    ).toBe(true);
  });

  it("reports a source file as not ignored, so the case above can fail", () => {
    // Without this, a harness that answered "ignored" to everything would pass
    // both cases above and prove nothing about either directory.
    expect(ignoredByGit("packages/qfai/src/core/gitignore.ts")).toBe(false);
  });
});
