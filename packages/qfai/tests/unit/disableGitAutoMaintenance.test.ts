// Proves two separate things about the setup file: that it computes the right
// environment, and that it is actually wired into the runner.
//
// The second is what the pure-function rows cannot reach. `appendGitConfig` could
// be perfect and `SETUP_FILES` not carry the file, and every row about the function
// would still pass while the race stayed open.
//
// This file therefore never imports the setup module. A setup file's whole effect is
// a side effect at import, so importing it here would apply that effect and the
// wiring rows would pass whether or not the runner had loaded it. The function comes
// from the helper the setup file also imports.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { appendGitConfig } from "../helpers/gitConfigEnv.js";
import { removeTempTree } from "../helpers/tempTree.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) await removeTempTree(dir);
  }
});

/** A repository shaped like the fixtures the suite builds: real, committed, disposable. */
async function newRepo(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-git-maintenance-"));
  tempDirs.push(root);
  const git = (...args: string[]): void => {
    execFileSync("git", args, { cwd: root, stdio: ["ignore", "ignore", "ignore"] });
  };
  git("init", "--initial-branch=base");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  git("commit", "--allow-empty", "-m", "seed");
  return root;
}

/**
 * Commits in `root` under `env` and returns what git traced.
 *
 * `spawnSync` rather than `execFileSync`: `GIT_TRACE` writes to stderr, and only the
 * former hands that back.
 */
function tracedCommit(root: string, env: NodeJS.ProcessEnv, message: string): string {
  const result = spawnSync("git", ["commit", "--allow-empty", "-q", "-m", message], {
    cwd: root,
    env: { ...env, GIT_TRACE: "1" },
    encoding: "utf-8",
  });
  if (result.error !== undefined) throw result.error;
  expect(result.status, `git commit exited ${String(result.status)}: ${result.stderr}`).toBe(0);
  return result.stderr;
}

describe("appendGitConfig", () => {
  it("declares an entry git will read, in an environment carrying none", () => {
    const env: NodeJS.ProcessEnv = {};

    appendGitConfig(env, [["maintenance.auto", "false"]]);

    expect(env).toMatchObject({
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "maintenance.auto",
      GIT_CONFIG_VALUE_0: "false",
    });
  });

  it("adds after entries already declared instead of overwriting them", () => {
    const env: NodeJS.ProcessEnv = {
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "user.name",
      GIT_CONFIG_VALUE_0: "someone",
    };

    appendGitConfig(env, [["maintenance.auto", "false"]]);

    // The pre-existing entry survives at its own index, and the count covers both.
    expect(env).toMatchObject({
      GIT_CONFIG_COUNT: "2",
      GIT_CONFIG_KEY_0: "user.name",
      GIT_CONFIG_VALUE_0: "someone",
      GIT_CONFIG_KEY_1: "maintenance.auto",
      GIT_CONFIG_VALUE_1: "false",
    });
  });

  it("writes every entry it is given, at consecutive indices", () => {
    const env: NodeJS.ProcessEnv = {};

    appendGitConfig(env, [
      ["maintenance.auto", "false"],
      ["gc.auto", "0"],
    ]);

    expect(env).toMatchObject({
      GIT_CONFIG_COUNT: "2",
      GIT_CONFIG_KEY_0: "maintenance.auto",
      GIT_CONFIG_KEY_1: "gc.auto",
    });
  });

  it("treats a count that is not a non-negative integer as absent", () => {
    // git rejects such a value outright, so there are no entries behind it to keep.
    // Starting at 0 leaves a configuration git can use; preserving it would not.
    for (const declared of ["", " ", "two", "-1", "1.5", "0x2"]) {
      const env: NodeJS.ProcessEnv = { GIT_CONFIG_COUNT: declared };

      appendGitConfig(env, [["maintenance.auto", "false"]]);

      expect(env.GIT_CONFIG_COUNT, `count ${JSON.stringify(declared)}`).toBe("1");
      expect(env.GIT_CONFIG_KEY_0).toBe("maintenance.auto");
    }
  });
});

describe("the setup file, as the runner loads it", () => {
  it("makes a spawned git resolve maintenance.auto to false", () => {
    // The one check the rows above cannot make about themselves: this reads the
    // configuration back out of a real git started from THIS process, which is only
    // false if the setup file ran here.
    const resolved = execFileSync("git", ["config", "--get", "maintenance.auto"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    expect(
      resolved.trim(),
      "the setup file is not in effect here; `SETUP_FILES` is what wires it",
    ).toBe("false");
  });

  it("stops a commit starting the background maintenance that writes into .git/objects/pack", async () => {
    const root = await newRepo();

    // The control runs the same commit with the entries switched off by count alone,
    // which is index-independent. Without it a green row could mean the trace stopped
    // naming maintenance rather than that the commit stopped starting it.
    const control = tracedCommit(root, { ...process.env, GIT_CONFIG_COUNT: "0" }, "control");
    expect(control, "the probe itself is broken if maintenance is absent here").toContain(
      "maintenance run",
    );

    const suppressed = tracedCommit(root, process.env, "suppressed");

    expect(suppressed).not.toContain("maintenance run");
    // Tracing is still on, so the absence above is the commit's behaviour, not a silent trace.
    expect(suppressed).toContain("git.c");
  });
});
