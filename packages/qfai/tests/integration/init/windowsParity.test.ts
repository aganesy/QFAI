import { legacyInitArguments } from "../../helpers/legacyInitArguments.js";
/**
 * Integration: init and upgrade give the same result through the built CLI under a root whose
 * name contains a space as they do in process.
 */
// QFAI:AC-0001-0196-06
import { execFile as execFileCallback, spawnSync } from "node:child_process";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  rm,
  readdir,
  readFile,
  readlink,
  realpath,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { HOST_SKILL_DIRS, initQuietly, modeLines, withEmptyRepo } from "./upgradeStates.js";
import { assertBuiltCliFresh } from "../../helpers/builtCli.js";
import { validateIntegrationSurface } from "../../../src/core/validators/integrationSurface.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { coldValidationCli } from "../../helpers/validationInputManifest.js";
import {
  runControlledProfile,
  removeBaselineSource,
  retainedProfileFailure,
  saveProfileArtifact,
  type ControlledProfileResult,
} from "../../helpers/controlledProfile.js";
import { DECLARED_TEST_TIMEOUT } from "../../../vitest.knobs.js";

const CLI = path.resolve(import.meta.dirname, "../../../dist/cli/index.mjs");
assertBuiltCliFresh(CLI);
const execFile = promisify(execFileCallback);

type RunView = { modeLines: string[]; wrappers: string[] };

/** What a run must give alike in and out of process: the mode line and the wrapper targets. */
async function viewOf(root: string, output: string): Promise<RunView> {
  const realRoot = await realpath(root);
  const wrappers: string[] = [];
  for (const host of HOST_SKILL_DIRS) {
    const dir = path.join(root, ...host.split("/"));
    for (const name of await readdir(dir).catch(() => [])) {
      const target = path.relative(realRoot, await realpath(path.join(dir, name)));
      wrappers.push(`${host}/${name} -> ${target.split(path.sep).join("/")}`);
    }
  }
  return { modeLines: modeLines(output), wrappers };
}

// QFAI:EX-0001-0196-17
describe("windows parity", () => {
  it("Built CLI init and upgrade under a root with a space", async () => {
    const spawned: RunView[] = [];
    await withEmptyRepo(async (root) => {
      for (let run = 0; run < 2; run += 1) {
        const result = spawnSync(process.execPath, legacyInitArguments(CLI, ["init", "--yes"]), {
          cwd: root,
          encoding: "utf-8",
        });
        expect(result.status, result.stderr).toBe(0);
        spawned.push(await viewOf(root, result.stdout));
      }
    });
    const inProcess: RunView[] = [];
    await withEmptyRepo(async (root) => {
      for (let run = 0; run < 2; run += 1) {
        inProcess.push(await viewOf(root, await initQuietly(root)));
      }
    });

    expect(spawned).toEqual(inProcess);
    expect(spawned.map((view) => view.modeLines)).toEqual([
      ["Workflow mode: active"],
      ["Workflow mode: active"],
    ]);
  });
});

