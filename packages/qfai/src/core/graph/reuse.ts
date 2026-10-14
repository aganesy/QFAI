import os from "node:os";
import path from "node:path";

import { randomUUID } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { isEnoent } from "../fs/errno.js";
import {
  GRAPH_VERSIONS,
  graphAnalysisRoot,
  graphRuntimePaths,
  graphEnvironmentKey,
} from "./layout.js";
import {
  excludedGraphInput,
  inspectCodeAnalysisAt,
  nativeCodeAnalysisCurrent,
} from "./analysis.js";
import {
  assertGraphStoragePath,
  assertIndependentAnalysis,
  replaceGraphDirectory,
} from "./storage.js";
import { codegraphEnvironment, type GraphProcess } from "./process.js";
import { getInitAssetsDir } from "../../shared/assets.js";

function verifiedNativeRelease(output: string): boolean {
  const release = /^v(\d+\.\d+\.\d+)$/.exec(output.trim());
  return release?.[1] === "24.16.0";
}

export interface GraphReuseEnvironment {
  platform: string;
  architecture: string;
  machine: string;
}

export function graphReuseEnvironment(): GraphReuseEnvironment {
  return { platform: process.platform, architecture: process.arch, machine: os.hostname() };
}

export async function restoreCompletedCodeAnalysis(
  root: string,
  run: GraphProcess,
  environment: GraphReuseEnvironment = graphReuseEnvironment(),
): Promise<"restored" | "cold"> {
  // Other native bundle combinations use generation until independent-copy proof exists.
  if (environment.platform !== "win32" || environment.architecture !== "x64") return "cold";
  const nativeRuntime = await run(graphRuntimePaths(root).codegraphNode, ["--version"], {
    cwd: root,
    env: codegraphEnvironment(root),
  });
  if (nativeRuntime.exitCode !== 0 || !verifiedNativeRelease(nativeRuntime.stdout)) return "cold";
  const location = await completedAnalysisCache(root, "codegraph", run, environment);
  if (!location) return "cold";
  let candidates;
  try {
    candidates = await readdir(location.directory, { withFileTypes: true });
  } catch (cause: unknown) {
    if (isEnoent(cause)) return "cold";
    throw cause;
  }
  for (const entry of candidates) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name.startsWith(".")) continue;
    const candidate = path.join(location.directory, entry.name);
    if (!(await cacheDirectorySafe(location.repository, candidate))) continue;
    const metadata = await readSnapshotMetadata(candidate);
    if (
      !metadata ||
      Object.keys(metadata).some(
        (key) =>
          !["layout", "corpusPolicy", "repository", "engineVersion", "environment"].includes(key),
      ) ||
      metadata.layout !== 1 ||
      metadata.corpusPolicy !== 1 ||
      metadata.repository !== location.repository ||
      metadata.engineVersion !== GRAPH_VERSIONS.codegraph ||
      !sameEnvironment(metadata.environment, environment)
    )
      continue;
    if (!(await safeCompletedCorpus(path.join(candidate, "analysis")))) continue;
    if (!(await safeCodegraphInputs(root, path.join(candidate, "analysis"), run))) continue;
    const current = graphAnalysisRoot(root, "codegraph");
    const staged = path.join(path.dirname(current), `.restoring-codegraph-${randomUUID()}`);
    await assertGraphStoragePath(root, staged);
    try {
      const cached = path.join(candidate, "analysis");
      await assertIndependentAnalysis(cached);
      await mkdir(path.dirname(staged), { recursive: true });
      await cp(cached, staged, { recursive: true, dereference: false });
      await assertIndependentAnalysis(staged);
      if (!(await inspectCodeAnalysisAt(root, staged, run))) continue;
      await replaceGraphDirectory(staged, current, root);
      return "restored";
    } finally {
      await rm(staged, { recursive: true, force: true });
    }
  }
  return "cold";
}

export async function completedAnalysisCache(
  root: string,
  engine: "codegraph" | "graphify" | "graphify-code",
  run: GraphProcess,
  environment: GraphReuseEnvironment = graphReuseEnvironment(),
): Promise<{ repository: string; directory: string } | undefined> {
  const git = await run("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: root,
  });
  if (git.exitCode !== 0 || !path.isAbsolute(git.stdout.trim())) return undefined;
  const repository = await realpath(git.stdout.trim());
  return {
    repository,
    directory: path.join(repository, "qfai-graph-cache", graphEnvironmentKey(environment), engine),
  };
}

