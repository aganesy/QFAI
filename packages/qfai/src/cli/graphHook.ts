import { readFileSync } from "node:fs";
import path from "node:path";
import { findUnsafeHostFileComponent, readPinnedRegularFile } from "../core/init/fsGuards.js";
import {
  enforceGraphExploration,
  decodeGraphHookEvent,
  failedGraphHook,
  graphHookOutput,
  type GraphHookHost,
} from "../core/graph/hooks.js";
import { classifyStoredGraphExploration } from "../core/graph/fallbackState.js";
import { GraphLocalStateError } from "../core/graph/localFiles.js";

function hostName(value: unknown): value is GraphHookHost {
  return value === "claude" || value === "codex" || value === "copilot" || value === "vscode";
}

export interface GraphHookIO {
  read(): unknown;
  output(text: string): void;
  error(text: string): void;
  fail(): void;
}

export async function runInstalledGraphHook(
  root: string,
  args: string[],
  io: GraphHookIO = {
    read: () => JSON.parse(readFileSync(0, "utf8")) as unknown,
    output: (text) => {
      process.stdout.write(text);
    },
    error: (text) => {
      process.stderr.write(text);
    },
    fail: () => {
      process.exitCode = 2;
    },
  },
): Promise<void> {
  let input: unknown;
  try {
    input = io.read();
  } catch {
    input = undefined;
  }
  const host = args[0] === "shared" ? wireHost(input) : args[0];
  if (!hostName(host)) {
    io.error("Graph protection unsupported: select a supported host adapter.\n");
    io.fail();
    return;
  }
  let decision = failedGraphHook();
  try {
    const components = [".qfai", "tools", "graph-enforcement.json"];
    if (!(await findUnsafeHostFileComponent(root, components))) {
      const text = await readPinnedRegularFile(path.join(root, ...components), 4096);
      if (text !== null) decision = enforceGraphExploration(input, JSON.parse(text) as unknown);
    }
  } catch {
    // A supported adapter emits denial for invalid input without echoing the payload.
  }
  if (decision.decision === "deny" && decision.state === "configured") {
    const event = decodeGraphHookEvent(input);
    if (event) {
      try {
        decision = await classifyStoredGraphExploration(root, event);
      } catch (cause: unknown) {
        decision = failedGraphHook();
        if (cause instanceof GraphLocalStateError)
          decision.message = `${cause.message} ${cause.recovery}`;
      }
    }
  }
  if (decision.decision === "deny")
    io.output(JSON.stringify(graphHookOutput(host, decision)) + "\n");
  if (decision.state === "failed") {
    io.error("Graph protection failed. Repair the project hook and enforcement configuration.\n");
    io.fail();
  }
}

function wireHost(input: unknown): GraphHookHost | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined;
  const value = input as Record<string, unknown>;
  const snake = ["tool_name", "tool_input", "session_id"].some((key) => key in value);
  const camel = ["toolName", "toolArgs", "sessionId"].some((key) => key in value);
  if (snake === camel) return undefined;
  // The selected response format is not evidence of the physical host.
  return camel ? "copilot" : "vscode";
}
