// QFAI:AC-0001-0235-03

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { installedGraphHookResult } from "../../../helpers/graphCli.js";
import { classifyGraphExploration } from "../../../../src/core/graph/hooks.js";

describe("AC-0001-0235-03", () => {
  it("permits known reads and internal operations without exempting adjacent direct search", async () => {
    const project = await graphProject();
    try {
      await project.initialize();
      const source = path.join(project.root, "known.ts");
      const effect = path.join(project.root, "permitted-effect.txt");
      await writeFile(source, "Known source evidence.\n");
      for (const command of [
        "cat known.ts",
        "Get-Content -LiteralPath known.ts",
        "pnpm test",
        "corepack pnpm build",
        "env CI=true pnpm lint",
        'node .qfai/tools/graph-cli.mjs code "checkout"',
        "python -m graphify query rationale",
      ]) {
        const result = await installedGraphHookResult(project.root, {
          tool_name: "Bash",
          tool_input: { command },
        });
        expect(result.output, command).toBe("");
        expect(result.failures, command).toBe(0);
        expect(classifyGraphExploration({ tool: "Bash", command }).state, command).toBe(
          "configured",
        );
        if (!result.output && result.failures === 0) {
          expect(await readFile(source, "utf8")).toBe("Known source evidence.\n");
          await writeFile(effect, command);
        }
        expect(await readFile(effect, "utf8")).toBe(command);
        const denied = await installedGraphHookResult(project.root, {
          tool_name: "Bash",
          tool_input: { command: `${command}; rg checkout packages/` },
        });
        expect(denied.output).toContain('"permissionDecision":"deny"');
        expect(await readFile(effect, "utf8")).toBe(command);
      }
      const hidden = classifyGraphExploration({ tool: "Bash", command: "./hidden-search.sh" });
      expect(hidden.state).toBe("outside-boundary");
      expect(hidden.message).toContain("not verified");
    } finally {
      await project.dispose();
    }
  });
});
