/**
 * A query refreshes changed inputs in a copy of the active analysis. It makes that copy once per
 * query, removes the copies earlier queries could not discard before it makes a new one, and
 * compares file sizes before it reads any contents.
 */

import { lstat, mkdir, open, readFile, stat, writeFile } from "node:fs/promises";
import type * as NativeFs from "node:fs/promises";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  graphCorpusChanged,
  inspectCurrentCodeAnalysis,
  mirrorGraphCorpus,
} from "../../../src/core/graph/analysis.js";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import type { GraphProcess } from "../../../src/core/graph/process.js";
import { queryPreparedGraph } from "../../../src/core/graph/runner.js";
import { codeAnalysisFixture, documentAnalysisFixture } from "../../helpers/graphAnalysis.js";

const removal = vi.hoisted(() => ({ refused: "" }));
vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof NativeFs>();
  return {
    ...fs,
    open: vi.fn(fs.open),
    readFile: vi.fn(fs.readFile),
    rm: async (target: string, options?: Parameters<typeof fs.rm>[1]) => {
      if (removal.refused !== "" && path.basename(target) === removal.refused)
        throw new Error("Simulated refresh copy held open");
      return fs.rm(target, options);
    },
  };
});

afterEach(() => {
  removal.refused = "";
});

const LEFTOVER = {
  graphify: ".refreshing-graphify-00000000-0000-4000-8000-000000000001",
  codegraph: ".refreshing-codegraph-00000000-0000-4000-8000-000000000002",
  graphifyCode: ".refreshing-graphify-code-00000000-0000-4000-8000-000000000003",
};

async function exists(target: string): Promise<boolean> {
  return lstat(target).then(
    () => true,
    () => false,
  );
}

/** Leaves a hidden refresh copy named `name` beside the analyses, as a failed removal would. */
async function leaveCopy(parent: string, name: string): Promise<string> {
  const copy = path.join(parent, name);
  await mkdir(copy, { recursive: true });
  await writeFile(path.join(copy, "rationale.md"), "# Stale copy\n");
  return copy;
}

/** How many of `calls` name `target`, resolved, so a namespaced form compares equal. */
function calledWith(calls: readonly (readonly unknown[])[], target: string): number {
  return calls.filter(([file]) => path.resolve(String(file)) === path.resolve(target)).length;
}

