// QFAI:BF-0001

import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { runInit } from "../../src/cli/commands/init.js";
import { graphReuseEnvironment } from "../../src/core/graph/reuse.js";
import { completedDocumentSnapshotFixture } from "../helpers/graphReuse.js";
import { graphProcessFixture } from "../helpers/graphProcess.js";
import { graphCliResult } from "../helpers/graphCli.js";
import { captureStdout } from "../helpers/stdout.js";

it("initializes managed graph tools and completes graph-first exploration", async () => {
  const fixture = await completedDocumentSnapshotFixture(graphReuseEnvironment());
  expect(fixture.preparedReuse).toBe(
    process.platform === "win32" && process.arch === "x64" ? "published" : "unavailable",
  );
  const runtime = graphProcessFixture();
  try {
    const summary = await captureStdout(() =>
      runInit({ dir: fixture.root, force: false, dryRun: false, yes: true }, {}, runtime.run),
    );
    expect(summary).toContain("Graph tools");
    expect(summary).toContain("CodeGraph: installed");
    expect(summary).toContain("Graphify: installed");
    expect(summary).toContain(".qfai/tools/ is local to this checkout");
    expect(
      await readFile(path.join(fixture.root, ".qfai", "tools", "graph-cli.mjs"), "utf8"),
    ).toContain("runInstalledGraphCli");
    await expect(readFile(path.join(fixture.root, ".mcp.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      readFile(path.join(fixture.root, ".qfai", "tools", "graph-manager.mjs")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const code = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
    expect(code.output).toContain("checkout.ts");
    expect(code.value).toMatchObject({ engine: "codegraph", status: "answered" });
    expect(fixture.observed.some((args) => args.includes("query"))).toBe(false);
    expect(await readFile(path.join(fixture.root, "checkout.ts"), "utf8")).toContain(
      "function checkout",
    );
    const documents = await graphCliResult(
      fixture.root,
      ["documents", "Which requirement explains checkout?"],
      fixture.run,
    );
    expect(documents.output).toContain("rationale.md");
    expect(documents.output).toContain("requestedScope");
    expect(documents.output).toContain("[INFERRED]");
    expect(fixture.observed.some((args) => args.includes("extract"))).toBe(false);
    expect(fixture.observed.some((args) => args.includes("rg") || args.includes("grep"))).toBe(
      false,
    );
  } finally {
    await fixture.dispose();
  }
});
