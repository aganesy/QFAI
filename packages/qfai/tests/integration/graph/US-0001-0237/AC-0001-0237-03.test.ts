// QFAI:AC-0001-0237-03

import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { graphRuntimePaths } from "../../../../src/core/graph/prepare.js";

describe("AC-0001-0237-03", () => {
  it("reuses compatible runtimes and repairs only the missing component without duplicates", async () => {
    const project = await graphProject();
    try {
      await project.initialize();
      const runtimes = graphRuntimePaths(project.root);
      const retained = await readFile(runtimes.codegraph);
      project.fixture.calls.length = 0;
      await project.initialize();
      expect(
        project.fixture.calls.some(
          (call) => call.args.includes("install") || call.args[0] === "venv",
        ),
      ).toBe(false);
      await rm(runtimes.python);
      project.fixture.calls.length = 0;
      await project.initialize();
      expect(await readFile(runtimes.codegraph)).toEqual(retained);
      expect(
        project.fixture.calls.some((call) => call.args.includes("@colbymchenry/codegraph@1.6.2")),
      ).toBe(false);
      expect(project.fixture.calls.some((call) => call.args[0] === "venv")).toBe(true);
      const settings = JSON.parse(
        await readFile(path.join(project.root, ".claude", "settings.json"), "utf8"),
      );
      expect(
        settings.hooks.PreToolUse.filter((group: unknown) =>
          JSON.stringify(group).includes("graph-hook.mjs"),
        ),
      ).toHaveLength(1);
      expect(
        await readFile(path.join(project.root, ".qfai", "tools", "graph-cli.mjs"), "utf8"),
      ).toContain("runInstalledGraphCli");
      const entries = JSON.parse(
        await readFile(path.join(project.root, ".qfai", "tools", "graph-entrypoints.json"), "utf8"),
      );
      expect(Object.keys(entries.sources)).toEqual([
        "graph-cli.mjs",
        "graph-hook.mjs",
        "graph-enforcement.json",
      ]);
      await expect(readFile(path.join(project.root, ".mcp.json"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await project.dispose();
    }
  });
});
