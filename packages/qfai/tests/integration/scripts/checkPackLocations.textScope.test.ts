/**
 * The pack-location lane scopes itself by changed text, not changed bytes.
 *
 * `git diff --name-only` selects by blob identity and ignores the whitespace
 * flags, so a commit that re-normalises line endings hands the lane the whole
 * tree and it reports the location of packs nobody moved. The remedy is
 * `--numstat` with `--ignore-cr-at-eol`, narrow enough to leave an indentation
 * change in scope — indentation carries meaning in the documents a pack holds.
 *
 * The untracked case is here for a different reason. `git status` cannot take
 * a whitespace flag, so tracked edits are read as diffs and status is left
 * with the untracked half alone; these cases hold that half to the same job.
 */
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
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

let repo: string;

async function git(...args: string[]): Promise<void> {
  await execFileP("git", args, { cwd: repo });
}

/** Runs the lane against the fixture, with the base pinned to the first commit. */
async function runLane(baseRef: string): Promise<string> {
  try {
    const r = await execFileP(process.execPath, [CHECK_SCRIPT, "--base-ref", baseRef], {
      cwd: repo,
    });
    return r.stdout + r.stderr;
  } catch (err: unknown) {
    return failureOf(err).output;
  }
}

beforeEach(async () => {
  repo = await mkdtemp(path.join(os.tmpdir(), "qfai-pack-text-scope-"));
  await git("init", "-q", ".");
  await git("config", "user.email", "test@example.invalid");
  await git("config", "user.name", "test");
  // Pin the line-ending policy so the fixture's CRLF is the file's own, not
  // something the checkout rewrote.
  await git("config", "core.autocrlf", "false");
  await mkdir(path.join(repo, "review-legacy"), { recursive: true });
  await writeFile(path.join(repo, "review-legacy", "note.md"), "- a\n- b\n", "utf-8");
  await git("add", "-A");
  await git("commit", "-qm", "seed a pack the lane already knows about");
});

afterEach(async () => {
  await removeTempTree(repo);
});

describe("a rewrite that moves bytes and not text", () => {
  it("leaves the pack out of scope when only its line endings changed", async () => {
    await writeFile(path.join(repo, "review-legacy", "note.md"), "- a\r\n- b\r\n", "utf-8");

    expect(await runLane("HEAD")).not.toMatch(/R-PACK-LOCATION-DRIFT/);
  });
});

describe("a rewrite that moves text", () => {
  it("keeps an indentation-only change in scope, since indentation means something", async () => {
    await writeFile(path.join(repo, "review-legacy", "note.md"), "- a\n  - b\n", "utf-8");

    expect(await runLane("HEAD")).toMatch(/R-PACK-LOCATION-DRIFT/);
  });

  it("keeps an ordinary edit in scope", async () => {
    await writeFile(path.join(repo, "review-legacy", "note.md"), "- a\n- b\n- c\n", "utf-8");

    expect(await runLane("HEAD")).toMatch(/R-PACK-LOCATION-DRIFT/);
  });
});

describe("a pack git has never seen", () => {
  it("is reported, though nothing has staged it yet", async () => {
    await mkdir(path.join(repo, "review-fresh"), { recursive: true });
    await writeFile(path.join(repo, "review-fresh", "note.md"), "new\n", "utf-8");

    const said = await runLane("HEAD");

    expect(said).toMatch(/R-PACK-LOCATION-DRIFT/);
    expect(said).toMatch(/review-fresh/);
  });

  it("is reported from a directory below the one that is new", async () => {
    await mkdir(path.join(repo, "review-fresh", "deep"), { recursive: true });
    await writeFile(path.join(repo, "review-fresh", "deep", "note.md"), "new\n", "utf-8");

    expect(await runLane("HEAD")).toMatch(/review-fresh/);
  });
});
