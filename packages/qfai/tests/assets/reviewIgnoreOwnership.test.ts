/**
 * The directories that hold one worker's local records stay out of the index.
 *
 * Discussion packs, their archive, run reports and review packs record one
 * checkout's work. None of them is part of the codebase, so none is tracked,
 * and git ignores a new file in any of them.
 *
 * The ignore case asks git rather than reading the root `.gitignore`: a nested
 * ignore file inside one of these directories wins over the root rules without
 * saying so, and only git's verdict shows it.
 *
 * Asked of git rather than of the filesystem. Records stay on an operator's disk
 * after they leave the index, so `access` answers about one checkout while the
 * policy is about the repository.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Each untracked directory, with a representative path a run writes inside it. */
const LOCAL_RECORD_DIRECTORIES: ReadonlyArray<readonly [directory: string, sample: string]> = [
  [".qfai/discussion", ".qfai/discussion/discussion-20260101000000000/01_Context.md"],
  [
    ".qfai/discussion_archive",
    ".qfai/discussion_archive/discussion-20260101000000000/01_Context.md",
  ],
  [".qfai/report", ".qfai/report/validate.json"],
  [".qfai/review", ".qfai/review/review-20260101000000000/summary.json"],
  [".qfai/review_archive", ".qfai/review_archive/review-20260101000000000/summary.json"],
];

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

describe("no local work record reaches version control", () => {
  it.each(LOCAL_RECORD_DIRECTORIES)("tracks nothing under %s", (directory) => {
    expect(trackedUnder(directory), `${directory} holds local records only.`).toEqual([]);
  });

  it.each(LOCAL_RECORD_DIRECTORIES)(
    "leaves git ignoring a new file in %s",
    (_directory, sample) => {
      // A representative path rather than a real one: the point is which rule
      // decides the shape, and a checkout with no records must answer too.
      expect(
        ignoredByGit(sample),
        `${sample} is not ignored. Either the root .gitignore lost its entry for this directory, or ` +
          `a nested ignore file inside it re-included the path — git applies the deepest matching ` +
          `file, so a nested one wins without saying so.`,
      ).toBe(true);
    },
  );

  it("reports a source file as not ignored, so the case above can fail", () => {
    // Without this, a harness that answered "ignored" to everything would pass
    // both cases above and prove nothing about any directory.
    expect(ignoredByGit("packages/qfai/src/core/gitignore.ts")).toBe(false);
  });
});
