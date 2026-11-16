import { queryPreparedGraph } from "../core/graph/runner.js";
import { runGraphProcess, type GraphProcess } from "../core/graph/process.js";
import type { GraphQuestion } from "../core/graph/query.js";
import { GraphLocalStateError } from "../core/graph/localFiles.js";

export interface GraphCliIO {
  output(text: string): void;
  fail(): void;
}

const QUERY_USAGE =
  'Run node .qfai/tools/graph-cli.mjs code "<question>" or documents "<question>". Supply only the listed arguments.';

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
  const request = readQuestion(args);
  if (!request) {
    io.output(
      JSON.stringify({
        status: "failed",
        failure: "Invalid graph command arguments.",
        recovery: QUERY_USAGE,
      }) + "\n",
    );
    io.fail();
    return;
  }
  let answer;
  try {
    answer = await queryPreparedGraph(root, request, run);
  } catch (cause: unknown) {
    answer = {
      status: "failed",
      failure: cause instanceof GraphLocalStateError ? cause.message : "Graph operation failed.",
      recovery:
        cause instanceof GraphLocalStateError
          ? cause.recovery
          : "Repair project-local graph preparation and retry the same CLI command.",
    };
  }
  io.output(JSON.stringify(answer) + "\n");
  if (answer.status === "failed" || answer.status === "not-ready") io.fail();
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
