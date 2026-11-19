import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import { graphEnvironmentKey } from "../../../src/core/graph/layout.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { graphCliResult } from "../../helpers/graphCli.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { runInit } from "../../../src/cli/commands/init.js";
import { graphProject } from "../../helpers/graphProject.js";
import { captureStdout } from "../../helpers/stdout.js";
import { prepareGraphIntegration } from "../../../src/core/graph/integration.js";

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

// QFAI:EX-0001-0236-20
it("reports a lock whose owner record is still being written as contention, and an old one as abandoned", async () => {
  for (const state of ["initializing", "abandoned"] as const) {
    const fixture = await codeAnalysisFixture();
    try {
      const directory = path.join(fixture.root, ".qfai", "tools", "state", graphEnvironmentKey());
      await mkdir(directory, { recursive: true });
      const lock = path.join(directory, "analysis.lock");
      // The exclusive create publishes an empty file before the owner record lands in it.
      await writeFile(lock, "");
      if (state === "abandoned") {
        const old = new Date(Date.now() - 60_000);
        await utimes(lock, old, old);
      }
      const answer = await graphCliResult(fixture.root, ["code", "checkout callers"], fixture.run);
      expect(answer.value).toMatchObject({
        status: "failed",
        failure: expect.stringContaining(
          state === "initializing" ? "contended" : "manual recovery",
        ),
        recovery: expect.stringContaining(state === "initializing" ? "Retry" : "inspect"),
      });
      expect(fixture.calls).toEqual([]);
      expect(await readFile(lock, "utf8")).toBe("");
      expect(await readdir(directory)).toEqual(["analysis.lock"]);
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

// QFAI:EX-0001-0236-24
it("serializes init runtime activation with graph queries and another init", async () => {
  const project = await graphProject();
  let release: () => void = () => undefined;
  let began: () => void = () => undefined;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    began = resolve;
  });
  const run: GraphProcess = async (command, args, options) => {
    if (args.includes("--prefix")) {
      began();
      await barrier;
    }
    return project.fixture.run(command, args, options);
  };
  const activating = captureStdout(() =>
    runInit({ dir: project.root, force: false, dryRun: false, yes: true }, {}, run),
  );
  try {
    // An init that fails before its download surfaces here instead of timing out.
    await Promise.race([started, activating]);
    const busy = await graphCliResult(project.root, ["code", "checkout callers"], run);
    expect(busy.value).toMatchObject({
      status: "failed",
      failure: expect.stringContaining("contended"),
      recovery: expect.stringContaining("Retry"),
    });
    expect(busy.failures).toBe(1);
    const calls = project.fixture.calls.length;
    await expect(project.initialize()).rejects.toThrow(/contended.*Retry.*qfai init again/s);
    // Only the .gitignore checks that run before the lock is taken; no installer or probe starts.
    const refused = project.fixture.calls.slice(calls);
    expect(refused.length).toBeGreaterThan(0);
    expect(
      refused.every(
        (call) =>
          call.command === "git" && ["ls-files", "check-ignore"].includes(call.args[0] ?? ""),
      ),
    ).toBe(true);
    release();
    await activating;
    const state = path.join(project.root, ".qfai", "tools", "state", graphEnvironmentKey());
    expect(await readdir(state)).toEqual([]);
    expect(await project.initialize()).toContain("qfai init: done");
  } finally {
    release();
    await activating.catch(() => undefined);
    await project.dispose();
  }
});

// QFAI:EX-0001-0236-24
it("replaces an older graph CLI entrypoint whole, so a starting query never reads it part-written", async () => {
  const project = await graphProject();
  try {
    await project.initialize();
    const tools = path.join(project.root, ".qfai", "tools");
    const entrypoint = path.join(tools, "graph-cli.mjs");
    const current = await readFile(entrypoint, "utf8");
    const older = "// An entrypoint an earlier release wrote\n";
    await writeFile(entrypoint, older);
    await writeFile(
      path.join(tools, "graph-entrypoints.json"),
      JSON.stringify({ kind: "graph-entrypoints", sources: { "graph-cli.mjs": older } }) + "\n",
    );
    const before = await lstat(entrypoint);
    expect((await prepareGraphIntegration(project.root, project.fixture.run)).files).toEqual([
      ".qfai/tools/graph-cli.mjs",
    ]);
    // A truncate-and-write keeps the inode a starting query is reading; a rename into place
    // swaps in a different, already complete file.
    expect((await lstat(entrypoint)).ino).not.toBe(before.ino);
    expect(await readFile(entrypoint, "utf8")).toBe(current);
    expect((await readdir(tools)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  } finally {
    await project.dispose();
  }
});
