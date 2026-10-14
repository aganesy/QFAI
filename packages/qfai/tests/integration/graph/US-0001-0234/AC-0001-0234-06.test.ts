// QFAI:AC-0001-0234-06

import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { codeAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult, installedGraphHookResult } from "../../../helpers/graphCli.js";

describe("AC-0001-0234-06", () => {
  it("reports missing analysis and permits scoped search after the AI records its unresolved reason", async () => {
    const fixture = await codeAnalysisFixture();
    const event = {
      tool_name: "Bash",
      tool_input: { command: "rg checkout packages/" },
      cwd: fixture.root,
      session_id: "acceptance-session",
    };
    try {
      await writeFile(
        path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
        '{"kind":"graph-enforcement","denyExploration":true}',
      );
      await rm(path.join(fixture.analysis, ".codegraph", "codegraph.db"));
      const denied = await installedGraphHookResult(fixture.root, event);
      expect(denied.failures).toBe(0);
      expect(denied.output).toContain("node .qfai/tools/graph-cli.mjs code");
      const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(denied.output)?.[1];
      expect(attemptId).toBeDefined();
      const answer = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
      expect(answer.value).toMatchObject({ status: "failed" });
      expect(answer.output).toContain("Repair");
      expect(
        fixture.calls.some(
          (call) =>
            call.args.includes("rg") || call.args.includes("grep") || call.args.includes("context"),
        ),
      ).toBe(false);
      const permitted = await graphCliResult(
        fixture.root,
        [
          "fallback",
          "--attempt-id",
          attemptId ?? "",
          "--question",
          "unresolved checkout callers",
          "--reason",
          "The missing index cannot answer the caller question; inspect the observed source scope.",
        ],
        fixture.run,
      );
      expect(permitted.value).toMatchObject({
        permitted: true,
        scope: { session: "acceptance-session", target: "packages/" },
      });
      expect(
        fixture.calls.filter((call) =>
          call.args.some((arg) => arg.endsWith("codegraph-native.mjs")),
        ).length,
      ).toBeGreaterThanOrEqual(2);
      expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
      expect(
        (await installedGraphHookResult(fixture.root, { ...event, session_id: "other-session" }))
          .output,
      ).toContain("deny");
    } finally {
      await fixture.dispose();
    }
  });
});
