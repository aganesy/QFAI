import {
  GRAPH_PYTHON_FLAGS,
  codegraphEnvironment,
  graphifyCorpusEnvironment,
  runGraphProcess,
  type GraphProcess,
} from "./process.js";
import { inspectCodeCoverage, inspectCurrentCodeAnalysis } from "./analysis.js";
import { graphAnalysisRoot, graphRuntimePaths } from "./layout.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { findUnsafeHostFileComponent } from "../init/fsGuards.js";
import { inspectDocumentScope, readGraphProcessing } from "./documents.js";

export interface GraphQuestion {
  domain: "code" | "documents";
  question: string;
}

export interface GraphAnswer {
  requestedScope: Readonly<GraphQuestion>;
  engine: "codegraph" | "graphify";
  status: "answered" | "not-ready" | "failed" | "no-match" | "incomplete";
  coverage?: {
    unsupported: string[];
    unreadable: string[];
    unparsed?: string[];
    complete?: boolean;
  };
  answer?: string;
  failure?: string;
  inferenceNotice?: string;
  recovery?: string;
}

export async function readKnownGraphFile(root: string, relative: string): Promise<string> {
  const parts = relative.split(/[\\/]/);
  if (
    path.isAbsolute(relative) ||
    parts.some((part) => part === ".." || part === "" || part === ".") ||
    (await findUnsafeHostFileComponent(root, parts))
  ) {
    throw new Error("Use an exact known source file inside the project.");
  }
  return readFile(path.join(root, ...parts), "utf8");
}

export async function continueGraphExploration(
  root: string,
  previous: GraphAnswer,
  unresolved: GraphQuestion,
  run: GraphProcess = runGraphProcess,
): Promise<GraphAnswer> {
  const nextEngine = unresolved.domain === "code" ? "codegraph" : "graphify";
  if (
    previous.status !== "answered" ||
    previous.engine === nextEngine ||
    unresolved.question.trim() === ""
  ) {
    throw new Error(
      "State the unresolved question in the other domain after an answered graph query.",
    );
  }
  return exploreGraph(root, unresolved, run);
}

export async function exploreGraph(
  root: string,
  request: GraphQuestion,
  run: GraphProcess = runGraphProcess,
): Promise<GraphAnswer> {
  const requestedScope = Object.freeze({ ...request });
  try {
    return { ...(await exploreGraphScope(root, request, run)), requestedScope };
  } catch {
    const engine = request.domain === "code" ? "codegraph" : "graphify";
    return {
      requestedScope,
      engine,
      status: "failed",
      failure: `${engine === "codegraph" ? "CodeGraph" : "Graphify"} operation failed.`,
      recovery: `Repair ${engine === "codegraph" ? "CodeGraph" : "Graphify"} analysis and retry the graph query.`,
    };
  }
}

async function exploreGraphScope(
  root: string,
  request: GraphQuestion,
  run: GraphProcess,
): Promise<Omit<GraphAnswer, "requestedScope">> {
  const documentScope =
    request.domain === "documents" ? await inspectDocumentScope(root, run) : undefined;
  if (documentScope?.current) {
    const result = await run(
      graphRuntimePaths(root).python,
      [
        ...GRAPH_PYTHON_FLAGS,
        "-m",
        "graphify",
        "query",
        request.question,
        "--graph",
        path.toNamespacedPath(
          path.join(graphAnalysisRoot(root, "graphify"), "graphify-out", "graph.json"),
        ),
      ],
      {
        cwd: graphAnalysisRoot(root, "graphify"),
        env: graphifyCorpusEnvironment(root, graphAnalysisRoot(root, "graphify")),
      },
    );
    if (result.exitCode !== 0 && result.exitCode !== 4) {
      return {
        engine: "graphify",
        status: "failed",
        failure: "Graphify query failed.",
        recovery: "Repair Graphify analysis and retry the graph query.",
      };
    }
    const coverage = {
      unsupported: documentScope.unsupported,
      unreadable: documentScope.unreadable,
    };
    const inference = result.stdout.includes("[INFERRED]")
      ? {
          inferenceNotice:
            "Inferred relationships need source confirmation; they do not establish semantic correctness or complete coverage.",
        }
      : {};
    if (coverage.unsupported.length > 0 || coverage.unreadable.length > 0) {
      return {
        engine: "graphify",
        status: "incomplete",
        answer: result.stdout,
        coverage,
        ...inference,
        recovery:
          "Review unsupported and unreadable scope; this result does not establish absence.",
      };
    }
    return {
      engine: "graphify",
      status: result.exitCode === 4 ? "no-match" : "answered",
      answer: result.stdout,
      coverage,
      ...inference,
    };
  }
  if (request.domain === "code" && (await inspectCurrentCodeAnalysis(root, run))) {
    const result = await run(
      process.execPath,
      [
        graphRuntimePaths(root).codegraph,
        "context",
        request.question,
        "--path",
        graphAnalysisRoot(root, "codegraph"),
        "--format",
        "json",
        "--no-code",
      ],
      {
        cwd: root,
        env: codegraphEnvironment(root),
      },
    );
    const context = nativeCodeContext(result.stdout, request.question);
    if (result.exitCode !== 0 || !context)
      return {
        engine: "codegraph",
        status: "failed",
        failure: "CodeGraph query failed or returned unusable data.",
        recovery: "Repair CodeGraph analysis and retry the graph query.",
      };
    const coverage = await inspectCodeCoverage(root, run);
    if (!coverage.complete)
      return {
        engine: "codegraph",
        status: "incomplete",
        answer: result.stdout,
        coverage,
        recovery:
          "Review unknown, unsupported, unreadable and unparsed code scope; this result does not establish absence.",
      };
    return {
      engine: "codegraph",
      status: context.empty ? "no-match" : "answered",
      answer: result.stdout,
      coverage,
      ...(context.empty
        ? {
            inferenceNotice:
              "No match in this context search over the confirmed native code scope; this does not establish global absence.",
          }
        : {}),
    };
  }
  return {
    engine: request.domain === "code" ? "codegraph" : "graphify",
    status: "not-ready",
    recovery:
      request.domain === "documents" && (await readGraphProcessing(root)) === undefined
        ? "Select document processing in .qfai/graph-processing.json before preparing document analysis."
        : "Prepare the requested graph analysis before querying it.",
  };
}

function nativeCodeContext(stdout: string, question: string): { empty: boolean } | undefined {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    return undefined;
  }
  if (!object(value) || value.query !== question || typeof value.summary !== "string")
    return undefined;
  const arrays = ["entryPoints", "nodes", "edges", "codeBlocks", "relatedFiles"];
  if (arrays.some((key) => !Array.isArray(value[key])) || !object(value.stats)) return undefined;
  const stats = value.stats;
  const counts = ["nodeCount", "edgeCount", "fileCount", "codeBlockCount", "totalCodeSize"];
  if (counts.some((key) => !Number.isSafeInteger(stats[key]) || Number(stats[key]) < 0))
    return undefined;
  for (const [count, entries] of [
    ["nodeCount", "nodes"],
    ["edgeCount", "edges"],
    ["fileCount", "relatedFiles"],
    ["codeBlockCount", "codeBlocks"],
  ] as const) {
    const list = value[entries];
    if (!Array.isArray(list) || stats[count] !== list.length) return undefined;
  }
  const empty = stats.nodeCount === 0;
  if (
    empty &&
    (arrays.some((key) => Array.isArray(value[key]) && value[key].length !== 0) ||
      counts.some((key) => stats[key] !== 0))
  )
    return undefined;
  return { empty };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
