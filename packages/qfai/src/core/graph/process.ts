import { execFile } from "node:child_process";
import { access, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  graphEnvironmentKey,
  graphExecutionEnvironment,
  type GraphExecutionEnvironment,
} from "./layout.js";
import { assertGraphStoragePath } from "./storage.js";
import { isEnoent } from "../fs/errno.js";

const execute = promisify(execFile);
export const GRAPH_PYTHON_FLAGS = ["-I", "-X", "utf8"] as const;

export interface GraphProcessResult {
  exitCode: number;
  stdout: string;
  /** Set only for a failed process run with captureStderr; installer output can carry credentials. */
  stderr?: string;
  /** Why a process that did not exit on its own ended: it could not start, or it was stopped. */
  failure?: string;
  /** Set when QFAI stopped the process because it passed its time or output limit. */
  limit?: "time" | "output";
}

export interface GraphProcessLimits {
  timeoutMs: number;
  maxBufferBytes: number;
}

/**
 * Limits per kind of graph subprocess. Checks and queries are quick; a download depends on the
 * network, and a full analysis on the size of the project and, for documents, on the model.
 * Ceiling: an analysis of a project or document scope that needs longer is stopped and reported
 * as having passed its time limit. Lifted by making the limit configurable once a project needs it.
 */
export const GRAPH_PROCESS_LIMITS = {
  check: { timeoutMs: 2 * 60_000, maxBufferBytes: 4 * 1024 * 1024 },
  download: { timeoutMs: 15 * 60_000, maxBufferBytes: 16 * 1024 * 1024 },
  codeAnalysis: { timeoutMs: 30 * 60_000, maxBufferBytes: 16 * 1024 * 1024 },
  documentAnalysis: { timeoutMs: 120 * 60_000, maxBufferBytes: 16 * 1024 * 1024 },
} as const satisfies Record<string, GraphProcessLimits>;

export type GraphProcess = (
  command: string,
  args: readonly string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    maxBufferBytes?: number;
    /** Keep a failed process's stderr in the result. Only version checks ask for it. */
    captureStderr?: boolean;
  },
) => Promise<GraphProcessResult>;

function privateEngineEnvironment(
  root: string,
  engine: "codegraph" | "graphify",
  execution: GraphExecutionEnvironment,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  const allowed: Record<string, string> = {
    path: "PATH",
    systemroot: "SystemRoot",
    windir: "WINDIR",
    comspec: "ComSpec",
    pathext: "PATHEXT",
    tmp: "TMP",
    temp: "TEMP",
    lang: "LANG",
    lc_all: "LC_ALL",
  };
  for (const [name, value] of Object.entries(process.env)) {
    const canonical = allowed[name.toLowerCase()];
    if (canonical) environment[canonical] = value;
  }
  const home = path.join(root, ".qfai", "tools", "home", graphEnvironmentKey(execution), engine);
  return {
    ...environment,
    HOME: home,
    USERPROFILE: home,
    APPDATA: path.join(home, "AppData", "Roaming"),
    LOCALAPPDATA: path.join(home, "AppData", "Local"),
    XDG_CONFIG_HOME: path.join(home, ".config"),
    XDG_CACHE_HOME: path.join(home, ".cache"),
    XDG_DATA_HOME: path.join(home, ".local", "share"),
    XDG_STATE_HOME: path.join(home, ".local", "state"),
  };
}

export function graphifyEnvironment(
  root: string,
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
): NodeJS.ProcessEnv {
  return {
    ...privateEngineEnvironment(root, "graphify", environment),
    PYTHONUTF8: "1",
    PYTHONIOENCODING: "utf-8",
    GRAPHIFY_QUERY_LOG_DISABLE: "1",
    GRAPHIFY_OUT: "graphify-out",
    GRAPHIFY_ALLOW_LOCAL_PROVIDERS: "0",
    GRAPHIFY_NO_AUTO_REFRESH: "1",
  };
}

export function codegraphEnvironment(
  root: string,
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
): NodeJS.ProcessEnv {
  const privateEnvironment = privateEngineEnvironment(root, "codegraph", environment);
  const home = privateEnvironment.HOME ?? "";
  return {
    ...privateEnvironment,
    CODEGRAPH_INSTALL_DIR: path.join(home, ".codegraph"),
    CODEGRAPH_NO_DOWNLOAD: "1",
    CODEGRAPH_NO_UPDATE_CHECK: "1",
    CODEGRAPH_TELEMETRY: "0",
    CODEGRAPH_DIR: ".codegraph",
  };
}

