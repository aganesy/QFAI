// QFAI:AC-0001-0236-06

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { graphProject } from "../../../helpers/graphProject.js";
import { captureStdout } from "../../../helpers/stdout.js";
import { runInit } from "../../../../src/cli/commands/init.js";
import { ensureGraphGitignore, GRAPH_IGNORE_MARKER } from "../../../../src/core/graph/ignore.js";
import { runGraphProcess } from "../../../../src/core/graph/process.js";
import { getInitAssetsDir } from "../../../../src/shared/assets.js";

describe("AC-0001-0236-06", () => {
  // QFAI:EX-0001-0237-31
  it("keeps generated state untracked and preserves adopter tracking choices without mandatory graph CI", async () => {
    const project = await graphProject();
    try {
      expect(
        (await runGraphProcess("git", ["init", "--quiet"], { cwd: project.root })).exitCode,
      ).toBe(0);
      await project.initialize();
      expect((await ensureGraphGitignore(project.root, runGraphProcess)).conflicts).toEqual([]);
      for (const generated of [
        ".qfai/tools/analysis/win32-x64/codegraph/.codegraph/codegraph.db",
        ".qfai/tools/analysis/win32-x64/graphify/graphify-out/graph.json",
        ".qfai/tools/runtimes/win32-x64/graphify/Scripts/python.exe",
        ".qfai/tools/session/socket.json",
      ])
        expect(
          (
            await runGraphProcess("git", ["check-ignore", "--no-index", "-q", generated], {
              cwd: project.root,
            })
          ).exitCode,
          generated,
        ).toBe(0);
      await writeFile(path.join(project.root, "checkout.ts"), "Tracked source.\n");
      await writeFile(
        path.join(project.root, ".qfai", "graph-processing.json"),
        '{"backend":"ollama","model":"selected"}',
      );
      expect(
        (
          await runGraphProcess(
            "git",
            ["add", "--", "checkout.ts", ".qfai/graph-processing.json"],
            { cwd: project.root },
          )
        ).exitCode,
      ).toBe(0);
      expect((await runGraphProcess("git", ["ls-files"], { cwd: project.root })).stdout).toContain(
        "graph-processing.json",
      );
      const ignoreFile = path.join(project.root, ".gitignore");
      const effectiveIgnore = await readFile(ignoreFile, "utf8");
      expect(effectiveIgnore).toContain(GRAPH_IGNORE_MARKER);
      const ignore = effectiveIgnore.replace(/^\/\.qfai\/tools\/\r?\n/m, "");
      expect(ignore).not.toBe(effectiveIgnore);
      await writeFile(ignoreFile, ignore);
      const visible = await ensureGraphGitignore(project.root, runGraphProcess);
      expect(visible.conflicts.join(" ")).toContain("Git still sees");
      expect(visible.conflicts.join(" ")).toContain(
        "Review .gitignore and explicitly exclude .qfai/tools/",
      );
      expect(visible.conflicts.join(" ")).not.toContain("Git already tracks generated output");
      const trackedPath = ".qfai/tools/adopter/graph.json";
      const trackedFile = path.join(project.root, ...trackedPath.split("/"));
      await mkdir(path.dirname(trackedFile), { recursive: true });
      await writeFile(trackedFile, "Tracked by adopter");
      expect(
        (await runGraphProcess("git", ["add", "--", trackedPath], { cwd: project.root })).exitCode,
      ).toBe(0);
      const conflict = await ensureGraphGitignore(project.root, runGraphProcess);
      expect(conflict.conflicts.join(" ")).toContain(".qfai/tools/");
      expect(conflict.files).toEqual([]);
      expect(await readFile(ignoreFile, "utf8")).toBe(ignore);
      expect(await readFile(trackedFile, "utf8")).toBe("Tracked by adopter");

      await writeFile(ignoreFile, effectiveIgnore);
      expect(
        (
          await runGraphProcess("git", ["check-ignore", "--no-index", "-q", trackedPath], {
            cwd: project.root,
          })
        ).exitCode,
      ).toBe(0);
      await writeFile(trackedFile, "Working copy edits");
      const readIndex = () =>
        runGraphProcess("git", ["ls-files", "--stage", "-z"], { cwd: project.root });
      const before = await readIndex();
      expect(before.exitCode).toBe(0);
      expect(before.stdout).toContain(trackedPath);
      const output = await captureStdout(() =>
        runInit(
          { dir: project.root, force: false, dryRun: false, yes: true },
          {},
          (command, args, options) =>
            command === "git"
              ? runGraphProcess(command, args, options)
              : project.fixture.run(command, args, options),
        ),
      );
      expect(output).toContain("Git already tracks generated output under .qfai/tools/.");
      expect(output).toContain("git ls-files -- .qfai/tools/");
      expect(output).toContain("git --literal-pathspecs rm --cached -- <path>");
      expect(output).toContain("one exact path relative to that directory");
      expect(output).toContain("quote it for your shell");
      expect(output).toContain("This keeps the files in your working tree.");
      expect(output).not.toContain("Git still sees");
      expect(await readFile(ignoreFile, "utf8")).toBe(effectiveIgnore);
      expect(await readFile(trackedFile, "utf8")).toBe("Working copy edits");
      const after = await readIndex();
      expect(after.exitCode).toBe(0);
      expect(after.stdout).toBe(before.stdout);
      expect(output).toContain("Managed graph CLI entrypoint: ready");

      for (const name of ["qfai-tests.yml", "qfai-validate.yml", "qfai-docs.yml"]) {
        const workflow: {
          jobs: Record<string, { steps?: { run?: string; uses?: string; with?: unknown }[] }>;
        } = parse(
          await readFile(
            path.join(getInitAssetsDir(), "root", ".github", "workflows", name),
            "utf8",
          ),
        );
        const steps = Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
        expect(
          steps.some((step) =>
            /graphify\s+extract|codegraph\s+(?:init|index|sync)|graph:prepare/.test(step.run ?? ""),
          ),
        ).toBe(false);
        expect(
          steps.some(
            (step) =>
              step.uses?.startsWith("actions/upload-artifact@") &&
              /graphify|codegraph|\.qfai\/tools/.test(JSON.stringify(step.with)),
          ),
        ).toBe(false);
        if (name === "qfai-tests.yml") expect(Object.keys(workflow.jobs)).toContain("verdict");
        if (name === "qfai-validate.yml")
          expect(steps.some((step) => /qfai validate/.test(step.run ?? ""))).toBe(true);
      }
    } finally {
      await project.dispose();
    }
  });

  // QFAI:EX-0001-0237-31
  it("scopes Git recovery advice to the initialized project inside a worktree", async () => {
    const repository = await graphProject();
    try {
      const projectName = "nested app";
      const projectRoot = path.join(repository.root, projectName);
      const git = (args: string[], cwd = repository.root) => runGraphProcess("git", args, { cwd });
      expect((await git(["init", "--quiet"])).exitCode).toBe(0);
      await mkdir(projectRoot);
      const initializeProject = () =>
        captureStdout(() =>
          runInit(
            { dir: projectRoot, force: false, dryRun: false, yes: true },
            {},
            (command, args, options) =>
              command === "git"
                ? runGraphProcess(command, args, options)
                : repository.fixture.run(command, args, options),
          ),
        );
      await initializeProject();
      for (const { directory, name } of [
        { directory: repository.root, name: "other.json" },
        { directory: projectRoot, name: "project.json" },
      ]) {
        const tools = path.join(directory, ".qfai", "tools");
        await mkdir(tools, { recursive: true });
        await writeFile(path.join(tools, name), name);
      }
      expect(
        (
          await git([
            "add",
            "--force",
            "--",
            ".qfai/tools/other.json",
            path.posix.join(projectName, ".qfai", "tools", "project.json"),
          ])
        ).exitCode,
      ).toBe(0);

      const listing = await git(["ls-files", "--", ".qfai/tools/"], projectRoot);
      expect(listing.exitCode).toBe(0);
      expect(listing.stdout.trim()).toBe(".qfai/tools/project.json");
      const nestedFile = path.join(projectRoot, ".qfai", "tools", "project.json");
      await writeFile(nestedFile, "Project working copy");
      const before = await git(["ls-files", "--stage", "-z"]);
      expect(before.exitCode).toBe(0);

      const output = await initializeProject();
      expect(output).toContain("Managed graph CLI entrypoint: ready");
      expect(output).toContain(
        "From the directory initialized by `qfai init`, review the indexed paths with `git ls-files -- .qfai/tools/`.",
      );
      expect(output).toContain(
        "From that same directory, use `git --literal-pathspecs rm --cached -- <path>`",
      );
      expect(output).toContain("one exact path relative to that directory");
      const after = await git(["ls-files", "--stage", "-z"]);
      expect(after.exitCode).toBe(0);
      expect(after.stdout).toBe(before.stdout);
      expect(await readFile(nestedFile, "utf8")).toBe("Project working copy");
      expect(
        await readFile(path.join(repository.root, ".qfai", "tools", "other.json"), "utf8"),
      ).toBe("other.json");
    } finally {
      await repository.dispose();
    }
  });
});
