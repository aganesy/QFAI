import { lstat, mkdir, readFile, readdir, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getInitAssetsDir } from "../../shared/assets.js";
import { readInspectedRegularFile } from "../../shared/boundedRead.js";
import { isDirectoryInsideRoot, loadConfig, resolvePath } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { GRAPH_VERSIONS, graphRuntimePaths, graphAnalysisRoot } from "./layout.js";
import { GraphLocalStateError } from "./localFiles.js";
import type { GraphProcess } from "./process.js";
import { codegraphEnvironment } from "./process.js";
import { assertGraphStoragePath, assertIndependentAnalysis, checkRefreshCopy } from "./storage.js";
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
  return inspectCodeAnalysisAt(root, analysis, run, "staged");
}

/**
 * `in-place` refreshes the inputs of a copy nothing else reads yet. `staged` checks the active
 * analysis where it stands when its inputs already match the project; otherwise it refreshes and
 * checks an independent copy and activates it only when it is current, so a failed refresh
 * leaves the previous graph paired with the inputs it was built from.
 */
export type CodeInputRefresh = "in-place" | "staged";

export async function inspectCodeAnalysisAt(
  root: string,
  analysis: string,
  run: GraphProcess,
  refresh: CodeInputRefresh = "in-place",
): Promise<boolean> {
  await assertGraphStoragePath(root, analysis);
  try {
    if (!(await lstat(path.join(analysis, ".codegraph", "codegraph.db"))).isFile()) return false;
  } catch (cause: unknown) {
    if (isEnoent(cause)) return false;
    throw cause;
  }
  if (refresh === "in-place") await mirrorGraphCorpus(root, analysis);
  else if (await graphCorpusChanged(root, analysis))
    return checkRefreshCopy(
      root,
      analysis,
      "codegraph",
      async (staged) => {
        // The mirror checks the copy's independence before it writes anything.
        await mirrorGraphCorpus(root, staged);
        return nativeCodeAnalysisCurrent(root, staged, run);
      },
      (current) => current,
    );
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

/**
 * `qfai.config.yaml` cannot be read, or gives no usable `paths.deliberationDir`, so the graph
 * cannot know which directory to keep out of its corpus.
 */
export class GraphConfigUnreadableError extends GraphLocalStateError {
  constructor(configFile: string, unreadable: boolean) {
    super(
      unreadable
        ? `${configFile} could not be read or parsed.`
        : `${configFile} gives no usable paths.deliberationDir.`,
      `Correct ${configFile}, then retry.`,
    );
  }
}

/**
 * The configured `paths.deliberationDir`, relative to `root` and written with `/`. It throws
 * where the configuration cannot be read or its value is rejected, rather than guess the
 * default: the project may keep its records elsewhere. A value naming the project root, or a
 * directory outside it, is rejected too: it would leave the corpus nothing to exclude.
 */
export async function graphDeliberationDir(root: string): Promise<string> {
  const { config, document, issues, configPath } = await loadConfig(root);
  const file = path.basename(configPath);
  if (document === undefined && issues.length > 0) throw new GraphConfigUnreadableError(file, true);
  const paths = object(document) ? document.paths : undefined;
  const value = object(paths) ? paths.deliberationDir : undefined;
  if (
    (document !== undefined && !object(document)) ||
    (paths !== undefined && !object(paths)) ||
    (value !== undefined &&
      (typeof value !== "string" ||
        value.trim() === "" ||
        !isDirectoryInsideRoot(root, value.replace(/\\/g, "/"))))
  )
    throw new GraphConfigUnreadableError(file, false);
  return path
    .relative(root, resolvePath(root, config, "deliberationDir"))
    .split(path.sep)
    .join("/");
}

export function excludedGraphInput(relative: string, deliberationDir: string): boolean {
  const parts = relative.split("/");
  const name = parts.at(-1) ?? "";
  const lowered = relative.toLowerCase();
  const deliberation = deliberationDir.toLowerCase();
  return (
    parts.some((part) => excludedDirectories.has(part.toLowerCase())) ||
    /^\.qfai\/(?:tools|report|evidence|review)(?:\/|$)/i.test(relative) ||
    lowered === deliberation ||
    lowered.startsWith(`${deliberation}/`) ||
    lowered === ".qfai/graph-processing.json" ||
    /^(?:\.npmrc|\.pypirc|\.netrc|\.git-credentials)$/i.test(name) ||
    /^\.env(?:\.|$)/i.test(name) ||
    /\.(?:pem|key|p12|pfx|keystore)$/i.test(name) ||
    /^(?:id_(?:rsa|dsa|ecdsa|ed25519)|credentials?(?:\.|$)|secrets?(?:\.|$)|\.mcp\.json$)/i.test(
      name,
    )
  );
}

/**
 * `checked` says the caller has just walked `destination` with a check that refuses every shared
 * file and link `assertIndependentAnalysis` refuses, such as `safeDocumentCopy`, so the walk is
 * not repeated. Any other caller leaves it `unchecked`.
 */
export type DestinationIndependence = "unchecked" | "checked";

export async function mirrorGraphCorpus(
  root: string,
  destination: string,
  scope?: readonly string[],
  independence: DestinationIndependence = "unchecked",
): Promise<void> {
  await walkGraphCorpus(root, destination, scope, "write", independence);
}

/** Whether mirroring the corpus into `destination` would change any file there. Writes nothing. */
export async function graphCorpusChanged(
  root: string,
  destination: string,
  scope?: readonly string[],
  independence: DestinationIndependence = "unchecked",
): Promise<boolean> {
  return walkGraphCorpus(root, destination, scope, "compare", independence);
}

/**
 * In `write` mode, mirrors the corpus into `destination` and returns false; a file whose bytes
 * already match its source is left untouched, so a repeated mirror of an unchanged corpus writes
 * nothing. Only contents are mirrored: neither engine reads a file's mode, so a change of
 * permissions alone is not copied. In `compare` mode it writes nothing and returns true at the
 * first entry a mirror would add, replace or remove.
 */
async function walkGraphCorpus(
  root: string,
  destination: string,
  scope: readonly string[] | undefined,
  mode: "write" | "compare",
  independence: DestinationIndependence,
): Promise<boolean> {
  await assertGraphStoragePath(root, destination);
  if (independence === "unchecked") await assertIndependentAnalysis(destination);
  const files = new Set<string>();
  const deliberationDir = await graphDeliberationDir(root);
  let changed = false;
  await visit("");
  await removeAbsent("");
  return changed;

  async function visit(relative: string): Promise<void> {
    for (const entry of await readdir(path.join(root, ...relative.split("/")), {
      withFileTypes: true,
    })) {
      if (changed) return;
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (excludedGraphInput(next, deliberationDir) || entry.isSymbolicLink()) continue;
      if (
        scope &&
        !scope.some(
          (item) => item === next || next.startsWith(`${item}/`) || item.startsWith(`${next}/`),
        )
      )
        continue;
      const target = path.join(destination, ...next.split("/"));
      if (entry.isDirectory()) {
        // A mirror creates no empty directory, so an absent one changes nothing until a file in it
        // would be copied.
        if (mode === "compare") {
          const kind = await entryKind(target);
          if (kind !== "directory" && kind !== "absent") changed = true;
        } else await replaceOtherEntryType(target, true);
        if (!changed) await visit(next);
      } else if (entry.isFile()) {
        const source = path.join(root, ...next.split("/"));
        const stats = await lstat(source);
        if (!stats.isFile() || stats.nlink > 1) continue;
        // Sizes are compared before any contents are read, so a changed file of another size costs
        // no read of its copy, and in `compare` mode no read of the source either.
        const copied = await regularFileSize(target);
        if (mode === "compare" && copied !== stats.size) {
          changed = true;
          continue;
        }
        // Read from the file `stats` describes: a source replaced since that check is left out of
        // this mirror, and the next one checks and copies whatever the path then names. Any other
        // read failure fails the mirror, so the corpus is never quietly incomplete.
        const bytes = await readInspectedRegularFile(source, stats).catch((cause: unknown) => {
          throw new Error(
            `Graph corpus source ${source} could not be read: ${cause instanceof Error ? cause.message : String(cause)}`,
            { cause },
          );
        });
        if (bytes === undefined) continue;
        files.add(next);
        if (copied === bytes.length && bytes.equals(await readFile(target))) continue;
        if (mode === "compare") {
          changed = true;
          continue;
        }
        await replaceOtherEntryType(target, false);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, bytes);
      }
    }
  }

  /**
   * Removes every staged entry the walk did not mirror, and returns whether the directory still
   * holds one it did. A mirror creates no empty directory, so in `write` mode a staged directory
   * left holding nothing is removed too: one whose source is gone, or whose source path now names
   * an entry the mirror skips. In `compare` mode an empty directory alone is not a change, as it
   * holds no input.
   */
  async function removeAbsent(relative: string): Promise<boolean> {
    let kept = false;
    for (const entry of await readdir(path.join(destination, ...relative.split("/")), {
      withFileTypes: true,
    })) {
      if (changed) return true;
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.name === ".codegraph" || entry.name === ".git" || entry.name === "graphify-out") {
        kept = true;
        continue;
      }
      const target = path.join(destination, ...next.split("/"));
      if (entry.isDirectory()) {
        if (await removeAbsent(next)) kept = true;
        else if (mode === "write") await rmdir(target);
      } else if (files.has(next)) kept = true;
      else if (mode === "compare") changed = true;
      else await rm(target);
    }
    return kept;
  }
}

async function entryKind(target: string): Promise<"directory" | "file" | "other" | "absent"> {
  try {
    const stats = await lstat(target);
    if (stats.isDirectory()) return "directory";
    return stats.isFile() ? "file" : "other";
  } catch (cause: unknown) {
    if (isEnoent(cause)) return "absent";
    throw cause;
  }
}

/** The size of the regular file at `target`, or `undefined` when it holds anything else or nothing. */
async function regularFileSize(target: string): Promise<number | undefined> {
  try {
    const stats = await lstat(target);
    return stats.isFile() ? stats.size : undefined;
  } catch (cause: unknown) {
    if (isEnoent(cause)) return undefined;
    throw cause;
  }
}

/**
 * Removes the staged entry at `target` when it is not of the kind the source now holds, so a
 * source directory replaced by a file, or a file replaced by a directory, can be copied in.
 */
async function replaceOtherEntryType(target: string, directory: boolean): Promise<void> {
  try {
    const stats = await lstat(target);
    if (directory ? stats.isDirectory() : stats.isFile()) return;
  } catch (cause: unknown) {
    if (isEnoent(cause)) return;
    throw cause;
  }
  await rm(target, { recursive: true, force: true });
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