export function graphifyCorpusEnvironment(root: string, analysis: string): NodeJS.ProcessEnv {
  return {
    ...graphifyEnvironment(root),
    GRAPHIFY_OUT: path.toNamespacedPath(path.join(analysis, "graphify-out")),
  };
}

export async function graphifyConfigurationSafe(root: string): Promise<boolean> {
  const home = graphifyEnvironment(root).HOME;
  if (!home) return false;
  try {
    const configuration = path.join(home, ".graphify");
    await assertGraphStoragePath(root, configuration);
    await lstat(path.join(configuration, "providers.json"));
    return false;
  } catch (cause: unknown) {
    return isEnoent(cause);
  }
}

export const runGraphProcess: GraphProcess = async (command, args, options) => {
  const timeoutMs = options.timeoutMs ?? GRAPH_PROCESS_LIMITS.check.timeoutMs;
  const maxBufferBytes = options.maxBufferBytes ?? GRAPH_PROCESS_LIMITS.check.maxBufferBytes;
  try {
    const result = await execute(command, [...args], {
      cwd: options.cwd,
      ...(options.env ? { env: options.env } : {}),
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: maxBufferBytes,
    });
    return { exitCode: 0, stdout: result.stdout };
  } catch (cause: unknown) {
    if (!(cause instanceof Error) || !("code" in cause)) throw cause;
    // Installation and backend stderr can contain credentials. Callers report the step instead;
    // the preparation names the command a failed download can be rerun with by hand.
    const stopped = stoppedProcess(cause, timeoutMs, maxBufferBytes);
    return {
      exitCode: typeof cause.code === "number" ? cause.code : 1,
      stdout: "",
      ...stopped,
      ...(options.captureStderr && "stderr" in cause && typeof cause.stderr === "string"
        ? { stderr: cause.stderr }
        : {}),
    };
  }
};

/** Why a process ended without exiting on its own, with the limit it passed, if any. */
function stoppedProcess(
  cause: Error & { code: unknown },
  timeoutMs: number,
  maxBufferBytes: number,
): Pick<GraphProcessResult, "failure" | "limit"> {
  // execFile stops the process and reports this code when stdout or stderr passes maxBuffer.
  if (cause.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER")
    return {
      failure: `printed more than ${byteSize(maxBufferBytes)} of output and was stopped`,
      limit: "output",
    };
  const signal = "signal" in cause && typeof cause.signal === "string" ? cause.signal : undefined;
  // execFile marks a process it killed itself; with no output limit passed, that is the timeout.
  if (signal && "killed" in cause && cause.killed === true)
    return {
      failure: `did not finish within ${duration(timeoutMs)} and was stopped`,
      limit: "time",
    };
  if (signal) return { failure: `was stopped (${signal})` };
  if (typeof cause.code === "string") return { failure: `could not start (${cause.code})` };
  return {};
}

function duration(milliseconds: number): string {
  const units: [number, string][] = [
    [3_600_000, "hour"],
    [60_000, "minute"],
  ];
  for (const [size, unit] of units) {
    if (milliseconds >= size && milliseconds % size === 0) {
      const count = milliseconds / size;
      return `${count} ${unit}${count === 1 ? "" : "s"}`;
    }
  }
  const seconds = milliseconds / 1000;
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

function byteSize(bytes: number): string {
  const mebibyte = 1024 * 1024;
  return bytes >= mebibyte && bytes % mebibyte === 0 ? `${bytes / mebibyte} MiB` : `${bytes} bytes`;
}

/**
 * The recovery cause for a step QFAI stopped at its time or output limit, so it is not reported
 * as a missing prerequisite, an incompatible runtime or a broken analysis.
 */
export function graphLimitCause(step: string, result: GraphProcessResult): string | undefined {
  return result.limit && result.failure ? `Cause: the ${step} ${result.failure}.` : undefined;
}

export async function npmCommand(): Promise<{ command: string; prefix: string[] }> {
  const node = await realpath(process.execPath);
  const candidates = [
    path.join(path.dirname(node), "node_modules", "npm", "bin", "npm-cli.js"),
    path.resolve(path.dirname(node), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return { command: process.execPath, prefix: [candidate] };
    } catch (cause: unknown) {
      if (!(cause instanceof Error) || !("code" in cause) || cause.code !== "ENOENT") throw cause;
    }
  }
  // POSIX npm launchers are executable scripts. Windows uses the JS entry above.
  return { command: "npm", prefix: [] };
}
