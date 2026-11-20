import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import type * as NativeFs from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { documentAnalysisFixture } from "../../helpers/graphAnalysis.js";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import { exploreGraph } from "../../../src/core/graph/query.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { graphCliResult } from "../../helpers/graphCli.js";

const removal = vi.hoisted(() => ({ fail: false }));
vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof NativeFs>();
  return {
    ...fs,
    readdir: vi.fn(fs.readdir),
    rm: async (target: string, options?: Parameters<typeof fs.rm>[1]) => {
      if (removal.fail && path.basename(target).startsWith(".refreshing-graphify-"))
        throw new Error("Simulated locked refresh copy");
      return fs.rm(target, options);
    },
  };
});

// QFAI:EX-0001-0236-15
// Mutation: packages/qfai/src/core/graph/documents.ts `await mirrorGraphCorpus(root, staged, scope);` -> `await mirrorGraphCorpus(root, staged, scope); const checkedRun = run; run = async (...args: Parameters<GraphProcess>) => ({ ...(await checkedRun(...args)), exitCode: 0 });` fails "retains prior document graph when the selected local backend cannot update changed documents"
it("retains prior document graph when the selected local backend cannot update changed documents", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    const run: GraphProcess = async (command, args, options) => {
      if (args.includes("extract")) {
        fixture.calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
        const corpus = args[args.indexOf("extract") + 1];
        if (!corpus) throw new Error("Expected managed staging corpus");
        await mkdir(path.join(corpus, "graphify-out"), { recursive: true });
        await writeFile(path.join(corpus, "graphify-out", "graph.json"), "Partial backend output");
        return { exitCode: 1, stdout: "" };
      }
      if (
        args.includes(fixture.documentAnalysis) &&
        args.some((arg) => arg.endsWith("graphify-native.py"))
      ) {
        fixture.calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
        return { exitCode: 0, stdout: '{"current":false,"unsupported":[],"unreadable":[]}' };
      }
      return fixture.run(command, args, options);
    };
    await expect(prepareDocumentAnalysis(fixture.root, run)).resolves.toMatchObject({
      status: "failed",
    });
    expect(
      await readFile(path.join(fixture.documentAnalysis, "graphify-out", "graph.json"), "utf8"),
    ).toBe("Process-port graph marker");
    expect(
      await exploreGraph(fixture.root, { domain: "documents", question: "Changed rationale" }, run),
    ).toMatchObject({ status: "not-ready", engine: "graphify" });
    const managed = await graphCliResult(fixture.root, ["documents", "Changed rationale"], run);
    expect(managed.value).toMatchObject({
      engine: "graphify",
      status: "failed",
      failure: "Graphify analysis preparation failed.",
    });
    expect(managed.output).toContain(
      "selected ollama backend and model selected-local-model at http://127.0.0.1:11434",
    );
    expect(managed.output).toContain("repair Graphify document analysis");
    expect(managed.failures).toBe(1);
    expect(
      await readFile(path.join(fixture.documentAnalysis, "graphify-out", "graph.json"), "utf8"),
    ).toBe("Process-port graph marker");
    expect(fixture.calls.filter((call) => call.args.includes("extract"))).toHaveLength(2);
    expect(
      fixture.calls.some(
        (call) =>
          call.args.includes("query") ||
          call.args.includes("context") ||
          call.env?.OPENAI_API_KEY !== undefined,
      ),
    ).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0236-15
// Mutation: packages/qfai/src/core/graph/documents.ts `if (status.current) await replaceGraphDirectory(staged, analysis, root);` -> `await replaceGraphDirectory(staged, analysis, root);` fails "keeps the prior graph paired with its prior inputs when a changed document cannot be refreshed"
it("keeps the prior graph paired with its prior inputs when a changed document cannot be refreshed", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    const run: GraphProcess = async (command, args, options) => {
      if (args.includes("extract")) return { exitCode: 1, stdout: "" };
      if (args.some((arg) => arg.endsWith("graphify-native.py")) && args.at(-1) === "semantic")
        return { exitCode: 0, stdout: '{"current":false,"unsupported":[],"unreadable":[]}' };
      return fixture.run(command, args, options);
    };
    await expect(prepareDocumentAnalysis(fixture.root, run)).resolves.toMatchObject({
      status: "failed",
    });
    expect(await readFile(path.join(fixture.documentAnalysis, "rationale.md"), "utf8")).toBe(
      "# Requirement rationale\n",
    );
    expect(
      await readFile(path.join(fixture.documentAnalysis, "graphify-out", "graph.json"), "utf8"),
    ).toBe("Process-port graph marker");
    expect(
      (await readdir(path.dirname(fixture.documentAnalysis))).filter((name) =>
        name.startsWith("."),
      ),
    ).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});

