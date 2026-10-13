// QFAI:AC-0001-0235-06

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { installedGraphHookResult } from "../../../helpers/graphCli.js";
import { graphAnalysisRoot } from "../../../../src/core/graph/layout.js";

describe("AC-0001-0235-06", () => {
  it("denies invalid enforcement without running analysis or changing project state", async () => {
    const project = await graphProject();
    try {
      await project.initialize();
      project.fixture.calls.length = 0;
      const configuration = path.join(project.root, ".qfai", "tools", "graph-enforcement.json");
      const original = await readFile(configuration);
      const event = { tool_name: "Bash", tool_input: { command: "rg checkout packages/" } };
      const initial = await installedGraphHookResult(project.root, event);
      expect(initial.output).toContain('"permissionDecision":"deny"');
      expect(initial.failures).toBe(0);
      expect(await readFile(configuration)).toEqual(original);
      for (const value of [
        "{broken",
        '{"kind":"graph-enforcement","denyExploration":false}',
        '{"kind":"graph-enforcement","denyExploration":true,"extra":true}',
      ]) {
        await writeFile(configuration, value);
        const result = await installedGraphHookResult(project.root, event);
        expect(result.output).toContain('"permissionDecision":"deny"');
        expect(result.failures).toBe(1);
        expect(result.errors.join(" ")).toContain("Repair");
        expect(await readFile(configuration, "utf8")).toBe(value);
      }
      await writeFile(configuration, original);
      for (const invalid of [null, { tool_name: "Bash", tool_input: { command: 42 } }]) {
        const result = await installedGraphHookResult(project.root, invalid);
        expect(result.output).toContain('"permissionDecision":"deny"');
        expect(result.failures).toBe(1);
      }
      for (const engine of ["codegraph", "graphify"] as const)
        await expect(readdir(graphAnalysisRoot(project.root, engine))).rejects.toMatchObject({
          code: "ENOENT",
        });
      expect(project.fixture.calls).toEqual([]);
      expect(await readFile(configuration)).toEqual(original);
    } finally {
      await project.dispose();
    }
  });
});
