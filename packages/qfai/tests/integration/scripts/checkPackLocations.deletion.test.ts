/**
 * Integration: removing a misplaced pack is not introducing one.
 *
 * The lane reports a `review-*` / `discussion-*` pack directory
 * introduced outside its allowed root, and it reads the change list from
 * git: staged paths, working-tree status, and the diff against the base
 * ref. All three name a path that was DELETED as readily as one that was
 * added, so a change that removes a legacy pack from a disallowed
 * location was reported as adding every file in it — and the only way to
 * make the lane pass was to keep the pack, which is the opposite of what
 * the rule asks for.
 *
 * `--changed` is what the other cases here drive, and it cannot reach
 * this: an explicit list carries no add-or-delete distinction. So these
 * use a real repository and let the script do its own git reads.
 */

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { failureOf } from "../../helpers/childFailure.js";
import { removeTempTree } from "../../helpers/tempTree.js";

const execFileP = promisify(execFile);

const CHECK_SCRIPT = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "scripts",
  "check-pack-locations.mjs",
);

/** The pack the fixture commits where the rule does not allow one. */
const MISPLACED_PACK = ".qfai/review_archive/review-20260101000000000";
const MISPLACED_FILE = `${MISPLACED_PACK}/R01_reviewer.md`;

async function git(cwd: string, ...args: string[]): Promise<void> {
  await execFileP(
    "git",
    [
      "-c",
      "user.email=qfai@example.com",
      "-c",
      "user.name=qfai",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { cwd },
  );
}

async function runLane(
  cwd: string,
  args: string[] = [],
): Promise<{ code: number; output: string }> {
  try {
    const result = await execFileP(process.execPath, [CHECK_SCRIPT, ...args], { cwd });
    return { code: 0, output: result.stdout + result.stderr };
  } catch (err: unknown) {
    return failureOf(err);
  }
}

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-pack-location-deletion-"));
  await git(root, "init", "--quiet");
  // A base commit with no pack, so `<base>...HEAD` has something to compare
  // against and the branch below can carry the pack on its own.
  await writeFile(path.join(root, "README.md"), "# fixture\n", "utf-8");
  await git(root, "add", "README.md");
  await git(root, "commit", "--quiet", "-m", "base");
  await git(root, "branch", "base");

  await mkdir(path.join(root, MISPLACED_PACK), { recursive: true });
  await writeFile(path.join(root, MISPLACED_FILE), "# a reviewer response\n", "utf-8");
});

afterEach(async () => {
  await removeTempTree(root);
});

describe("the pack-location lane reads additions, not removals", () => {
  it("still flags the pack while it is being introduced", async () => {
    // The control. Without it a lane that reported nothing at all would
    // satisfy every assertion below.
    await git(root, "add", MISPLACED_PACK);

    const result = await runLane(root);

    expect(result.code).toBe(1);
    expect(result.output).toMatch(/R-PACK-LOCATION-DRIFT/);
    expect(result.output).toContain(MISPLACED_PACK);
  });

  it("passes when the pack is being removed from the index", async () => {
    await git(root, "add", MISPLACED_PACK);
    await git(root, "commit", "--quiet", "-m", "seed the misplaced pack");
    await git(root, "rm", "-r", "--quiet", "--cached", MISPLACED_PACK);

    const result = await runLane(root);

    expect(result.output).not.toMatch(/R-PACK-LOCATION-DRIFT/);
    expect(result.code).toBe(0);
  });

  it("passes when the pack is gone from the working tree but still staged", async () => {
    // An unstaged deletion, which `git status --porcelain` reports with a
    // LEADING space before the `D`. Trimming the line first shifts that
    // code into the path column and reads the deletion as a modification.
    await git(root, "add", MISPLACED_PACK);
    await git(root, "commit", "--quiet", "-m", "seed the misplaced pack");
    await rm(path.join(root, MISPLACED_PACK), { recursive: true, force: true });

    const result = await runLane(root);

    expect(result.output).not.toMatch(/R-PACK-LOCATION-DRIFT/);
    expect(result.code).toBe(0);
  });

  it("passes when the removal is already committed on the branch", async () => {
    // The read CI relies on: after checkout the staged and working-tree
    // sets are empty, and the base diff is the only source left.
    //
    // The pack has to be in the BASE for this to test anything. Added and
    // removed on the same branch it does not appear in `base...HEAD` at all,
    // so the read had nothing to exclude and the case passed against a lane
    // with no deletion handling in it.
    await git(root, "add", MISPLACED_PACK);
    await git(root, "commit", "--quiet", "-m", "seed the misplaced pack");
    await git(root, "branch", "--force", "base", "HEAD");
    await git(root, "rm", "-r", "--quiet", MISPLACED_PACK);
    await git(root, "commit", "--quiet", "-m", "remove the misplaced pack");

    const result = await runLane(root, ["--base-ref", "base"]);

    expect(result.output).not.toMatch(/R-PACK-LOCATION-DRIFT/);
    expect(result.code).toBe(0);
  });

  it("still flags the pack across the base diff while it is present", async () => {
    // The same base-diff read, with the pack committed and NOT removed.
    // Without this the case above passes on a lane that ignores the base
    // ref entirely.
    await git(root, "add", MISPLACED_PACK);
    await git(root, "commit", "--quiet", "-m", "seed the misplaced pack");

    const result = await runLane(root, ["--base-ref", "base"]);

    expect(result.code).toBe(1);
    expect(result.output).toContain(MISPLACED_PACK);
  });
});
