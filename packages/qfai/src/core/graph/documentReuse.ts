import { randomUUID } from "node:crypto";
import { cp, lstat, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getInitAssetsDir } from "../../shared/assets.js";
import { excludedGraphInput } from "./analysis.js";
import { GRAPH_VERSIONS, graphAnalysisRoot, graphRuntimePaths } from "./layout.js";
import {
  GRAPH_PYTHON_FLAGS,
  graphifyEnvironment,
  graphifyCorpusEnvironment,
  type GraphProcess,
} from "./process.js";
import {
  cacheDirectorySafe,
  completedAnalysisCache,
  ensureCacheDirectory,
  graphReuseEnvironment,
  readSnapshotMetadata,
  safeCompletedCorpus,
  sameEnvironment,
  type GraphReuseEnvironment,
} from "./reuse.js";
import {
  assertGraphStoragePath,
  assertIndependentAnalysis,
  replaceGraphDirectory,
} from "./storage.js";

type Inspect = (analysis: string, refresh: boolean) => Promise<boolean>;

export async function restoreCompletedDocumentAnalysis(
  root: string,
  run: GraphProcess,
  inspect: Inspect,
  environment: GraphReuseEnvironment = graphReuseEnvironment(),
): Promise<"restored" | "cold"> {
  let staged: string | undefined;
  try {
    if (!(await compatible(root, run, environment))) return "cold";
    const cache = await completedAnalysisCache(root, "graphify", run, environment);
    if (!cache) return "cold";
    for (const entry of await readdir(cache.directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || entry.name.startsWith(".")) continue;
      const candidate = path.join(cache.directory, entry.name);
      if (!(await cacheDirectorySafe(cache.repository, candidate))) continue;
      const metadata = await readSnapshotMetadata(candidate);
      if (
        !metadata ||
        Object.keys(metadata).length !== 5 ||
        metadata.layout !== 1 ||
        metadata.corpusPolicy !== 1 ||
        metadata.repository !== cache.repository ||
        metadata.engineVersion !== GRAPH_VERSIONS.graphify ||
        !sameEnvironment(metadata.environment, environment)
      )
        continue;
      const analysis = path.join(candidate, "analysis");
      if (!(await safeDocumentCopy(root, analysis, run))) continue;
      const current = graphAnalysisRoot(root, "graphify");
      staged = path.join(path.dirname(current), `.restoring-graphify-${randomUUID()}`);
      await assertGraphStoragePath(root, staged);
      await mkdir(path.dirname(staged), { recursive: true });
      await cp(analysis, staged, { recursive: true, dereference: false });
      await assertIndependentAnalysis(staged);
      if (await inspect(staged, true)) {
        await replaceGraphDirectory(staged, current, root);
        return "restored";
      }
      await rm(staged, { recursive: true, force: true });
      staged = undefined;
    }
  } catch {
    return "cold";
  } finally {
    if (staged) await discard(staged);
  }
  return "cold";
}

export async function publishCompletedDocumentAnalysis(
  root: string,
  run: GraphProcess,
  inspect: Inspect,
  environment: GraphReuseEnvironment = graphReuseEnvironment(),
): Promise<"published" | "unavailable"> {
  let staged: string | undefined;
  try {
    if (!(await compatible(root, run, environment))) return "unavailable";
    const cache = await completedAnalysisCache(root, "graphify", run, environment);
    if (!cache) return "unavailable";
    await ensureCacheDirectory(cache.repository, cache.directory);
    const analysis = graphAnalysisRoot(root, "graphify");
    if (!(await safeDocumentCopy(root, analysis, run))) return "unavailable";
    const identity = randomUUID();
    staged = path.join(cache.directory, `.publishing-${identity}`);
    await mkdir(staged);
    const copy = path.join(staged, "analysis");
    await cp(analysis, copy, { recursive: true, dereference: false });
    await assertIndependentAnalysis(copy);
    if (!(await safeDocumentCopy(root, copy, run)) || !(await inspect(copy, false)))
      return "unavailable";
    await writeFile(
      path.join(staged, "completed.json"),
      JSON.stringify({
        layout: 1,
        corpusPolicy: 1,
        repository: cache.repository,
        engineVersion: GRAPH_VERSIONS.graphify,
        environment,
      }) + "\n",
    );
    await rename(staged, path.join(cache.directory, identity));
    return "published";
  } catch {
    return "unavailable";
  } finally {
    if (staged) await discard(staged);
  }
}

async function compatible(
  root: string,
  run: GraphProcess,
  environment: GraphReuseEnvironment,
): Promise<boolean> {
  if (environment.platform !== "win32" || environment.architecture !== "x64") return false;
  const result = await run(
    graphRuntimePaths(root).python,
    [...GRAPH_PYTHON_FLAGS, "-c", "import sys; print(sys.version.split()[0])"],
    { cwd: root, env: graphifyEnvironment(root) },
  );
  return result.exitCode === 0 && result.stdout.trim() === "3.12.13";
}

export async function safeDocumentCopy(
  root: string,
  analysis: string,
  run: GraphProcess,
): Promise<boolean> {
  if (!(await safeCompletedCorpus(analysis, "", "graphify-out"))) return false;
  const result = await run(
    graphRuntimePaths(root).python,
    [
      ...GRAPH_PYTHON_FLAGS,
      path.resolve(getInitAssetsDir(), "..", "graph", "graphify-native.py"),
      path.toNamespacedPath(analysis),
      "inventory",
    ],
    { cwd: analysis, env: graphifyCorpusEnvironment(root, analysis) },
  );
  if (result.exitCode !== 0) return false;
  try {
    const inventory: unknown = JSON.parse(result.stdout);
    if (
      typeof inventory !== "object" ||
      inventory === null ||
      Object.keys(inventory).length !== 1 ||
      !("files" in inventory) ||
      !Array.isArray(inventory.files)
    )
      return false;
    for (const file of inventory.files) {
      if (typeof file !== "string" || path.posix.isAbsolute(file) || path.win32.isAbsolute(file))
        return false;
      const parts = file.replaceAll("\\", "/").split("/");
      if (
        parts.some((part) => !part || part === "." || part === "..") ||
        excludedGraphInput(parts.join("/"))
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

async function discard(directory: string): Promise<void> {
  try {
    await rm(directory, { recursive: true, force: true });
  } catch {
    // An unfinished hidden candidate is never eligible for restoration.
  }
}