// Mutation: packages/qfai/src/core/graph/runner.ts `: await prepareNotCurrentDocumentAnalysisLocked(root, run);` -> `: await prepareDocumentAnalysis(root, run);` fails "makes one refresh copy when a document query finds the analysis not current and prepares it"
it("makes one refresh copy when a document query finds the analysis not current and prepares it", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    const run: GraphProcess = async (command, args, options) => {
      if (args.includes("extract")) return { exitCode: 1, stdout: "" };
      if (args.some((arg) => arg.endsWith("graphify-native.py")) && args.at(-1) === "semantic") {
        fixture.calls.push({ command, args });
        return { exitCode: 0, stdout: '{"current":false,"unsupported":[],"unreadable":[]}' };
      }
      return fixture.run(command, args, options);
    };
    await expect(
      queryPreparedGraph(fixture.root, { domain: "documents", question: "Changed rationale" }, run),
    ).resolves.toMatchObject({ status: "failed", engine: "graphify" });
    const refreshChecks = fixture.calls.filter(
      (call) =>
        call.args.at(-1) === "semantic" &&
        call.args.some((arg) => path.basename(arg).startsWith(".refreshing-graphify-")),
    );
    expect(refreshChecks).toHaveLength(1);
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0236-20 BR-CLI-0021-0026
// Mutation: packages/qfai/src/core/graph/codePreparation.ts `if (checkCurrent && (await inspectCurrentCodeAnalysis(root, run)))` -> `if (await inspectCurrentCodeAnalysis(root, run))` fails "makes one refresh copy when a code query finds the analysis not current and prepares it"
it("makes one refresh copy when a code query finds the analysis not current and prepares it", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    const priorSource = "export function checkout() { return 2; }\n";
    const activeSource = path.join(fixture.analysis, "checkout.ts");
    await writeFile(activeSource, priorSource);
    const replacementAttempts: Promise<{
      targetPath: string;
      isDirectory: boolean;
      sameDirectory: boolean;
    }>[] = [];
    const run: GraphProcess = async (command, args, options) => {
      if (args.includes("status")) {
        fixture.calls.push({ command, args });
        return { exitCode: 0, stdout: '{"initialized":false}' };
      }
      if (args.includes("--liftoff-only")) {
        fixture.calls.push({ command, args });
        if (
          args[0] === "--liftoff-only" &&
          args.length === 4 &&
          path.basename(args[1] ?? "") === "codegraph-native.mjs"
        ) {
          const target = args[3];
          if (target === undefined)
            throw new Error("CodeGraph generation did not receive a target");
          const targetPath = path.resolve(options.cwd, target);
          const observation = Promise.all([
            stat(targetPath, { bigint: true }),
            stat(fixture.analysis, { bigint: true }),
          ]).then(([staged, active]) => ({
            targetPath,
            isDirectory: staged.isDirectory(),
            sameDirectory: staged.dev === active.dev && staged.ino === active.ino,
          }));
          replacementAttempts.push(observation);
          await observation;
        }
        return { exitCode: 1, stdout: "" };
      }
      if (args.includes("--version")) return { exitCode: 1, stdout: "" };
      return fixture.run(command, args, options);
    };
    await expect(
      queryPreparedGraph(fixture.root, { domain: "code", question: "checkout" }, run),
    ).resolves.toMatchObject({ status: "failed", engine: "codegraph" });
    const refreshChecks = fixture.calls.filter(
      (call) =>
        call.args[1] === "status" &&
        path.basename(call.args[2] ?? "").startsWith(".refreshing-codegraph-"),
    );
    expect(refreshChecks).toHaveLength(1);
    expect(replacementAttempts).toHaveLength(1);
    const [attempt] = replacementAttempts;
    if (attempt === undefined) throw new Error("CodeGraph generation was not observed");
    const { targetPath, isDirectory, sameDirectory } = await attempt;
    expect(isDirectory).toBe(true);
    expect(sameDirectory).toBe(false);
    expect(path.dirname(targetPath)).toBe(path.dirname(path.resolve(fixture.analysis)));
    expect(await readFile(activeSource, "utf8")).toBe(priorSource);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/storage.ts `await discardLeftoverRefreshCopies(analysis, engine);` -> `` fails "removes the refresh copies earlier queries left before a document query makes a new one"
// Mutation: packages/qfai/src/core/graph/layout.ts `-${STAGING_ID}$` -> `-` fails "removes the refresh copies earlier queries left before a document query makes a new one"
it("removes the refresh copies earlier queries left before a document query makes a new one", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const parent = path.dirname(fixture.documentAnalysis);
    const graphify = await leaveCopy(parent, LEFTOVER.graphify);
    const codegraph = await leaveCopy(parent, LEFTOVER.codegraph);
    const graphifyCode = await leaveCopy(parent, LEFTOVER.graphifyCode);
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    await expect(prepareDocumentAnalysis(fixture.root, fixture.run)).resolves.toMatchObject({
      status: "prepared",
    });
    expect(await exists(graphify)).toBe(false);
    // Each engine removes only its own copies; another engine's wait for that engine's refresh.
    expect(await exists(codegraph)).toBe(true);
    expect(await exists(graphifyCode)).toBe(true);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/storage.ts `if (isGraphAnalysisStaging(name, "refreshing", engine))` -> `if (isGraphAnalysisStaging(name, "refreshing", "graphify"))` fails "removes the code-graph refresh copies earlier queries left and no other engine's"
it("removes the code-graph refresh copies earlier queries left and no other engine's", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const parent = path.dirname(fixture.analysis);
    const codegraph = await leaveCopy(parent, LEFTOVER.codegraph);
    const graphify = await leaveCopy(parent, LEFTOVER.graphify);
    // The fixture's code analysis holds no corpus yet, so the query refreshes it in a copy.
    await expect(inspectCurrentCodeAnalysis(fixture.root, fixture.run)).resolves.toBe(true);
    expect(await exists(codegraph)).toBe(false);
    expect(await exists(graphify)).toBe(true);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/storage.ts `await discardRefreshCopy(path.join(parent, name));` -> `await rm(path.join(parent, name), { recursive: true, force: true });` fails "refreshes the analysis when a leftover refresh copy cannot be removed"
it("refreshes the analysis when a leftover refresh copy cannot be removed", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const graphify = await leaveCopy(path.dirname(fixture.documentAnalysis), LEFTOVER.graphify);
    removal.refused = LEFTOVER.graphify;
    await writeFile(path.join(fixture.root, "rationale.md"), "# Changed rationale\n");
    await expect(prepareDocumentAnalysis(fixture.root, fixture.run)).resolves.toMatchObject({
      status: "prepared",
      source: "current",
    });
    expect(await readFile(path.join(fixture.documentAnalysis, "rationale.md"), "utf8")).toBe(
      "# Changed rationale\n",
    );
    expect(await exists(graphify)).toBe(true);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/analysis.ts `if (copied === bytes.length && bytes.equals(await readFile(target))) continue;` -> `if (copied !== undefined && bytes.equals(await readFile(target))) continue;` fails "mirrors a file of another size without reading its copy"
it("mirrors a file of another size without reading its copy", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    const copy = path.join(fixture.analysis, "checkout.ts");
    await writeFile(copy, "export {};\n");
    vi.mocked(readFile).mockClear();
    await mirrorGraphCorpus(fixture.root, fixture.analysis);
    expect(calledWith(vi.mocked(readFile).mock.calls, copy)).toBe(0);
    expect(await readFile(copy, "utf8")).toBe("export function checkout() { return 3; }\n");
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/analysis.ts `if (mode === "compare" && copied !== stats.size) {` -> `if (false) {` fails "finds a file of another size changed without reading either copy"
it("finds a file of another size changed without reading either copy", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    const source = path.join(fixture.root, "checkout.ts");
    const copy = path.join(fixture.analysis, "checkout.ts");
    await writeFile(copy, "export {};\n");
    vi.mocked(readFile).mockClear();
    vi.mocked(open).mockClear();
    await expect(graphCorpusChanged(fixture.root, fixture.analysis)).resolves.toBe(true);
    expect(calledWith(vi.mocked(readFile).mock.calls, copy)).toBe(0);
    expect(calledWith(vi.mocked(open).mock.calls, source)).toBe(0);
  } finally {
    await fixture.dispose();
  }
});

// Mutation: packages/qfai/src/core/graph/analysis.ts `if (copied === bytes.length && bytes.equals(await readFile(target))) continue;` -> `if (copied === bytes.length) continue;` fails "copies a file of the same size whose contents changed"
it("copies a file of the same size whose contents changed", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    const copy = path.join(fixture.analysis, "checkout.ts");
    await writeFile(copy, "export function checkout() { return 4; }\n");
    await expect(graphCorpusChanged(fixture.root, fixture.analysis)).resolves.toBe(true);
    await mirrorGraphCorpus(fixture.root, fixture.analysis);
    expect(await readFile(copy, "utf8")).toBe("export function checkout() { return 3; }\n");
  } finally {
    await fixture.dispose();
  }
});
