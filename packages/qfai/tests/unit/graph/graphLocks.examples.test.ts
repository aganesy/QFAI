import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import { graphEnvironmentKey } from "../../../src/core/graph/layout.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../helpers/graphCli.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";

// QFAI:EX-0001-0236-20
it("retains contended and abandoned analysis locks with retry or exact manual recovery", async () => {
  for (const state of ["contended", "abandoned"] as const) {
    const fixture = await codeAnalysisFixture();
    try {
      const directory = path.join(fixture.root, ".qfai", "tools", "state", graphEnvironmentKey());
      await mkdir(directory, { recursive: true });
      const lock = path.join(directory, "analysis.lock");
      const owner = JSON.stringify({
        kind: "graph-lock",
        pid: state === "contended" ? process.pid : 2147483647,
        createdAt: Date.now(),
        token: randomUUID(),
      });
      await writeFile(lock, owner);
      const answer = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
      expect(answer.value).toMatchObject({
        status: "failed",
        failure: expect.stringContaining(state === "contended" ? "contended" : "manual recovery"),
        recovery: expect.stringContaining(state === "contended" ? "Retry" : "inspect"),
      });
      expect(answer.failures).toBe(1);
      if (state === "abandoned")
        expect(answer.output).toContain(`.qfai/tools/state/${graphEnvironmentKey()}/analysis.lock`);
      await expect(prepareDocumentAnalysis(fixture.root, fixture.run)).rejects.toMatchObject({
        recovery: expect.stringContaining(state === "contended" ? "Retry" : "inspect"),
      });
      expect(fixture.calls).toEqual([]);
      expect(await readFile(lock, "utf8")).toBe(owner);
      expect(await readdir(directory)).toEqual(["analysis.lock"]);
      expect(
        await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8"),
      ).toBe("Process-port DB marker");
    } finally {
      await fixture.dispose();
    }
  }
});

// QFAI:EX-0001-0236-04
it("serializes same-worktree queries while another worktree proceeds independently", async () => {
  const first = await codeAnalysisFixture();
  const other = await codeAnalysisFixture();
  let release: () => void = () => undefined;
  let began: () => void = () => undefined;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    began = resolve;
  });
  const run: GraphProcess = async (command, args, options) => {
    if (args.includes("context")) {
      began();
      await barrier;
    }
    return first.run(command, args, options);
  };
  const pending = graphCliResult(first.root, ["code", "checkout callers"], run);
  try {
    await started;
    const busy = await graphCliResult(first.root, ["code", "checkout callers"], first.run);
    expect(first.calls.filter((call) => call.args.includes("context"))).toHaveLength(0);
    expect(busy.value).toMatchObject({
      status: "failed",
      failure: expect.stringContaining("contended"),
    });
    const independent = await graphCliResult(other.root, ["code", "checkout callers"], other.run);
    expect(independent.value).toMatchObject({ engine: "codegraph", status: "answered" });
    expect(independent.failures).toBe(0);
    expect(other.calls.filter((call) => call.args.includes("context"))).toHaveLength(1);
    expect(await readFile(path.join(first.analysis, ".codegraph", "codegraph.db"), "utf8")).toBe(
      "Process-port DB marker",
    );
    expect(await readFile(path.join(other.analysis, ".codegraph", "codegraph.db"), "utf8")).toBe(
      "Process-port DB marker",
    );
    release();
    expect((await pending).value).toMatchObject({ status: "answered" });
    for (const fixture of [first, other])
      expect(
        await readdir(path.join(fixture.root, ".qfai", "tools", "state", graphEnvironmentKey())),
      ).toEqual([]);
  } finally {
    release();
    await pending;
    await first.dispose();
    await other.dispose();
  }
});
