import { queryPreparedGraph } from "../core/graph/runner.js";
import { runGraphProcess, type GraphProcess } from "../core/graph/process.js";
import type { GraphQuestion } from "../core/graph/query.js";
import { requestStoredGraphFallback } from "../core/graph/fallbackState.js";
import { GRAPH_UUID, graphStateText, GraphLocalStateError } from "../core/graph/localFiles.js";

export interface GraphCliIO {
  output(text: string): void;
  fail(): void;
}

const QUERY_USAGE =
  'Run node .qfai/tools/graph-cli.mjs code "<question>" or documents "<question>". For a denied search, run node .qfai/tools/graph-cli.mjs fallback --attempt-id <observed-UUID> --question "<unresolved question>" --reason "<graph limitation>". Supply only the listed arguments.';

export async function runInstalledGraphCli(
  root: string,
  args: string[],
  io: GraphCliIO = {
    output: (text) => {
      process.stdout.write(text);
    },
    fail: () => {
      process.exitCode = 2;
    },
  },
  run: GraphProcess = runGraphProcess,
): Promise<void> {
  const request = args[0] === "fallback" ? readFallback(args) : readQuestion(args);
  if (!request) {
    io.output(
      JSON.stringify({
        status: "failed",
        ...(args[0] === "fallback" ? { permitted: false } : {}),
        failure: "Invalid graph command arguments.",
        recovery: QUERY_USAGE,
      }) + "\n",
    );
    io.fail();
    return;
  }
  let answer;
  try {
    answer =
      "attemptId" in request
        ? await requestStoredGraphFallback(
            root,
            request.attemptId,
            request.question,
            request.reason,
            run,
          )
        : await queryPreparedGraph(root, request, run);
  } catch (cause: unknown) {
    const fallback = "attemptId" in request;
    answer = {
      status: "failed",
      permitted: false,
      failure:
        cause instanceof GraphLocalStateError
          ? cause.message
          : fallback
            ? "Search fallback failed."
            : "Graph operation failed.",
      recovery:
        cause instanceof GraphLocalStateError
          ? cause.recovery
          : fallback
            ? "Retain .qfai/tools/state and local analysis, repair project-local graph preparation, then retry the same fallback CLI command."
            : "Repair project-local graph preparation and retry the same CLI command.",
    };
  }
  io.output(JSON.stringify(answer) + "\n");
  if (answer.status === "failed" || answer.status === "not-ready") io.fail();
}

function readFallback(
  args: string[],
): { attemptId: string; question: string; reason: string } | undefined {
  if (args.length !== 7) return undefined;
  const values = new Map<string, string>();
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1]?.trim();
    if (
      !flag ||
      !["--attempt-id", "--question", "--reason"].includes(flag) ||
      values.has(flag) ||
      !value ||
      value.startsWith("--")
    )
      return undefined;
    values.set(flag, value);
  }
  const attemptId = values.get("--attempt-id");
  const question = values.get("--question");
  const reason = values.get("--reason");
  if (
    !attemptId ||
    !GRAPH_UUID.test(attemptId) ||
    !graphStateText(question, 16384) ||
    !graphStateText(reason, 2048)
  )
    return undefined;
  return { attemptId, question, reason };
}

function readQuestion(args: string[]): GraphQuestion | undefined {
  const domain = args[0];
  const question = args[1]?.trim();
  if (
    (domain !== "code" && domain !== "documents") ||
    args.length !== 2 ||
    !question ||
    question.length > 16384 ||
    question.includes("\0") ||
    question.startsWith("--")
  )
    return undefined;
  return { domain, question };
}
