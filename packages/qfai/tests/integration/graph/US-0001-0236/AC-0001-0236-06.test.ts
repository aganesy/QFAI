// QFAI:AC-0001-0236-06

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { graphProject } from "../../../helpers/graphProject.js";
import { ensureGraphGitignore, GRAPH_IGNORE_MARKER } from "../../../../src/core/graph/ignore.js";
import { runGraphProcess } from "../../../../src/core/graph/process.js";
import { getInitAssetsDir } from "../../../../src/shared/assets.js";

describe("AC-0001-0236-06", () => {
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
      const ignore = `${GRAPH_IGNORE_MARKER}\n# Adopter tracks generated output\n`;
      await writeFile(path.join(project.root, ".gitignore"), ignore);
      await mkdir(path.join(project.root, ".qfai", "tools", "adopter"), { recursive: true });
      await writeFile(
        path.join(project.root, ".qfai", "tools", "adopter", "graph.json"),
        "Tracked by adopter",
      );
      expect(
        (
          await runGraphProcess("git", ["add", "--", ".qfai/tools/adopter/graph.json"], {
            cwd: project.root,
          })
        ).exitCode,
      ).toBe(0);
      const conflict = await ensureGraphGitignore(project.root, runGraphProcess);
      expect(conflict.conflicts.join(" ")).toContain(".qfai/tools/");
      expect(conflict.files).toEqual([]);
      expect(await readFile(path.join(project.root, ".gitignore"), "utf8")).toBe(ignore);
      expect(
        await readFile(path.join(project.root, ".qfai", "tools", "adopter", "graph.json"), "utf8"),
      ).toBe("Tracked by adopter");
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
});
