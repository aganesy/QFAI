// QFAI:BF-0001

import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { runInit } from "../../src/cli/commands/init.js";
import { readKnownGraphFile } from "../../src/core/graph/query.js";
import { graphReuseEnvironment } from "../../src/core/graph/reuse.js";
import { completedDocumentSnapshotFixture } from "../helpers/graphReuse.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";
import { graphCliResult, installedGraphHookResult } from "../helpers/graphCli.js";
import { captureStdout } from "../helpers/stdout.js";

it("initializes managed graph tools and completes graph-first exploration with an AI-decided fallback", async () => {
  const fixture = await completedDocumentSnapshotFixture(graphReuseEnvironment());
  expect(fixture.preparedReuse).toBe(
    process.platform === "win32" && process.arch === "x64" ? "published" : "unavailable",
  );
  const runtime = graphProcessFixture();
  let now = 1000;
  const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
  try {
    const summary = await captureStdout(() =>
      runInit({ dir: fixture.root, force: false, dryRun: false, yes: true }, {}, runtime.run),
    );
    expect(summary).toContain("Graph tools");
    expect(summary).toContain("CodeGraph: installed");
    expect(summary).toContain("Graphify: installed");
    expect(summary).toContain("Configuration alone does not verify search protection");
    expect(
      await readFile(path.join(fixture.root, ".qfai", "tools", "graph-cli.mjs"), "utf8"),
    ).toContain("runInstalledGraphCli");
    await expect(readFile(path.join(fixture.root, ".mcp.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      readFile(path.join(fixture.root, ".qfai", "tools", "graph-manager.mjs")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const event = {
      tool_name: "Bash",
      tool_input: { command: "rg checkout packages/" },
      cwd: fixture.root,
      session_id: "flow-session",
    };
    const denied = await installedGraphHookResult(fixture.root, event);
    expect(denied.output).toContain("node .qfai/tools/graph-cli.mjs code");
    expect(denied.output).toContain('"permissionDecision":"deny"');
    const code = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
    expect(code.output).toContain("checkout.ts");
    expect(code.value).toMatchObject({ engine: "codegraph", status: "answered" });
    expect(fixture.observed.some((args) => args.includes("query"))).toBe(false);
    expect(await readKnownGraphFile(fixture.root, "checkout.ts")).toContain("function checkout");
    const documents = await graphCliResult(
      fixture.root,
      ["documents", "Which requirement explains checkout?"],
      fixture.run,
    );
    expect(documents.output).toContain("rationale.md");
    expect(documents.output).toContain("requestedScope");
    expect(documents.output).toContain("[INFERRED]");
    expect(fixture.observed.some((args) => args.includes("extract"))).toBe(false);
    const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(denied.output)?.[1];
    expect(attemptId).toBeDefined();
    const permitted = await graphCliResult(
      fixture.root,
      [
        "fallback",
        "--attempt-id",
        attemptId ?? "",
        "--question",
        "unresolved legacy caller",
        "--reason",
        "The graph explains checkout but cannot identify the unresolved legacy caller.",
      ],
      fixture.run,
    );
    expect(permitted.value).toMatchObject({ permitted: true });
    expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
    now = 61000;
    expect((await installedGraphHookResult(fixture.root, event)).output).toContain(
      '"permissionDecision":"deny"',
    );
    expect(fixture.observed.some((args) => args.includes("rg") || args.includes("grep"))).toBe(
      false,
    );
  } finally {
    clock.mockRestore();
    await fixture.dispose();
  }
});
