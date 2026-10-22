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
}

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
  try {
    const result = await execute(command, [...args], {
      cwd: options.cwd,
      ...(options.env ? { env: options.env } : {}),
      windowsHide: true,
      timeout: options.timeoutMs ?? 120_000,
      maxBuffer: options.maxBufferBytes ?? 4 * 1024 * 1024,
    });
    return { exitCode: 0, stdout: result.stdout };
  } catch (cause: unknown) {
    if (!(cause instanceof Error) || !("code" in cause)) throw cause;
    // Installation and backend stderr can contain credentials. Callers report the step instead;
    // the preparation names the command a failed download can be rerun with by hand.
    const signal = "signal" in cause && typeof cause.signal === "string" ? cause.signal : undefined;
    const failure = signal
      ? `was stopped (${signal})`
      : typeof cause.code === "string"
        ? `could not start (${cause.code})`
        : undefined;
    return {
      exitCode: typeof cause.code === "number" ? cause.code : 1,
      stdout: "",
      ...(failure ? { failure } : {}),
      ...(options.captureStderr && "stderr" in cause && typeof cause.stderr === "string"
        ? { stderr: cause.stderr }
        : {}),
    };
  }
};

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
