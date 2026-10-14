import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  publishCompletedDocumentAnalysis,
  restoreCompletedDocumentAnalysis,
  safeDocumentCopy,
} from "./documentReuse.js";
import type { GraphReuseEnvironment } from "./reuse.js";
import { withGraphLock } from "./locks.js";
import path from "node:path";
import { getInitAssetsDir } from "../../shared/assets.js";
import { isEnoent } from "../fs/errno.js";
import { mirrorGraphCorpus } from "./analysis.js";
import { graphAnalysisRoot, graphRuntimePaths, GRAPH_VERSIONS } from "./layout.js";
import {
  GRAPH_PYTHON_FLAGS,
  graphifyConfigurationSafe,
  graphifyCorpusEnvironment,
  runGraphProcess,
  type GraphProcess,
} from "./process.js";
import {
  assertGraphStoragePath,
  assertIndependentAnalysis,
  replaceGraphDirectory,
} from "./storage.js";

export interface DocumentPreparation {
  status: "prepared" | "not-ready" | "failed";
  source?: "current" | "restored" | "generated";
  reuse?: "published" | "unavailable";
  recovery?: string;
}

export interface DocumentScopeStatus {
  current: boolean;
  unsupported: string[];
  unreadable: string[];
}

interface GraphProcessing {
  readonly backend: "ollama" | "openai";
  readonly model: string;
  readonly endpoint?: string;
  readonly scope?: string[];
  readonly credentialEnv?: string;
}

function notCurrent(): DocumentScopeStatus {
  return { current: false, unsupported: [], unreadable: [] };
}

export interface ExternalProcessingRequest {
  readonly destination: string;
  readonly scope: readonly string[];
  readonly backend: string;
  readonly model: string;
  readonly worktree: string;
}

export type ApproveExternalProcessing = (request: ExternalProcessingRequest) => Promise<boolean>;

export const DOCUMENT_PROCESSING_SETUP =
  'Configure a selected local backend and model in .qfai/graph-processing.json using .agents/rules/graph-exploration.md, then run node .qfai/tools/graph-cli.mjs documents "<question>".';

export async function prepareGraphifyCodeAnalysis(
  root: string,
  run: GraphProcess = runGraphProcess,
): Promise<DocumentPreparation> {
  if (!(await graphifyConfigurationSafe(root))) return providerConflict();
  const current = graphAnalysisRoot(root, "graphify-code");
  const staged = path.join(path.dirname(current), `.preparing-graphify-code-${randomUUID()}`);
  await assertGraphStoragePath(root, staged);
  await mkdir(staged, { recursive: true });
  try {
    await mirrorGraphCorpus(root, staged);
    const result = await run(
      graphRuntimePaths(root).python,
      [
        ...GRAPH_PYTHON_FLAGS,
        "-m",
        "graphify",
        "extract",
        path.toNamespacedPath(staged),
        "--code-only",
        "--no-cluster",
        "--no-dedup",
        "--max-workers",
        "1",
        "--max-concurrency",
        "1",
      ],
      { cwd: staged, env: graphifyCorpusEnvironment(root, staged) },
    );
    if (
      result.exitCode !== 0 ||
      !(await currentGraphifyCorpus(root, staged, graphRuntimePaths(root).python, run, "ast"))
    ) {
      return { status: "failed", recovery: "Repair local Graphify code analysis." };
    }
    await writeFile(
      path.join(staged, "graphify-out", "managed.json"),
      JSON.stringify({ engineVersion: GRAPH_VERSIONS.graphify, scope: "code" }),
    );
    await assertIndependentAnalysis(staged);
    await replaceGraphDirectory(staged, current, root);
    return { status: "prepared" };
  } finally {
    await rm(staged, { recursive: true, force: true });
  }
}

export async function prepareDocumentAnalysis(
  root: string,
  run: GraphProcess = runGraphProcess,
  approveExternal: ApproveExternalProcessing = () => Promise.resolve(false),
  environment?: GraphReuseEnvironment,
): Promise<DocumentPreparation> {
  return withGraphLock(root, "analysis", () =>
    prepareDocumentAnalysisLocked(root, run, approveExternal, environment),
  );
}

