// QFAI:AC-0001-0235-04

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { documentAnalysisFixture } from "../../../helpers/graphAnalysis.js";
import { graphCliResult, installedGraphHookResult } from "../../../helpers/graphCli.js";
import { prepareDocumentAnalysis } from "../../../../src/core/graph/documents.js";

describe("AC-0001-0235-04", () => {
  it("permits only an observed matching search before expiry and keeps external document authorization separate", async () => {
    const fixture = await documentAnalysisFixture();
    let now = 1000;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
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
      const denied = await installedGraphHookResult(fixture.root, event);
      const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(denied.output)?.[1];
      expect(attemptId).toBeDefined();
      expect(fixture.calls).toEqual([]);
      const permitted = await graphCliResult(
        fixture.root,
        [
          "fallback",
          "--attempt-id",
          attemptId ?? "",
          "--question",
          "unresolved legacy caller",
          "--reason",
          "The graph cannot identify the unresolved legacy caller.",
        ],
        fixture.run,
      );
      expect(permitted.value).toMatchObject({
        permitted: true,
        scope: {
          target: "packages/",
          operation: "rg",
          worktree: fixture.root,
          session: "acceptance-session",
          expiresAt: 61000,
        },
      });
      expect(fixture.calls.some((call) => call.args.includes("context"))).toBe(true);
      expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
      for (const changed of [
        { ...event, session_id: "other-session" },
        { ...event, cwd: path.join(fixture.root, "other-worktree") },
        { ...event, tool_input: { command: "rg checkout docs/" } },
        { ...event, tool_input: { command: "grep -R checkout packages/" } },
      ])
        expect((await installedGraphHookResult(fixture.root, changed)).output).toContain("deny");
      await writeFile(
        path.join(fixture.root, ".qfai", "graph-processing.json"),
        JSON.stringify({
          backend: "openai",
          model: "selected-model",
          endpoint: "https://selected.example.invalid/v1",
          scope: ["rationale.md"],
        }),
      );
      const documents = await prepareDocumentAnalysis(fixture.root, fixture.run);
      expect(documents.status).toBe("not-ready");
      expect(documents.recovery).toContain("human authorization");
      now = 60999;
      expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
      now = 61000;
      const expired = await installedGraphHookResult(fixture.root, event);
      expect(expired.output).toContain("deny");
      expect(expired.failures).toBe(0);
    } finally {
      clock.mockRestore();
      await fixture.dispose();
    }
  });
});
