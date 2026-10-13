import path from "node:path";
import { getInitAssetsDir } from "../../shared/assets.js";
import { copyFile, lstat, mkdir, readdir, rm } from "node:fs/promises";
import { isEnoent } from "../fs/errno.js";
import { GRAPH_VERSIONS, graphRuntimePaths, graphAnalysisRoot } from "./layout.js";
import type { GraphProcess } from "./process.js";
import { codegraphEnvironment } from "./process.js";
import { assertGraphStoragePath, assertIndependentAnalysis } from "./storage.js";
export { graphAnalysisRoot } from "./layout.js";

export interface CodeAnalysisCoverage {
  complete: boolean;
  unsupported: string[];
  unreadable: string[];
  unparsed: string[];
}

export async function inspectCodeCoverage(
  root: string,
  run: GraphProcess,
): Promise<CodeAnalysisCoverage> {
  const unknown = { complete: false, unsupported: [], unreadable: [], unparsed: [] };
  const runtime = graphRuntimePaths(root);
  const analysis = graphAnalysisRoot(root, "codegraph");
  const result = await run(
    runtime.codegraphNode,
    [
      "--liftoff-only",
      path.resolve(getInitAssetsDir(), "..", "graph", "codegraph-native.mjs"),
      runtime.codegraphSdk,
      analysis,
      "coverage",
    ],
    { cwd: analysis, env: codegraphEnvironment(root) },
  );
  if (result.exitCode !== 0) return unknown;
  let value: unknown;
  try {
    value = JSON.parse(result.stdout);
  } catch {
    return unknown;
  }
  if (
    !object(value) ||
    Object.keys(value).length !== 4 ||
    typeof value.complete !== "boolean" ||
    !stringArray(value.unsupported) ||
    !stringArray(value.unreadable) ||
    !stringArray(value.unparsed)
  )
    return unknown;
  return {
    complete:
      value.complete &&
      value.unsupported.length === 0 &&
      value.unreadable.length === 0 &&
      value.unparsed.length === 0,
    unsupported: value.unsupported,
    unreadable: value.unreadable,
    unparsed: value.unparsed,
  };
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === "string");
}

export async function inspectCurrentCodeAnalysis(
  root: string,
  run: GraphProcess,
): Promise<boolean> {
  const analysis = graphAnalysisRoot(root, "codegraph");
  return inspectCodeAnalysisAt(root, analysis, run);
}

export async function inspectCodeAnalysisAt(
  root: string,
  analysis: string,
  run: GraphProcess,
): Promise<boolean> {
  await assertGraphStoragePath(root, analysis);
  try {
    if (!(await lstat(path.join(analysis, ".codegraph", "codegraph.db"))).isFile()) return false;
  } catch (cause: unknown) {
    if (isEnoent(cause)) return false;
    throw cause;
  }
  await mirrorGraphCorpus(root, analysis);
  return nativeCodeAnalysisCurrent(root, analysis, run);
}

export async function nativeCodeAnalysisCurrent(
  root: string,
  analysis: string,
  run: GraphProcess,
): Promise<boolean> {
  const result = await run(
    process.execPath,
    [graphRuntimePaths(root).codegraph, "status", analysis, "--json"],
    { cwd: root, env: codegraphEnvironment(root) },
  );
  if (result.exitCode !== 0) return false;
  let value: unknown;
  try {
    value = JSON.parse(result.stdout);
  } catch (cause: unknown) {
    if (!(cause instanceof SyntaxError)) throw cause;
    return false;
  }
  if (!object(value) || !object(value.index) || !object(value.pendingChanges)) return false;
  const changes = value.pendingChanges;
  return (
    value.initialized === true &&
    value.version === GRAPH_VERSIONS.codegraph &&
    value.projectPath === analysis &&
    value.worktreeMismatch === null &&
    value.index.state === "complete" &&
    value.index.pendingRefs === 0 &&
    value.index.reindexRecommended === false &&
    value.index.builtWithVersion === GRAPH_VERSIONS.codegraph &&
    value.index.builtWithExtractionVersion !== undefined &&
    value.index.builtWithExtractionVersion === value.index.currentExtractionVersion &&
    ["added", "modified", "removed"].every((key) => changes[key] === 0)
  );
}

const excludedDirectories = new Set([
  ".git",
  ".codegraph",
  ".codegraph-wsl",
  ".graphify",
  "graphify-out",
  "node_modules",
  "dist",
  "tmp",
  ".claude",
  ".codex",
  ".vscode",
  ".ssh",
  ".aws",
  ".azure",
]);

export function excludedGraphInput(relative: string): boolean {
  const parts = relative.split("/");
  const name = parts.at(-1) ?? "";
  return (
    parts.some((part) => excludedDirectories.has(part.toLowerCase())) ||
    /^\.qfai\/(?:tools|report|evidence|review|discussion)(?:\/|$)/i.test(relative) ||
    relative.toLowerCase() === ".qfai/graph-processing.json" ||
    /^(?:\.npmrc|\.pypirc|\.netrc|\.git-credentials)$/i.test(name) ||
    /^\.env(?:\.|$)/i.test(name) ||
    /\.(?:pem|key|p12|pfx|keystore)$/i.test(name) ||
    /^(?:id_(?:rsa|dsa|ecdsa|ed25519)|credentials?(?:\.|$)|secrets?(?:\.|$)|\.mcp\.json$)/i.test(
      name,
    )
  );
}

export async function mirrorGraphCorpus(
  root: string,
  destination: string,
  scope?: readonly string[],
): Promise<void> {
  await assertGraphStoragePath(root, destination);
  await assertIndependentAnalysis(destination);
  const files = new Set<string>();
  await visit("");
  await removeAbsent("");

  async function visit(relative: string): Promise<void> {
    for (const entry of await readdir(path.join(root, ...relative.split("/")), {
      withFileTypes: true,
    })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (excludedGraphInput(next) || entry.isSymbolicLink()) continue;
      if (
        scope &&
        !scope.some(
          (item) => item === next || next.startsWith(`${item}/`) || item.startsWith(`${next}/`),
        )
      )
        continue;
      if (entry.isDirectory()) {
        await visit(next);
      } else if (entry.isFile()) {
        const source = path.join(root, ...next.split("/"));
        const stats = await lstat(source);
        if (!stats.isFile() || stats.nlink > 1) continue;
        const target = path.join(destination, ...next.split("/"));
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(source, target);
        files.add(next);
      }
    }
  }

  async function removeAbsent(relative: string): Promise<void> {
    for (const entry of await readdir(path.join(destination, ...relative.split("/")), {
      withFileTypes: true,
    })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.name === ".codegraph" || entry.name === ".git" || entry.name === "graphify-out")
        continue;
      const target = path.join(destination, ...next.split("/"));
      if (entry.isDirectory()) await removeAbsent(next);
      else if (!files.has(next)) await rm(target);
    }
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
