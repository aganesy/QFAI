import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { runInstalledGraphCli } from "../../../src/cli/graphCli.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { graphCliResult, installedGraphHookResult } from "../../helpers/graphCli.js";

// QFAI:EX-0001-0235-15
it("attempts the relevant graph before granting fallback after incomplete failed or unready results", async () => {
  for (const outcome of ["incomplete", "failed", "not-ready"] as const) {
    const fixture = await codeAnalysisFixture();
    try {
      await writeFile(
        path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
        '{"kind":"graph-enforcement","denyExploration":true}',
      );
      const domain = outcome === "not-ready" ? "documents" : "code";
      const event = {
        tool_name: "Bash",
        tool_input: {
          command: domain === "code" ? "rg legacy packages/" : "grep -R rationale docs/",
        },
        session_id: "fallback-session",
        cwd: fixture.root,
      };
      const denied = await installedGraphHookResult(fixture.root, event);
      const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(denied.output)?.[1];
      expect(attemptId).toBeDefined();
      const run: GraphProcess = async (command, args, options) => {
        if (outcome === "failed" && args.includes("context")) {
          fixture.calls.push({ command, args });
          return { exitCode: 1, stdout: "Private native diagnostics" };
        }
        if (outcome === "incomplete" && args.at(-1) === "coverage") {
          fixture.calls.push({ command, args });
          return {
            exitCode: 0,
            stdout:
              '{"complete":false,"unsupported":["legacy.unknown"],"unreadable":[],"unparsed":[]}',
          };
        }
        return fixture.run(command, args, options);
      };
      const result = await graphCliResult(
        fixture.root,
        [
          "fallback",
          "--reason",
          "The graph cannot resolve this legacy scope.",
          "--question",
          "legacy rationale",
          "--attempt-id",
          attemptId ?? "",
        ],
        run,
      );
      expect(result.value).toMatchObject({
        status: "ready",
        permitted: true,
        domain,
        graph: { status: outcome, requestedScope: { domain, question: "legacy rationale" } },
      });
      expect(result.output).not.toContain("Private native diagnostics");
      expect(result.failures).toBe(0);
      if (domain === "code")
        expect(fixture.calls.some((call) => call.args.includes("context"))).toBe(true);
      else expect(fixture.calls).toEqual([]);
      expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
    } finally {
      await fixture.dispose();
    }
  }
});

// QFAI:EX-0001-0235-15
it("keeps the committed scope when CLI response delivery fails", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await writeFile(
      path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
      '{"kind":"graph-enforcement","denyExploration":true}',
    );
    const event = {
      tool_name: "Bash",
      tool_input: { command: "rg legacy packages/" },
      session_id: "response-session",
      cwd: fixture.root,
    };
    const denied = await installedGraphHookResult(fixture.root, event);
    const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(denied.output)?.[1];
    expect(attemptId).toBeDefined();
    await expect(
      runInstalledGraphCli(
        fixture.root,
        [
          "fallback",
          "--attempt-id",
          attemptId ?? "",
          "--question",
          "legacy callers",
          "--reason",
          "Missing legacy relationships.",
        ],
        {
          output: () => {
            throw new Error("Response delivery failed");
          },
          fail: () => {
            throw new Error("Unexpected failure output");
          },
        },
        fixture.run,
      ),
    ).rejects.toThrow("Response delivery failed");
    expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
    expect(
      (await installedGraphHookResult(fixture.root, { ...event, session_id: "another-session" }))
        .output,
    ).toContain('"permissionDecision":"deny"');
  } finally {
    await fixture.dispose();
  }
});