function semanticChecksOf(fixture: Awaited<ReturnType<typeof documentAnalysisFixture>>) {
  const active = path.toNamespacedPath(fixture.documentAnalysis);
  const checks = fixture.calls.filter((call) => call.args.at(-1) === "semantic");
  return {
    active: checks.filter((call) => call.args.includes(active)).length,
    total: checks.length,
  };
}

// Mutation: packages/qfai/src/core/graph/documents.ts `if (status.current) await replaceGraphDirectory(staged, analysis, root);` -> `` fails "activates refreshed inputs together with the graph they were verified against"
it("activates refreshed inputs together with the graph they were verified against", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    await expect(prepareDocumentAnalysis(fixture.root, fixture.run)).resolves.toMatchObject({
      status: "prepared",
      source: "current",
    });
    expect(await readFile(path.join(fixture.documentAnalysis, "rationale.md"), "utf8")).toBe(
      "# Changed rationale\n",
    );
    expect(
      await readFile(path.join(fixture.documentAnalysis, "graphify-out", "graph.json"), "utf8"),
    ).toBe("Process-port graph marker");
    expect(semanticChecksOf(fixture)).toEqual({ active: 0, total: 1 });
    expect(
      (await readdir(path.dirname(fixture.documentAnalysis))).filter((name) =>
        name.startsWith("."),
      ),
    ).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/documents.ts `if (refresh === "staged" && (await graphCorpusChanged(root, analysis, scope)))` -> `if (refresh === "staged")` fails "checks unchanged inputs where they stand without copying the active analysis"
it("checks unchanged inputs where they stand without copying the active analysis", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await expect(prepareDocumentAnalysis(fixture.root, fixture.run)).resolves.toMatchObject({
      status: "prepared",
      source: "current",
    });
    expect(semanticChecksOf(fixture)).toEqual({ active: 1, total: 1 });
    expect(await readFile(path.join(fixture.documentAnalysis, "rationale.md"), "utf8")).toBe(
      "# Requirement rationale\n",
    );
  } finally {
    await fixture.dispose();
  }
});

/**
 * How many times the top directory of an analysis `matches` picks out was read. Paths are compared
 * in their namespaced form, the form the inventory process receives.
 */
function analysisWalks(matches: (directory: string) => boolean): number {
  return vi
    .mocked(readdir)
    .mock.calls.filter(([directory]) =>
      matches(path.toNamespacedPath(path.resolve(String(directory)))),
    ).length;
}

// Mutation: packages/qfai/src/core/graph/documents.ts `if (refresh === "staged" && (await graphCorpusChanged(root, analysis, scope, "checked")))` -> `if (refresh === "staged" && (await graphCorpusChanged(root, analysis, scope)))` fails "walks the active analysis once for safety and once for changes when its inputs are unchanged"
it("walks the active analysis once for safety and once for changes when its inputs are unchanged", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    vi.mocked(readdir).mockClear();
    await expect(prepareDocumentAnalysis(fixture.root, fixture.run)).resolves.toMatchObject({
      status: "prepared",
      source: "current",
    });
    const active = path.toNamespacedPath(path.resolve(fixture.documentAnalysis));
    // The safety walk, the fixture's stand-in for the inventory process, and the change check.
    expect(analysisWalks((directory) => directory === active)).toBe(3);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/documents.ts `// The mirror checks the copy's independence before it writes anything.` -> `await assertIndependentAnalysis(staged);` fails "checks the refresh copy's independence once before refreshing its inputs"
it("checks the refresh copy's independence once before refreshing its inputs", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    vi.mocked(readdir).mockClear();
    await expect(prepareDocumentAnalysis(fixture.root, fixture.run)).resolves.toMatchObject({
      status: "prepared",
    });
    const parent = path.toNamespacedPath(path.resolve(path.dirname(fixture.documentAnalysis)));
    // One walk checks the copy's independence; the mirror's removal pass reads it once more.
    expect(
      analysisWalks(
        (directory) =>
          path.dirname(directory) === parent &&
          path.basename(directory).startsWith(".refreshing-graphify-"),
      ),
    ).toBe(2);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/documents.ts `await discardRefreshCopy(staged);` -> `await rm(staged, { recursive: true, force: true });` fails "reports the checked status when the refresh copy cannot be removed"
it("reports the checked status when the refresh copy cannot be removed", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    const run: GraphProcess = async (command, args, options) => {
      if (args.includes("extract")) return { exitCode: 1, stdout: "" };
      if (args.some((arg) => arg.endsWith("graphify-native.py")) && args.at(-1) === "semantic")
        return { exitCode: 0, stdout: '{"current":false,"unsupported":[],"unreadable":[]}' };
      return fixture.run(command, args, options);
    };
    removal.fail = true;
    await expect(prepareDocumentAnalysis(fixture.root, run)).resolves.toMatchObject({
      status: "failed",
    });
    expect(await readFile(path.join(fixture.documentAnalysis, "rationale.md"), "utf8")).toBe(
      "# Requirement rationale\n",
    );
  } finally {
    removal.fail = false;
    await fixture.dispose();
  }
});