describe("native linked worktree skill wrappers", () => {
  it("repairs the tracked skill roster after the canonical worktree links are normalized", async () => {
    await withEmptyRepo(async (root) => {
      const primary = path.join(root, "primary checkout");
      const linked = path.join(root, "linked checkout");
      const assistant = path.join(".qfai", "assistant");
      const assets = path.join("packages", "qfai", "assets", "init", assistant);
      const layers = ["agent", "prompt", "rule", "skill", "step"];
      const skills = [
        "qfai-configure",
        "qfai-discussion",
        "qfai-grill",
        "qfai-grilling",
        "qfai-implement",
        "qfai-maintain",
        "qfai-migration-v1-to-v2",
        "qfai-prototyping",
        "qfai-run",
        "qfai-sdd",
        "qfai-triage",
        "qfai-verify",
        "web-research",
      ];
      const wrappers = HOST_SKILL_DIRS.flatMap((host) =>
        skills.map((skill) => path.join(...host.split("/"), skill)),
      );
      const canonicals = layers.map((layer) => path.join(assistant, layer));
      const targetFor = (from: string, to: string) =>
        path.relative(path.dirname(from), to).split(path.sep).join("/");
      const snapshot = async (checkout: string) => {
        const entries: Record<string, string> = {};
        const visit = async (relative: string): Promise<void> => {
          for (const name of (await readdir(path.join(checkout, relative))).sort()) {
            if (relative === "" && name === ".git") continue;
            const child = path.join(relative, name);
            const absolute = path.join(checkout, child);
            const own = await lstat(absolute);
            if (own.isSymbolicLink()) {
              entries[child] = JSON.stringify({
                target: await readlink(absolute),
                dev: own.dev,
                ino: own.ino,
                mode: own.mode,
                birthtimeMs: own.birthtimeMs,
                ctimeMs: own.ctimeMs,
                mtimeMs: own.mtimeMs,
              });
            } else if (own.isDirectory()) {
              entries[child] = "directory";
              await visit(child);
            } else {
              entries[child] = (await readFile(absolute)).toString("base64");
            }
          }
        };
        await visit("");
        return entries;
      };
      await mkdir(path.join(primary, assistant), { recursive: true });
      await cp(path.join(getInitAssetsDir(), assistant), path.join(primary, assets), {
        recursive: true,
      });
      expect((await readdir(path.join(primary, assets, "skill"))).sort()).toEqual(skills);
      expect((await readdir(path.join(primary, assets))).sort()).toEqual(layers);
      await mkdir(path.join(primary, ".claude", "skills"), { recursive: true });
      for (const layer of layers) {
        const canonical = path.join(assistant, layer);
        await symlink(
          targetFor(canonical, path.join(assets, layer)),
          path.join(primary, canonical),
          "dir",
        );
      }
      for (const skill of skills) {
        const wrapper = path.join(".claude", "skills", skill);
        await symlink(
          targetFor(wrapper, path.join(assistant, "skill", skill)),
          path.join(primary, wrapper),
          "dir",
        );
      }
      const foreignSkill = path.join(".claude", "skills", "conflict-resolve", "SKILL.md");
      await mkdir(path.dirname(path.join(primary, foreignSkill)), { recursive: true });
      await writeFile(path.join(primary, foreignSkill), "project-owned skill bytes\n");
      await writeFile(path.join(primary, "sentinel.txt"), "project-owned bytes\n");
      const normalizer = path.join("scripts", "link-assistant-tree.mjs");
      await mkdir(path.join(primary, "scripts"));
      await cp(
        path.resolve(import.meta.dirname, "../../../../..", normalizer),
        path.join(primary, normalizer),
      );
      const git = (args: string[], cwd = primary) => execFile("git", args, { cwd });
      await git(["init", "--initial-branch=main"]);
      await git(["config", "--local", "core.symlinks", "true"]);
      await git(["config", "--local", "core.autocrlf", "false"]);
      const primaryAssets = await snapshot(path.join(primary, assets));
      await execFile(process.execPath, legacyInitArguments(CLI, ["init", "--yes"]), {
        cwd: primary,
      });
      expect(await validateIntegrationSurface(primary)).toEqual([]);
      expect(await snapshot(path.join(primary, assets))).toEqual(primaryAssets);
      const claudeSkills = await readdir(path.join(primary, ".claude", "skills"), {
        withFileTypes: true,
      });
      const claudeLinks = claudeSkills.filter((entry) => entry.isSymbolicLink());
      expect(claudeLinks).toHaveLength(13);
      expect(claudeLinks.map((entry) => entry.name).sort()).toEqual(skills);
      await git(["add", "--force", "--all"]);
      await git([
        "-c",
        "user.email=qfai@example.test",
        "-c",
        "user.name=qfai",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        "tracked assistant links",
      ]);
      const primaryBefore = await snapshot(primary);
      await git(["worktree", "add", "--detach", linked, "HEAD"]);
      expect((await lstat(path.join(linked, assistant))).isSymbolicLink()).toBe(false);
      const checkoutBefore = await snapshot(linked);
      for (const canonical of canonicals) {
        expect((await lstat(path.join(linked, canonical))).isSymbolicLink()).toBe(true);
      }
      await execFile(process.execPath, [path.join(linked, normalizer)], { cwd: linked });
      await execFile(process.execPath, [path.join(linked, normalizer), "--check"], { cwd: linked });
      const normalized = await snapshot(linked);
      for (const canonical of canonicals) {
        expect((await lstat(path.join(linked, canonical))).isSymbolicLink()).toBe(true);
        expect((await stat(path.join(linked, canonical))).isDirectory()).toBe(true);
        expect(path.normalize(await readlink(path.join(linked, canonical)))).toBe(
          path.normalize(targetFor(canonical, path.join(assets, path.basename(canonical)))),
        );
      }
      const unfollowable: string[] = [];
      for (const wrapper of wrappers) {
        expect(normalized[wrapper]).toBe(checkoutBefore[wrapper]);
        expect((await lstat(path.join(linked, wrapper))).isSymbolicLink()).toBe(true);
        try {
          expect((await stat(path.join(linked, wrapper))).isDirectory()).toBe(true);
        } catch (error) {
          expect(process.platform).toBe("win32");
          expect(error).toMatchObject({ code: "EPERM" });
          unfollowable.push(wrapper.split(path.sep).join("/"));
        }
      }
      const findings = await validateIntegrationSurface(linked);
      expect(findings).toHaveLength(unfollowable.length === 0 ? 0 : 1);
      expect(findings.map((issue) => [issue.code, issue.severity])).toEqual(
        unfollowable.length === 0 ? [] : [["QFAI-LINK-001", "warning"]],
      );
      expect(findings.flatMap((issue) => issue.refs ?? []).sort()).toEqual(unfollowable.sort());
      const packagedBefore = await snapshot(path.join(linked, assets));

      await execFile(process.execPath, legacyInitArguments(CLI, ["init", "--yes"]), {
        cwd: linked,
      });

      expect(await validateIntegrationSurface(linked)).toEqual([]);
      expect((await lstat(path.join(linked, assistant))).isSymbolicLink()).toBe(false);
      for (const wrapper of wrappers) {
        expect((await lstat(path.join(linked, wrapper))).isSymbolicLink()).toBe(true);
        expect((await stat(path.join(linked, wrapper))).isDirectory()).toBe(true);
        expect(path.normalize(await readlink(path.join(linked, wrapper)))).toBe(
          path.normalize(targetFor(wrapper, path.join(assistant, "skill", path.basename(wrapper)))),
        );
        expect(await readFile(path.join(linked, wrapper, "SKILL.md"))).toEqual(
          await readFile(path.join(primary, assets, "skill", path.basename(wrapper), "SKILL.md")),
        );
      }
      const initialized = await snapshot(linked);
      for (const canonical of canonicals) {
        expect(initialized[canonical]).toBe(normalized[canonical]);
      }
      expect(await snapshot(path.join(linked, assets))).toEqual(packagedBefore);
      const statusBefore = (
        await git(["status", "--porcelain=v1", "--untracked-files=all"], linked)
      ).stdout;
      await execFile(process.execPath, legacyInitArguments(CLI, ["init", "--yes"]), {
        cwd: linked,
      });
      expect(await snapshot(linked)).toEqual(initialized);
      expect(
        (await git(["status", "--porcelain=v1", "--untracked-files=all"], linked)).stdout,
      ).toBe(statusBefore);
      expect(await validateIntegrationSurface(linked)).toEqual([]);
      expect(await snapshot(primary)).toEqual(primaryBefore);
      expect((await git(["status", "--porcelain=v1", "--untracked-files=all"])).stdout).toBe("");
      for (const checkout of [primary, linked]) {
        expect(await readFile(path.join(checkout, "sentinel.txt"), "utf8")).toBe(
          "project-owned bytes\n",
        );
        expect(await readFile(path.join(checkout, foreignSkill), "utf8")).toBe(
          "project-owned skill bytes\n",
        );
      }
    });
  });
});

