// QFAI:AC-0001-0233-01

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { graphRuntimePaths } from "../../../../src/core/graph/prepare.js";

describe("AC-0001-0233-01", () => {
  it("prepares both pinned local runtimes for fresh and upgraded adopters", async () => {
    for (const upgraded of [false, true]) {
      const project = await graphProject();
      try {
        if (upgraded) {
          await mkdir(path.join(project.root, ".qfai"));
          await writeFile(path.join(project.root, ".qfai", "project-notes.md"), "Keep notes.\n");
        }
        const output = await project.initialize();
        const runtimes = graphRuntimePaths(project.root);
        await expect(access(runtimes.codegraph)).resolves.toBeUndefined();
        await expect(access(runtimes.python)).resolves.toBeUndefined();
        expect(output).toContain("CodeGraph: installed");
        expect(output).toContain("Graphify: installed");
        expect(output).toContain("documents-not-ready");
        expect(project.fixture.calls.flatMap((call) => call.args)).toContain(
          "@colbymchenry/codegraph@1.6.2",
        );
        expect(project.fixture.calls.flatMap((call) => call.args)).toContain(
          "graphifyy[ollama]==0.9.86",
        );
        expect(project.fixture.calls.flatMap((call) => call.args).join(" ")).not.toContain("[mcp");
        expect(
          await readFile(path.join(project.root, ".qfai", "tools", "graph-cli.mjs"), "utf8"),
        ).toContain("runInstalledGraphCli");
        await expect(access(path.join(project.root, ".mcp.json"))).rejects.toMatchObject({
          code: "ENOENT",
        });
        expect(project.fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
        if (upgraded)
          expect(await readFile(path.join(project.root, ".qfai", "project-notes.md"), "utf8")).toBe(
            "Keep notes.\n",
          );
      } finally {
        await project.dispose();
      }
    }
  });
});