export async function prepareDocumentAnalysisLocked(
  root: string,
  run: GraphProcess = runGraphProcess,
  approveExternal: ApproveExternalProcessing = () => Promise.resolve(false),
  environment?: GraphReuseEnvironment,
): Promise<DocumentPreparation> {
  if (!(await graphifyConfigurationSafe(root))) return providerConflict();
  if (await inspectDocumentAnalysis(root, run)) return { status: "prepared", source: "current" };
  const processing = await readGraphProcessing(root);
  if (!processing) {
    return {
      status: "not-ready",
      recovery: DOCUMENT_PROCESSING_SETUP,
    };
  }
  const inspect = async (analysis: string, refresh: boolean) =>
    (await inspectDocumentScopeAt(root, analysis, run, refresh)).current;
  if ((await restoreCompletedDocumentAnalysis(root, run, inspect, environment)) === "restored")
    return { status: "prepared", source: "restored" };
  const endpoint = processing.endpoint ?? "http://127.0.0.1:11434/v1";
  const selected = new URL(endpoint);
  const backend = processing.backend;
  const credential =
    typeof processing.credentialEnv === "string"
      ? process.env[processing.credentialEnv]
      : undefined;
  if (processing.credentialEnv !== undefined && !credential) {
    return {
      status: "not-ready",
      recovery:
        "Set the explicitly selected credential environment variable before document processing.",
    };
  }
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(selected.hostname);
  let scope: readonly string[] | undefined;
  if (processing.scope !== undefined) {
    if (!validDocumentScope(processing.scope))
      return { status: "not-ready", recovery: "Select the exact document scope for processing." };
    scope = Object.freeze(processing.scope.map((item) => item.replaceAll("\\", "/")));
  }
  if (!local) {
    if (!scope) {
      return {
        status: "not-ready",
        recovery: "Select the exact document scope for external processing.",
      };
    }
    const approval: unknown = await approveExternal(
      Object.freeze({
        destination: endpoint,
        scope,
        backend,
        model: processing.model,
        worktree: root,
      }),
    );
    if (approval !== true) {
      return {
        status: "not-ready",
        recovery:
          "External document processing requires explicit human authorization of its destination and scope.",
      };
    }
  }
  const current = graphAnalysisRoot(root, "graphify");
  const staged = path.join(path.dirname(current), `.preparing-graphify-${randomUUID()}`);
  await assertGraphStoragePath(root, staged);
  await mkdir(staged, { recursive: true });
  try {
    await mirrorGraphCorpus(root, staged, scope);
    const result = await run(
      graphRuntimePaths(root).python,
      [
        ...GRAPH_PYTHON_FLAGS,
        "-m",
        "graphify",
        "extract",
        path.toNamespacedPath(staged),
        "--backend",
        backend,
        "--model",
        processing.model,
        "--no-cluster",
        "--no-dedup",
        "--max-workers",
        "1",
        "--max-concurrency",
        "1",
      ],
      {
        cwd: staged,
        env: {
          ...graphifyCorpusEnvironment(root, staged),
          [backend === "ollama" ? "OLLAMA_BASE_URL" : "OPENAI_BASE_URL"]: endpoint,
          ...(credential
            ? { [backend === "ollama" ? "OLLAMA_API_KEY" : "OPENAI_API_KEY"]: credential }
            : {}),
        },
      },
    );
    if (
      result.exitCode !== 0 ||
      !(await currentGraphifyCorpus(root, staged, graphRuntimePaths(root).python, run))
    ) {
      return {
        status: "failed",
        recovery: "Check the selected local model and repair Graphify document analysis.",
      };
    }
    await writeFile(
      path.join(staged, "graphify-out", "managed.json"),
      JSON.stringify({ engineVersion: GRAPH_VERSIONS.graphify, scope: "documents", processing }),
    );
    await assertIndependentAnalysis(staged);
    await replaceGraphDirectory(staged, current, root);
    return {
      status: "prepared",
      source: "generated",
      reuse: await publishCompletedDocumentAnalysis(root, run, inspect, environment),
    };
  } finally {
    await rm(staged, { recursive: true, force: true });
  }
}

export async function readGraphProcessing(root: string): Promise<GraphProcessing | undefined> {
  const processing = await readOptionalJson(path.join(root, ".qfai", "graph-processing.json"));
  return validGraphProcessing(processing) ? processing : undefined;
}

function validGraphProcessing(processing: unknown): processing is GraphProcessing {
  const allowed = new Set(["backend", "model", "endpoint", "scope", "credentialEnv"]);
  if (
    !object(processing) ||
    Object.keys(processing).some((key) => !allowed.has(key)) ||
    (processing.backend !== "ollama" && processing.backend !== "openai") ||
    typeof processing.model !== "string" ||
    !processing.model.trim() ||
    (processing.scope !== undefined && !validDocumentScope(processing.scope)) ||
    (processing.credentialEnv !== undefined &&
      (typeof processing.credentialEnv !== "string" ||
        !/^[A-Z_][A-Z0-9_]*$/.test(processing.credentialEnv)))
  )
    return false;
  if (processing.endpoint !== undefined) {
    if (typeof processing.endpoint !== "string" || !processing.endpoint.trim()) return false;
    try {
      const endpoint = new URL(processing.endpoint);
      if (
        !["http:", "https:"].includes(endpoint.protocol) ||
        endpoint.username ||
        endpoint.password ||
        endpoint.search ||
        endpoint.hash
      )
        return false;
    } catch {
      return false;
    }
  }
  return true;
}

