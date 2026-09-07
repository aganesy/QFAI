// QFAI:SPEC-0006:TC-0006-0019
//
// Integration: `qfai doctor --clean` archives by RENAMING a stale pack into
// `.qfai/review/_archive/`. On a repository that COMMITS its review packs and
// whose `.gitignore` excludes the archive — the shape QFAI's own repository
// has — that rename takes the pack out of version control: git sees the files
// disappear, and the next commit removes them. The pack survives on the
// operator's disk and nowhere else, and the deletion reads as intentional in
// review, done by a command called "remediate" (#1157).
//
// A real git repository is built per row, because the condition is a fact about
// git's index and ignore rules and nothing else can stand in for it. The
// negative row is the one that keeps the guard honest: the same pack, the same
// ignored destination, and NOT tracked — where the move costs nothing and must
// still happen, or `--clean` stops working for every project on the shipped
// `.gitignore`.

import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanStaleReviewPacks } from "../../../../src/core/doctor/cleanReviewPacks.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

function git(root: string, args: readonly string[]): void {
  execFileSync("git", [...args], { cwd: root, stdio: "ignore" });
}

/**
 * A repository holding one stale review pack, with `_archive` ignored the way
 * the shipped block ignores it. `track` decides whether the pack is committed.
 */
async function seedRepo(
  track: boolean,
  ignoreArchive = true,
): Promise<{ root: string; packName: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-clean-tracked-"));
  tempDirs.push(root);
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "test"]);

  await writeFile(
    path.join(root, ".gitignore"),
    ignoreArchive
      ? ".qfai/review/*\n"
      : ".qfai/review/*\n!.qfai/review/_archive/\n!.qfai/review/_archive/**\n",
    "utf-8",
  );

  const packName = "review-20260401120000123";
  const packDir = path.join(root, ".qfai", "review", packName);
  await mkdir(packDir, { recursive: true });
  await writeFile(path.join(packDir, "summary.json"), "{}\n", "utf-8");

  git(root, ["add", ".gitignore"]);
  if (track) {
    // Force-added, which is exactly how a project that wants its packs in
    // version control gets them there past the shipped ignore.
    git(root, ["add", "--force", `.qfai/review/${packName}`]);
  }
  git(root, ["commit", "--quiet", "-m", "seed"]);

  const stale = new Date(Date.now() - 26 * 24 * 60 * 60 * 1000);
  await utimes(packDir, stale, stale);
  return { root, packName };
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

describe("doctor --clean does not archive a tracked pack into an ignored directory", () => {
  it("keeps a committed pack in place and says why", async () => {
    const { root, packName } = await seedRepo(true);

    const result = await cleanStaleReviewPacks(root);

    expect(
      result.archived.map((entry) => entry.packName),
      "a tracked pack must not be moved into a git-ignored archive",
    ).toEqual([]);
    expect(result.skippedWouldUntrack.map((entry) => entry.packName)).toEqual([packName]);
    expect(
      await exists(path.join(root, ".qfai", "review", packName, "summary.json")),
      "the pack stays where git can see it",
    ).toBe(true);
  });

  it("archives the same pack when it is not tracked", async () => {
    // The over-correction pin. The destination is ignored here too, and the
    // move still has to happen: on the shipped `.gitignore` no project tracks
    // its packs, so a guard keyed on the destination alone would make `--clean`
    // a no-op everywhere.
    const { root, packName } = await seedRepo(false);

    const result = await cleanStaleReviewPacks(root);

    expect(result.archived.map((entry) => entry.packName)).toEqual([packName]);
    expect(result.skippedWouldUntrack).toEqual([]);
    expect(
      await exists(path.join(root, ".qfai", "review", "_archive", packName, "summary.json")),
      "an untracked pack loses nothing by moving, so it moves",
    ).toBe(true);
  });

  it("archives a tracked pack when the destination is NOT ignored", async () => {
    // The second over-correction pin, and the one that makes the destination
    // half of the condition load-bearing. A project that un-ignores the archive
    // has resolved the contradiction its own way, and archiving there moves the
    // pack WITHIN version control — a rename git records, not a deletion. A
    // guard keyed on "is it tracked" alone would refuse that forever.
    const { root, packName } = await seedRepo(true, false);

    const result = await cleanStaleReviewPacks(root);

    expect(result.archived.map((entry) => entry.packName)).toEqual([packName]);
    expect(result.skippedWouldUntrack).toEqual([]);
    expect(
      await exists(path.join(root, ".qfai", "review", "_archive", packName, "summary.json")),
      "a move git can follow is an archive, which is what the command promises",
    ).toBe(true);
  });

  it("previews the refusal under --dry-run rather than promising the move", async () => {
    const { root, packName } = await seedRepo(true);

    const result = await cleanStaleReviewPacks(root, { dryRun: true });

    expect(
      result.archived,
      "a preview that lists a move the live run will decline is worse than no preview",
    ).toEqual([]);
    expect(result.skippedWouldUntrack.map((entry) => entry.packName)).toEqual([packName]);
  });

  it("archives when the tree is not a git repository at all", async () => {
    // Without version control there is no version control to lose. The guard
    // must fail OPEN here, or a project that has not run `git init` can never
    // archive a pack.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-clean-nogit-"));
    tempDirs.push(root);
    const packName = "review-20260401120000123";
    const packDir = path.join(root, ".qfai", "review", packName);
    await mkdir(packDir, { recursive: true });
    await writeFile(path.join(packDir, "summary.json"), "{}\n", "utf-8");
    const stale = new Date(Date.now() - 26 * 24 * 60 * 60 * 1000);
    await utimes(packDir, stale, stale);

    const result = await cleanStaleReviewPacks(root);

    expect(result.archived.map((entry) => entry.packName)).toEqual([packName]);
    expect(result.skippedWouldUntrack).toEqual([]);
  });
});