async function writeProfileFixture(root: string, program: string): Promise<string> {
  const file = path.join(root, "profile fixture.cjs");
  await writeFile(file, program, "utf8");
  return file;
}

async function waitForProfileFixture(file: string): Promise<string> {
  const deadline = Date.now() + 4_000;
  while (Date.now() < deadline) {
    try {
      return await readFile(file, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error(`The profiling fixture did not become ready: ${file}`);
}

describe("validation profiling child failures", () => {
  it("keeps a completed nonzero exit and both partial output streams", async () => {
    await withEmptyRepo(async (root) => {
      const cli = await writeProfileFixture(
        root,
        'process.stdout.write("partial output\\n"); process.stderr.write("validation failed\\n"); process.exitCode = 7;',
      );
      const result = await coldValidationCli(cli, root, 5_000);
      expect(result.code).toBe(7);
      expect(result.signal).toBeNull();
      expect(result.stdout).toBe("partial output\n");
      expect(result.stderr).toBe("validation failed\n");
    });
  });

  it("terminates the owned descendant as well as a timed-out profiling child", async () => {
    await withEmptyRepo(async (root) => {
      const token = randomUUID();
      const ready = path.join(root, "owned descendant.json");
      const marker = path.join(root, "descendant continued.txt");
      const descendant = `const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(ready)}, JSON.stringify({ pid: process.pid, token: ${JSON.stringify(token)} })); process.on("SIGTERM", () => {}); setInterval(() => fs.writeFileSync(${JSON.stringify(marker)}, "still running"), 100);`;
      const cli = await writeProfileFixture(
        root,
        `require("node:child_process").spawn(process.execPath, ["-e", ${JSON.stringify(descendant)}], { stdio: "ignore" }); process.stdout.write(${JSON.stringify("before timeout\n")}); setInterval(() => {}, 1000);`,
      );
      let owned: { pid: number; token: string } | undefined;
      const running = coldValidationCli(cli, root, 5_000);
      let failure: unknown;
      let failed = false;
      let cleanupFailure: unknown;
      let cleanupFailed = false;
      try {
        owned = JSON.parse(await waitForProfileFixture(ready)) as { pid: number; token: string };
        expect(owned.token).toBe(token);
        const result = await running;
        expect(result.code).toBeNull();
        expect(result.stdout).toContain("before timeout");
        await rm(marker, { force: true });
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        await expect(readFile(marker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      } catch (error: unknown) {
        failure = error;
        failed = true;
      } finally {
        await running;
        if (owned !== undefined && owned.token === token) {
          try {
            process.kill(owned.pid, "SIGKILL");
          } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
              cleanupFailure = error;
              cleanupFailed = true;
            }
          }
        }
        await rm(marker, { force: true });
      }
      if (failed && cleanupFailed)
        throw new AggregateError(
          [failure, cleanupFailure],
          "Profiling and owned fixture cleanup both failed",
        );
      if (cleanupFailed) throw cleanupFailure;
      if (failed) throw failure;
    });
  });
});

describe("full validation profiling", () => {
  it("bounds real full validation and retains its input, timing and failure evidence", async () => {
    const control = await mkdtemp(path.join(os.tmpdir(), "qfai-validation-profile-"));
    const checkpoint = path.join(control, "checkpoint.json");
    const packageRoot = path.resolve(import.meta.dirname, "../../..");
    const runner = path.join(
      path.dirname(createRequire(import.meta.url).resolve("vitest/package.json")),
      "vitest.mjs",
    );
    const config = path.resolve(
      import.meta.dirname,
      "../../helpers/validationProfileWorker.config.ts",
    );
    let result: ControlledProfileResult | undefined;
    let cleanupFailure: unknown;
    let workerFailure: unknown;
    let workerFailed = false;
    try {
      // Leave time within the inherited budget for owned-tree cleanup and artifact recording.
      result = await runControlledProfile(process.execPath, [runner, "run", "--config", config], {
        cwd: packageRoot,
        env: { ...process.env, QFAI_VALIDATION_PROFILE_CHECKPOINT: checkpoint },
        timeoutMs: DECLARED_TEST_TIMEOUT - 15_000,
      });
    } catch (error: unknown) {
      workerFailure = error;
      workerFailed = true;
    } finally {
      // The parent removes only its sidecar after the owned worker tree has closed.
      try {
        await removeBaselineSource(control, result);
      } catch (error: unknown) {
        cleanupFailure = error;
        result?.terminationErrors.push(JSON.stringify(retainedProfileFailure(error)));
      }
      if (result !== undefined) {
        const file = await saveProfileArtifact(
          process.env.QFAI_VALIDATION_PROFILE_ARTIFACT_DIR ?? control,
          result,
          checkpoint,
          cleanupFailure,
        );
        process.stdout.write(`Validation profile artifact: ${file}\n`);
      }
    }
    if (workerFailed && cleanupFailure !== undefined)
      throw new AggregateError(
        [workerFailure, cleanupFailure],
        "Worker and sidecar cleanup both failed",
      );
    if (workerFailed) throw workerFailure;
    if (result === undefined)
      throw new Error("The profiling worker did not return a process result");
    expect(result.closed, result.stderr).toBe(true);
    expect(result.timedOut, result.stderr).toBe(false);
    expect(result.error, result.stderr).toBeNull();
    expect(result.terminationErrors, result.stderr).toEqual([]);
    expect(result.signal, result.stderr).toBeNull();
    expect(result.code, result.stderr).toBe(0);
    expect(JSON.parse(await readFile(checkpoint, "utf8")) as unknown).toMatchObject({
      phase: "complete",
      spiesRestored: true,
    });
  });
});
