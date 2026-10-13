import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { restoreCompletedCodeAnalysis } from "../../../src/core/graph/reuse.js";
import {
  completedCodeSnapshotFixture,
  localCodeGenerationProcess,
} from "../../helpers/graphReuse.js";
import { prepareCodeAnalysis } from "../../../src/core/graph/codePreparation.js";
import { graphAnalysisRoot } from "../../../src/core/graph/layout.js";
import { documentAnalysisFixture, graphifyExtractionFixture } from "../../helpers/graphAnalysis.js";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import { graphReuseEnvironment } from "../../../src/core/graph/reuse.js";

// QFAI:EX-0001-0236-01
// Mutation: packages/qfai/src/core/graph/documentReuse.ts `if (await inspect(staged, true)) {` -> `if (!(await inspect(staged, true))) {` fails "publishes and independently restores a completed document graph after native freshness checks"
it("publishes and independently restores a completed document graph after native freshness checks", async () => {
  const fixture = await documentAnalysisFixture();
  const common = await mkdtemp(path.join(os.tmpdir(), "qfai-document-cache-"));
  const native = graphifyExtractionFixture(fixture);
  const environment = { ...graphReuseEnvironment(), platform: "win32", architecture: "x64" };
  const run: typeof fixture.run = async (command, args, options) => {
    if (command === "git") return { exitCode: 0, stdout: common };
    if (args.includes("-c")) return { exitCode: 0, stdout: "3.12.13" };
    if (args.at(-1) === "inventory")
      return { exitCode: 0, stdout: '{"files":["checkout.ts","rationale.md"]}' };
    return native(command, args, options);
  };
  try {
    expect(await prepareDocumentAnalysis(fixture.root, run, undefined, environment)).toMatchObject({
      status: "prepared",
      source: "current",
    });
    expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
    await rm(fixture.documentAnalysis, { recursive: true });
    expect(await prepareDocumentAnalysis(fixture.root, run, undefined, environment)).toMatchObject({
      status: "prepared",
      source: "generated",
      reuse: "published",
    });
    const cache = path.join(common, "qfai-graph-cache", "win32-x64", "graphify");
    const names = await readdir(cache);
    expect(names).toHaveLength(1);
    const completed = path.join(cache, names[0] ?? "", "analysis", "graphify-out", "graph.json");
    const before = await readFile(completed);
    await rm(fixture.documentAnalysis, { recursive: true });
    fixture.calls.length = 0;
    expect(await prepareDocumentAnalysis(fixture.root, run, undefined, environment)).toMatchObject({
      status: "prepared",
      source: "restored",
    });
    expect(fixture.calls.some((call) => call.args.includes("extract"))).toBe(false);
    const graph = path.join(fixture.documentAnalysis, "graphify-out", "graph.json");
    expect((await lstat(graph)).nlink).toBe(1);
    await writeFile(graph, "Changed only in this worktree");
    expect(await readFile(completed)).toEqual(before);
  } finally {
    await fixture.dispose();
    await rm(common, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0236-01
// Mutation: packages/qfai/src/core/graph/reuse.ts `if (!(await inspectCodeAnalysisAt(root, staged, run))) continue;` -> `if (await inspectCodeAnalysisAt(root, staged, run)) continue;` fails "restores a compatible completed local copy and confirms native freshness without generation"
it("restores a compatible completed local copy and confirms native freshness without generation", async () => {
  const fixture = await completedCodeSnapshotFixture();
  const other = await mkdtemp(path.join(os.tmpdir(), "qfai-published-graph-worktree-"));
  try {
    expect(await restoreCompletedCodeAnalysis(fixture.root, fixture.run, fixture.environment)).toBe(
      "restored",
    );
    const database = path.join(fixture.analysis, ".codegraph", "codegraph.db");
    const cached = path.join(fixture.candidate, "analysis", ".codegraph", "codegraph.db");
    expect(await readFile(database, "utf8")).toBe(await readFile(cached, "utf8"));
    expect((await lstat(database)).nlink).toBe(1);
    await writeFile(database, "Changed only in the worktree");
    expect(await readFile(cached, "utf8")).toBe("Process-port DB marker");
    expect(fixture.observed.some((args) => args.includes("status"))).toBe(true);
    expect(
      fixture.observed.some(
        (args) => args.includes("index") || args.includes("sync") || args.includes("extract"),
      ),
    ).toBe(false);
    await rm(fixture.analysis, { recursive: true });
    await rm(fixture.candidate, { recursive: true });
    expect(
      await prepareCodeAnalysis(
        fixture.root,
        localCodeGenerationProcess(fixture),
        fixture.environment,
      ),
    ).toMatchObject({ status: "prepared", source: "generated", reuse: "published" });
    const published = await readdir(path.dirname(fixture.candidate));
    expect(published).toHaveLength(1);
    expect(published[0]?.startsWith(".")).toBe(false);
    expect(
      fixture.observed.some(
        (args) => args.includes("status") && args.some((arg) => arg.includes(".publishing-")),
      ),
    ).toBe(true);
    const snapshot = path.join(path.dirname(fixture.candidate), published[0] ?? "");
    const metadata = JSON.parse(await readFile(path.join(snapshot, "completed.json"), "utf8"));
    expect(metadata).toMatchObject({ repository: fixture.common, corpusPolicy: 1 });
    const completedDb = path.join(snapshot, "analysis", ".codegraph", "codegraph.db");
    expect((await lstat(completedDb)).nlink).toBe(1);
    await cp(path.join(fixture.root, "checkout.ts"), path.join(other, "checkout.ts"));
    expect(await restoreCompletedCodeAnalysis(other, fixture.run, fixture.environment)).toBe(
      "restored",
    );
    await writeFile(
      path.join(graphAnalysisRoot(other, "codegraph"), ".codegraph", "codegraph.db"),
      "Other worktree change",
    );
    expect(await readFile(completedDb, "utf8")).toBe("Native generation process-port marker");
  } finally {
    await fixture.dispose();
    await rm(other, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0236-03
// Mutation: packages/qfai/src/core/graph/reuse.ts `nativeRuntime.stdout.trim() !== "v24.16.0"` -> `false` fails "uses local generation for native copy combinations without independent restoration proof"
it("uses local generation for native copy combinations without independent restoration proof", async () => {
  for (const platform of ["linux", "darwin"]) {
    const fixture = await completedCodeSnapshotFixture();
    try {
      const environment = { ...fixture.environment, platform };
      const candidate = path.join(
        fixture.common,
        "qfai-graph-cache",
        `${platform}-x64`,
        "codegraph",
        "completed-fixture",
      );
      await mkdir(path.dirname(candidate), { recursive: true });
      await cp(fixture.candidate, candidate, { recursive: true });
      await writeFile(
        path.join(candidate, "completed.json"),
        JSON.stringify({
          layout: 1,
          repository: fixture.common,
          environment,
          engineVersion: "1.6.2",
          corpusPolicy: 1,
        }),
      );
      const result = await prepareCodeAnalysis(
        fixture.root,
        localCodeGenerationProcess(fixture),
        environment,
      );
      expect(result).toMatchObject({ status: "prepared", source: "generated" });
      expect(
        await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8"),
      ).toBe("Native generation process-port marker");
    } finally {
      await fixture.dispose();
    }
  }
  const fixture = await completedCodeSnapshotFixture();
  try {
    const generate = localCodeGenerationProcess(fixture);
    const result = await prepareCodeAnalysis(
      fixture.root,
      (command, args, options) =>
        args.length === 1 && args[0] === "--version"
          ? Promise.resolve({ exitCode: 0, stdout: "v25.0.0\n" })
          : generate(command, args, options),
      fixture.environment,
    );
    expect(result).toMatchObject({ status: "prepared", source: "generated" });
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0236-02
// Mutation: packages/qfai/src/core/graph/codePreparation.ts `result.exitCode !== 0 || !(await inspectCodeAnalysisAt(root, staged, run))` -> `result.exitCode === 0 || !(await inspectCodeAnalysisAt(root, staged, run))` fails "generates local native analysis when no same-machine repository cache is available"
it("generates local native analysis when no same-machine repository cache is available", async () => {
  const fixture = await completedCodeSnapshotFixture();
  try {
    await rm(fixture.candidate, { recursive: true });
    const result = await prepareCodeAnalysis(
      fixture.root,
      localCodeGenerationProcess(fixture, false),
      fixture.environment,
    );
    expect(result).toMatchObject({ status: "prepared", source: "generated" });
    expect(await readFile(path.join(fixture.analysis, ".codegraph", "codegraph.db"), "utf8")).toBe(
      "Native generation process-port marker",
    );
    expect(
      fixture.observed.filter((args) => args.some((arg) => arg.endsWith("codegraph-native.mjs"))),
    ).toHaveLength(1);
    expect(
      fixture.observed.some(
        (args) =>
          args.includes("fetch") ||
          args.includes("download") ||
          args.some((arg) => /^https?:/.test(arg)),
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});
