import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { graphCliResult, installedGraphHookResult } from "../../helpers/graphCli.js";

// QFAI:EX-0001-0235-18
it("rejects invalid fallback CLI arguments without granting or querying", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await writeFile(
      path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
      '{"kind":"graph-enforcement","denyExploration":true}',
    );
    const event = {
      tool_name: "Bash",
      tool_input: { command: "rg legacy packages/" },
      session_id: "invalid-arguments-session",
      cwd: fixture.root,
    };
    const observed = await installedGraphHookResult(fixture.root, event);
    const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(observed.output)?.[1] ?? "";
    const valid = [
      "fallback",
      "--attempt-id",
      attemptId,
      "--question",
      "legacy callers",
      "--reason",
      "Graph scope is incomplete.",
    ];
    const invalid = [
      ["fallback"],
      valid.slice(0, 5),
      [...valid, "--target", "private/"],
      [...valid, "--approved"],
      ["fallback", "--attempt-id", "../permission", ...valid.slice(3)],
      ["fallback", "--attempt-id", attemptId, "--reason", "reason", "--reason", "duplicate"],
      ...["", "   ", "bad\0question", "q".repeat(16385)].map((question) => [
        ...valid.slice(0, 4),
        question,
        ...valid.slice(5),
      ]),
      ...["", "   ", "bad\0reason", "r".repeat(2049)].map((reason) => [
        ...valid.slice(0, 6),
        reason,
      ]),
    ];
    for (const args of invalid) {
      const rejected = await graphCliResult(fixture.root, args, fixture.run);
      expect(rejected.value).toMatchObject({ status: "failed", permitted: false });
      expect(rejected.failures).toBe(1);
      expect(rejected.output).toContain("fallback --attempt-id");
    }
    expect(fixture.calls).toEqual([]);
    expect((await installedGraphHookResult(fixture.root, event)).output).toContain(
      '"permissionDecision":"deny"',
    );
  } finally {
    await fixture.dispose();
  }
});