export async function publishCompletedCodeAnalysis(
  root: string,
  run: GraphProcess,
  environment: GraphReuseEnvironment = graphReuseEnvironment(),
): Promise<"published" | "unavailable"> {
  let staged: string | undefined;
  try {
    if (environment.platform !== "win32" || environment.architecture !== "x64")
      return "unavailable";
    const native = await run(graphRuntimePaths(root).codegraphNode, ["--version"], {
      cwd: root,
      env: codegraphEnvironment(root),
    });
    if (native.exitCode !== 0 || !verifiedNativeRelease(native.stdout)) return "unavailable";
    const cache = await completedAnalysisCache(root, "codegraph", run, environment);
    if (!cache) return "unavailable";
    await ensureCacheDirectory(cache.repository, cache.directory);
    const analysis = graphAnalysisRoot(root, "codegraph");
    if (!(await safeCompletedCorpus(analysis)) || !(await safeCodegraphInputs(root, analysis, run)))
      return "unavailable";
    const identity = randomUUID();
    staged = path.join(cache.directory, `.publishing-${identity}`);
    await mkdir(staged);
    await cp(analysis, path.join(staged, "analysis"), { recursive: true, dereference: false });
    await assertIndependentAnalysis(path.join(staged, "analysis"));
    if (
      !(await safeCompletedCorpus(path.join(staged, "analysis"))) ||
      !(await safeCodegraphInputs(root, path.join(staged, "analysis"), run))
    )
      return "unavailable";
    if (!(await nativeCodeAnalysisCurrent(root, path.join(staged, "analysis"), run)))
      return "unavailable";
    await writeFile(
      path.join(staged, "completed.json"),
      JSON.stringify({
        layout: 1,
        corpusPolicy: 1,
        repository: cache.repository,
        engineVersion: GRAPH_VERSIONS.codegraph,
        environment,
      }) + "\n",
    );
    await rename(staged, path.join(cache.directory, identity));
    return "published";
  } catch {
    return "unavailable";
  } finally {
    if (staged) await rm(staged, { recursive: true, force: true });
  }
}

export async function ensureCacheDirectory(repository: string, directory: string): Promise<void> {
  const relative = path.relative(repository, directory);
  const parts = relative.split(path.sep);
  if (path.isAbsolute(relative) || parts.includes("..") || parts[0] !== "qfai-graph-cache")
    throw new Error("Unsafe completed analysis path.");
  for (let depth = 1; depth <= parts.length; depth += 1) {
    const component = path.join(repository, ...parts.slice(0, depth));
    let stats;
    try {
      stats = await lstat(component);
    } catch (cause: unknown) {
      if (!isEnoent(cause)) throw cause;
      await mkdir(component);
      stats = await lstat(component);
    }
    if (stats.isSymbolicLink() || !stats.isDirectory())
      throw new Error("Unsafe completed analysis path.");
  }
}

export async function cacheDirectorySafe(repository: string, candidate: string): Promise<boolean> {
  const relative = path.relative(repository, candidate);
  const parts = relative.split(path.sep);
  if (path.isAbsolute(relative) || parts.includes("..") || parts[0] !== "qfai-graph-cache")
    return false;
  for (let depth = 1; depth <= parts.length; depth += 1) {
    const stats = await lstat(path.join(repository, ...parts.slice(0, depth)));
    if (stats.isSymbolicLink() || !stats.isDirectory()) return false;
  }
  return true;
}

export async function readSnapshotMetadata(
  candidate: string,
): Promise<Record<string, unknown> | undefined> {
  try {
    const stats = await lstat(path.join(candidate, "completed.json"));
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) return undefined;
    const metadata: unknown = JSON.parse(
      await readFile(path.join(candidate, "completed.json"), "utf8"),
    );
    return object(metadata) ? metadata : undefined;
  } catch (cause: unknown) {
    if (isEnoent(cause) || cause instanceof SyntaxError) return undefined;
    throw cause;
  }
}

export function sameEnvironment(value: unknown, environment: GraphReuseEnvironment): boolean {
  return (
    object(value) &&
    Object.keys(value).length === 3 &&
    value.platform === environment.platform &&
    value.architecture === environment.architecture &&
    value.machine === environment.machine
  );
}

export async function safeCompletedCorpus(
  directory: string,
  relative = "",
  engineDirectory = ".codegraph",
): Promise<boolean> {
  try {
    for (const entry of await readdir(path.join(directory, ...relative.split("/")), {
      withFileTypes: true,
    })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      const input = next.startsWith(`${engineDirectory}/`)
        ? next.slice(engineDirectory.length + 1)
        : next;
      if (
        (next !== engineDirectory && excludedGraphInput(input)) ||
        /\.(?:pid|lock)$/i.test(entry.name)
      )
        return false;
      const stats = await lstat(path.join(directory, ...next.split("/")));
      if (stats.isSymbolicLink() || (stats.isFile() && stats.nlink !== 1)) return false;
      if (stats.isDirectory() && !(await safeCompletedCorpus(directory, next, engineDirectory)))
        return false;
      if (!stats.isDirectory() && !stats.isFile()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function safeCodegraphInputs(
  root: string,
  analysis: string,
  run: GraphProcess,
): Promise<boolean> {
  const runtime = graphRuntimePaths(root);
  const result = await run(
    runtime.codegraphNode,
    [
      "--liftoff-only",
      path.resolve(getInitAssetsDir(), "..", "graph", "codegraph-native.mjs"),
      runtime.codegraphSdk,
      analysis,
      "inventory",
    ],
    { cwd: analysis, env: codegraphEnvironment(root) },
  );
  if (result.exitCode !== 0) return false;
  try {
    const inventory: unknown = JSON.parse(result.stdout);
    if (!object(inventory) || !Array.isArray(inventory.files)) return false;
    for (const file of inventory.files) {
      if (
        typeof file !== "string" ||
        !file ||
        path.posix.isAbsolute(file) ||
        path.win32.isAbsolute(file)
      )
        return false;
      const normalized = file.replaceAll("\\", "/");
      const parts = normalized.split("/");
      if (
        parts.some((part) => !part || part === "." || part === "..") ||
        excludedGraphInput(normalized)
      )
        return false;
      const stats = await lstat(path.join(analysis, ...parts));
      if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1) return false;
    }
    return true;
  } catch {
    return false;
  }
}
