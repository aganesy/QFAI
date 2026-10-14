// QFAI:AC-0001-0235-01

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { installedGraphHookResult } from "../../../helpers/graphCli.js";

describe("AC-0001-0235-01", () => {
  it("prevents controlled pre-tool search effects and directs code and document events to their graph", async () => {
    const project = await graphProject();
    try {
      await project.initialize();
      const sentinel = path.join(project.root, "search-effect.txt");
      for (const [event, operation] of [
        [
          { tool_name: "Bash", tool_input: { command: "rg checkout packages/" } },
          "node .qfai/tools/graph-cli.mjs code",
        ],
        [
          { tool_name: "Bash", tool_input: { command: "grep -R policy .qfai/spec" } },
          "node .qfai/tools/graph-cli.mjs documents",
        ],
        [
          { tool_name: "Grep", tool_input: { pattern: "checkout", path: "packages/" } },
          "node .qfai/tools/graph-cli.mjs code",
        ],
      ] as const) {
        const result = await installedGraphHookResult(project.root, event);
        if (!result.output && result.failures === 0)
          await writeFile(sentinel, "Search executed.\n");
        await expect(readFile(sentinel)).rejects.toMatchObject({ code: "ENOENT" });
        expect(result.output).toContain('"permissionDecision":"deny"');
        expect(result.output).toContain(operation);
        expect(result.errors).toEqual([]);
        expect(result.failures).toBe(0);
      }
    } finally {
      await project.dispose();
    }
  });
});
