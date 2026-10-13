import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GRAPH_VERSIONS, graphAnalysisRoot } from "../../src/core/graph/layout.js";
import type { GraphProcess } from "../../src/core/graph/process.js";

export async function codeAnalysisFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-question-"));
  const analysis = graphAnalysisRoot(root, "codegraph");
  await mkdir(path.join(analysis, ".codegraph"), { recursive: true });
  await writeFile(path.join(analysis, ".codegraph", "codegraph.db"), "Process-port DB marker");
  await writeFile(path.join(root, "checkout.ts"), "export function checkout() { return 3; }\n");
  const calls: { command: string; args: readonly string[]; env?: NodeJS.ProcessEnv }[] = [];
  const run: GraphProcess = async (command, args, options) => {
    calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
    if (args.at(-1) === "coverage")
      return {
        exitCode: 0,
        stdout: '{"complete":true,"unsupported":[],"unreadable":[],"unparsed":[]}',
      };
    if (args.some((arg) => arg.endsWith("graphify-native.py"))) {
      if (args.at(-1) === "inventory") return documentInventory(args);
      return { exitCode: 0, stdout: '{"current":true,"unsupported":[],"unreadable":[]}' };
    }
    if (args.includes("status")) {
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          initialized: true,
          version: GRAPH_VERSIONS.codegraph,
          projectPath: analysis,
          worktreeMismatch: null,
          index: {
            state: "complete",
            pendingRefs: 0,
            reindexRecommended: false,
            builtWithVersion: GRAPH_VERSIONS.codegraph,
            builtWithExtractionVersion: 1,
            currentExtractionVersion: 1,
          },
          pendingChanges: { added: 0, modified: 0, removed: 0 },
        }),
      };
    }
    return {
      exitCode: 0,
      stdout: JSON.stringify({
        query: args[args.indexOf("context") + 1],
        summary: "Native process-port context result",
        entryPoints: [],
        nodes: [{ kind: "function", name: "checkout", filePath: "checkout.ts", startLine: 1 }],
        edges: [],
        codeBlocks: [],
        relatedFiles: ["checkout.ts"],
        stats: { nodeCount: 1, edgeCount: 0, fileCount: 1, codeBlockCount: 0, totalCodeSize: 0 },
      }),
    };
  };
  return { root, analysis, calls, run, dispose: () => rm(root, { recursive: true, force: true }) };
}

export async function documentAnalysisFixture() {
  const fixture = await codeAnalysisFixture();
  const analysis = graphAnalysisRoot(fixture.root, "graphify");
  const processing = { backend: "ollama", model: "selected-local-model" };
  await mkdir(path.join(analysis, "graphify-out"), { recursive: true });
  await writeFile(path.join(fixture.root, "rationale.md"), "# Requirement rationale\n");
  await writeFile(
    path.join(fixture.root, ".qfai", "graph-processing.json"),
    JSON.stringify(processing),
  );
  await writeFile(path.join(analysis, "graphify-out", "graph.json"), "Process-port graph marker");
  await writeFile(path.join(analysis, "checkout.ts"), "export function checkout() { return 3; }\n");
  await writeFile(path.join(analysis, "rationale.md"), "# Requirement rationale\n");
  await writeFile(
    path.join(analysis, "graphify-out", "managed.json"),
    JSON.stringify({ engineVersion: GRAPH_VERSIONS.graphify, scope: "documents", processing }),
  );
  const run: GraphProcess = async (command, args, options) => {
    if (args.some((arg) => arg.endsWith("graphify-native.py"))) {
      fixture.calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
      if (args.at(-1) === "inventory") return documentInventory(args);
      return { exitCode: 0, stdout: '{"current":true,"unsupported":[],"unreadable":[]}' };
    }
    if (args.includes("graphify")) {
      fixture.calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
      return {
        exitCode: 0,
        stdout:
          "NODE Requirement [src=rationale.md loc=L1]\nEDGE Requirement --explains [INFERRED]--> ADR\n",
      };
    }
    return fixture.run(command, args, options);
  };
  return { ...fixture, run, documentAnalysis: path.toNamespacedPath(analysis), processing };
}

async function documentInventory(args: readonly string[]) {
  const inspector = args.findIndex((arg) => arg.endsWith("graphify-native.py"));
  const corpus = args[inspector + 1];
  if (!corpus) throw new Error("Expected an explicit document corpus.");
  const files: string[] = [];
  async function visit(relative: string): Promise<void> {
    for (const entry of await readdir(path.join(corpus ?? "", relative), { withFileTypes: true })) {
      if (["graphify-out", ".codegraph"].includes(entry.name)) continue;
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(next);
      else if (entry.isFile()) files.push(next);
    }
  }
  await visit("");
  return { exitCode: 0, stdout: JSON.stringify({ files }) };
}

export function graphifyExtractionFixture(
  fixture: Pick<Awaited<ReturnType<typeof codeAnalysisFixture>>, "calls" | "run">,
): GraphProcess {
  return async (command, args, options) => {
    if (!args.includes("extract")) return fixture.run(command, args, options);
    fixture.calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
    const corpus = args[args.indexOf("extract") + 1];
    if (!corpus) throw new Error("Expected the explicit managed corpus.");
    await mkdir(path.join(corpus, "graphify-out"), { recursive: true });
    await writeFile(
      path.join(corpus, "graphify-out", "graph.json"),
      '{"nodes":[{"id":"requirement"}],"edges":[]}',
    );
    return { exitCode: 0, stdout: "Native extraction completed" };
  };
}
