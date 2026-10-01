/**
 * Acceptance of three `qfai init` behaviours at the layer that runs the command:
 * a clone of a fresh project is still the untouched seed, the managed
 * `.gitignore` block does not repeat a line the project has, and a symlink that
 * cannot be created stops the run before anything is written.
 */

import { execFile as execFileCb } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateStorySteeringPlaceholders } from "../../src/core/validators/assistantAssets.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const execFile = promisify(execFileCb);
const roots: string[] = [];

async function sandbox(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-init-acceptance-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

describe("init acceptance: seed, managed block and symlink probe", () => {
  // QFAI:AC-0001-0038-06
  it("reads a checkout without the empty contract directories as the untouched seed", async () => {
    const root = await sandbox();
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    for (const kind of ["api", "cli", "db", "ui"]) {
      await rm(path.join(root, ".qfai", "spec", "03_contract", kind), { recursive: true });
    }

    expect(await validateStorySteeringPlaceholders(root, defaultConfig)).toEqual([]);

    const objective = path.join(root, ".qfai", "spec", "01_policy", "objective.md");
    await writeFile(objective, `${await readFile(objective, "utf-8")}\nProject goal.\n`, "utf-8");
    expect(
      (await validateStorySteeringPlaceholders(root, defaultConfig)).map((found) => found.code),
    ).toEqual(["QFAI-ASSETS-003"]);
  });

  // QFAI:AC-0001-0033-04
  it("leaves the root tmp ignore to the project's own line", async () => {
    const root = await sandbox();
    await writeFile(path.join(root, ".gitignore"), "# Temporary files\n/tmp/\n", "utf-8");

    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    const first = await readFile(path.join(root, ".gitignore"), "utf-8");
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

    expect(first.split("\n").filter((line) => line === "/tmp/")).toHaveLength(1);
    expect(await readFile(path.join(root, ".gitignore"), "utf-8")).toBe(first);
  });

  // QFAI:AC-0001-0028-03
  it("stops before writing a file when Windows refuses the symlink", async () => {
    const root = await sandbox();

    await expect(
      runInit(
        { dir: root, force: false, dryRun: false, yes: true },
        {
          platform: "win32",
          createSymlink: () =>
            Promise.reject(Object.assign(new Error("not permitted"), { code: "EPERM" })),
        },
      ),
    ).rejects.toThrow(/Developer Mode has to be enabled/);

    expect(await readdir(root)).toEqual([]);
  });

  // QFAI:AC-0001-0028-04
  it("says the config file is shared when init runs in a linked worktree", async () => {
    const root = await sandbox();
    const main = path.join(root, "main");
    await mkdir(main, { recursive: true });
    await execFile("git", ["init"], { cwd: main });
    await execFile("git", ["config", "--local", "core.symlinks", "false"], { cwd: main });
    await execFile(
      "git",
      [
        "-c",
        "user.email=qfai@example.com",
        "-c",
        "user.name=qfai",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "--allow-empty",
        "-m",
        "root",
      ],
      { cwd: main },
    );
    const linked = path.join(root, "linked");
    await execFile("git", ["worktree", "add", linked], { cwd: main });

    const inLinked = await captureStdout(() =>
      runInit({ dir: linked, force: false, dryRun: true, yes: true }),
    );
    const inMain = await captureStdout(() =>
      runInit({ dir: main, force: false, dryRun: true, yes: true }),
    );

    expect(inLinked).toContain("shared by every worktree of this repository");
    expect(inMain).not.toContain("shared by every worktree");
  });
});