export async function inspectDocumentAnalysis(root: string, run: GraphProcess): Promise<boolean> {
  return (await inspectDocumentScope(root, run)).current;
}

export async function inspectDocumentScope(
  root: string,
  run: GraphProcess,
): Promise<DocumentScopeStatus> {
  const analysis = graphAnalysisRoot(root, "graphify");
  await assertGraphStoragePath(root, analysis);
  return inspectDocumentScopeAt(root, analysis, run);
}

async function inspectDocumentScopeAt(
  root: string,
  analysis: string,
  run: GraphProcess,
  refresh = true,
): Promise<DocumentScopeStatus> {
  const managed = await readOptionalJson(path.join(analysis, "graphify-out", "managed.json"));
  const selected = await readGraphProcessing(root);
  const processing = await processingForCompletedQuery(
    root,
    selected,
    object(managed) ? managed.processing : undefined,
  );
  if (
    !object(managed) ||
    Object.keys(managed).length !== 3 ||
    managed.engineVersion !== GRAPH_VERSIONS.graphify ||
    managed.scope !== "documents" ||
    !sameProcessing(managed.processing, processing)
  )
    return notCurrent();
  if (!(await safeDocumentCopy(root, analysis, run))) return notCurrent();
  const scope =
    object(processing) && validDocumentScope(processing.scope) ? processing.scope : undefined;
  if (refresh) await mirrorGraphCorpus(root, analysis, scope);
  return nativeGraphifyScope(root, analysis, graphRuntimePaths(root).python, run);
}

async function processingForCompletedQuery(
  root: string,
  selected: unknown,
  recorded: unknown,
): Promise<unknown> {
  if (selected !== undefined) return selected;
  try {
    await readFile(path.join(root, ".qfai", "graph-processing.json"));
    return undefined;
  } catch (cause: unknown) {
    if (!isEnoent(cause)) throw cause;
  }
  if (!validGraphProcessing(recorded)) return undefined;
  return recorded;
}

async function currentGraphifyCorpus(
  root: string,
  analysis: string,
  python: string,
  run: GraphProcess,
  kind: "semantic" | "ast" = "semantic",
): Promise<boolean> {
  return (await nativeGraphifyScope(root, analysis, python, run, kind)).current;
}

async function nativeGraphifyScope(
  root: string,
  analysis: string,
  python: string,
  run: GraphProcess,
  kind: "semantic" | "ast" = "semantic",
): Promise<DocumentScopeStatus> {
  if (!(await graphifyConfigurationSafe(root))) return notCurrent();
  const result = await run(
    python,
    [
      ...GRAPH_PYTHON_FLAGS,
      path.resolve(getInitAssetsDir(), "..", "graph", "graphify-native.py"),
      path.toNamespacedPath(analysis),
      kind,
    ],
    {
      cwd: analysis,
      env: graphifyCorpusEnvironment(root, analysis),
    },
  );
  if (result.exitCode !== 0) return notCurrent();
  let state: unknown;
  try {
    state = JSON.parse(result.stdout);
  } catch (cause: unknown) {
    if (!(cause instanceof SyntaxError)) throw cause;
    return notCurrent();
  }
  if (
    !object(state) ||
    typeof state.current !== "boolean" ||
    !stringArray(state.unsupported) ||
    !stringArray(state.unreadable)
  )
    return notCurrent();
  const sourcePath = (file: string) =>
    path.isAbsolute(file)
      ? path
          .relative(path.toNamespacedPath(analysis), path.toNamespacedPath(file))
          .split(path.sep)
          .join("/")
      : file;
  return {
    current: state.current,
    unsupported: state.unsupported.map(sourcePath),
    unreadable: state.unreadable.map(sourcePath),
  };
}

async function readOptionalJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (cause: unknown) {
    if (isEnoent(cause) || cause instanceof SyntaxError) return undefined;
    throw cause;
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameProcessing(left: unknown, right: unknown): boolean {
  if (!object(left) || !object(right)) return false;
  const fields = ["backend", "model", "endpoint", "credentialEnv", "scope"];
  if (Object.keys(left).some((key) => !fields.includes(key))) return false;
  return fields.every((key) => JSON.stringify(left[key]) === JSON.stringify(right[key]));
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === "string");
}

function validDocumentScope(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item: unknown) =>
        typeof item === "string" &&
        item !== "" &&
        !path.isAbsolute(item) &&
        !item.split(/[\\/]/).some((part) => part === ".." || part === "." || part === ""),
    )
  );
}

function providerConflict(): DocumentPreparation {
  return {
    status: "not-ready",
    recovery:
      "Review private Graphify provider settings and unsafe home paths before processing; existing settings were retained.",
  };
}
