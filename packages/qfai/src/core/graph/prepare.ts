import { randomBytes } from "node:crypto";
import { access, cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  codegraphEnvironment,
  graphifyEnvironment,
  GRAPH_PROCESS_LIMITS,
  GRAPH_PYTHON_FLAGS,
  graphLimitCause,
  npmCommand,
  runGraphProcess,
  type GraphProcess,
  type GraphProcessResult,
} from "./process.js";
import { isEnoent } from "../fs/errno.js";
import { GraphConfigUnreadableError, inspectCurrentCodeAnalysis } from "./analysis.js";
import { GRAPH_VERSIONS, graphRuntimeFiles, graphRuntimePaths } from "./layout.js";
import { assertGraphStoragePath, replaceGraphDirectory } from "./storage.js";
import { formatReportPath } from "../init/reportPath.js";
export { GRAPH_VERSIONS, graphRuntimePaths } from "./layout.js";

export interface GraphPreparation {
  runtime: "installed" | "not-ready";
  tools?: {
    codegraph: "installed" | "not-ready";
    graphify: "installed" | "not-ready";
  };
  code: "code-ready" | "code-not-ready";
  documents: "documents-not-ready";
  failedStep?: string;
  recovery?: string;
  /** A failed download repeated by hand into a directory created for it, whose output shows the cause. */
  rerun?: { command: string; directory: string };
  previousInstallation?: "retained" | "none";
}

export async function prepareGraphRuntimes(
  root: string,
  run: GraphProcess = runGraphProcess,
): Promise<GraphPreparation> {
  const current = graphRuntimePaths(root);
  await assertGraphStoragePath(root, current.directory);
  const env = codegraphEnvironment(root);
  const pythonEnvironment = graphifyEnvironment(root);
  const codegraphReady = await compatibleRuntime(
    current.codegraph,
    process.execPath,
    [current.codegraph, "--version"],
    GRAPH_VERSIONS.codegraph,
    root,
    run,
    env,
  );
  const graphifyReady = await compatibleRuntime(
    current.python,
    current.python,
    [
      ...GRAPH_PYTHON_FLAGS,
      "-c",
      'from importlib.metadata import version; print(version("graphifyy"))',
    ],
    GRAPH_VERSIONS.graphify,
    root,
    run,
    pythonEnvironment,
  );
  if (codegraphReady && graphifyReady) {
    return {
      runtime: "installed",
      tools: { codegraph: "installed", graphify: "installed" },
      code: (await currentCodeAnalysis(root, run)) ? "code-ready" : "code-not-ready",
      documents: "documents-not-ready",
    };
  }
  // A short sibling of the installed directory, so staging adds almost no depth to the deepest
  // runtime file. Windows limits a path to 260 characters unless long paths are enabled.
  const staged = graphRuntimeFiles(
    path.join(path.dirname(current.directory), `.p-${randomBytes(4).toString("hex")}`),
  );
  await assertGraphStoragePath(root, staged.directory);
  const notReady: GraphPreparation = {
    runtime: "not-ready",
    tools: {
      codegraph: codegraphReady ? "installed" : "not-ready",
      graphify: graphifyReady ? "installed" : "not-ready",
    },
    code: "code-not-ready",
    documents: "documents-not-ready",
    previousInstallation: codegraphReady || graphifyReady ? "retained" : "none",
  };
  // The leaf is created without recursive, so a leftover directory of that name fails with
  // EEXIST instead of being reused.
  await mkdir(path.dirname(staged.directory), { recursive: true });
  await mkdir(staged.directory);
  try {
    if (codegraphReady) {
      await cp(
        path.join(current.directory, "codegraph"),
        path.join(staged.directory, "codegraph"),
        { recursive: true },
      );
    } else {
      const npm = await npmCommand();
      const install = await run(
        npm.command,
        [
          ...npm.prefix,
          "install",
          "--prefix",
          path.join(staged.directory, "codegraph"),
          "--no-audit",
          "--no-fund",
          "--save-exact",
          "--ignore-scripts",
          `@colbymchenry/codegraph@${GRAPH_VERSIONS.codegraph}`,
        ],
        { cwd: root, env, ...GRAPH_PROCESS_LIMITS.download },
      );
      if (install.exitCode !== 0)
        return withRerun(
          {
            ...notReady,
            failedStep: "CodeGraph download",
            ...limitRecovery("CodeGraph download", install),
          },
          await rerunByHand("codegraph", (directory) => [
            "npm",
            "install",
            "--prefix",
            directory,
            "--no-audit",
            "--no-fund",
            "--save-exact",
            "--ignore-scripts",
            `@colbymchenry/codegraph@${GRAPH_VERSIONS.codegraph}`,
          ]),
        );
      const codeVersion = await run(process.execPath, [staged.codegraph, "--version"], {
        cwd: root,
        env,
        captureStderr: true,
      });
      if (codeVersion.exitCode !== 0 || codeVersion.stdout.trim() !== GRAPH_VERSIONS.codegraph) {
        return {
          ...notReady,
          failedStep: "CodeGraph compatibility",
          recovery: versionCheckRecovery("CodeGraph", codeVersion, GRAPH_VERSIONS.codegraph, root),
        };
      }
    }
    if (graphifyReady) {
      await cp(path.join(current.directory, "graphify"), path.join(staged.directory, "graphify"), {
        recursive: true,
        verbatimSymlinks: true,
      });
    } else {
      const venv = await run(
        "uv",
        [
          "venv",
          "--python",
          ">=3.10",
          "--no-python-downloads",
          path.join(staged.directory, "graphify"),
        ],
        { cwd: root, env: pythonEnvironment },
      );
      if (venv.exitCode !== 0) {
        // A setup stopped at its limit found Python and uv, so it is not named a missing prerequisite.
        const stopped = graphLimitCause("Python environment setup", venv);
        return {
          ...notReady,
          ...(stopped
            ? {
                failedStep: "Python environment setup",
                recovery: `${stopped} Run qfai init again.`,
              }
            : {
                failedStep: "Python 3.10+ and uv prerequisite",
                recovery: "Install Python 3.10 or later and uv, then run qfai init again.",
              }),
        };
      }
      const pythonInstall = await run(
        "uv",
        [
          "pip",
          "install",
          "--python",
          staged.python,
          `graphifyy[ollama]==${GRAPH_VERSIONS.graphify}`,
        ],
        { cwd: root, env: pythonEnvironment, ...GRAPH_PROCESS_LIMITS.download },
      );
      if (pythonInstall.exitCode !== 0)
        return withRerun(
          {
            ...notReady,
            failedStep: "Graphify download",
            ...limitRecovery("Graphify download", pythonInstall),
          },
          await rerunByHand("graphify", (directory) => [
            "uv",
            "pip",
            "install",
            "--python",
            ">=3.10",
            "--target",
            directory,
            `graphifyy[ollama]==${GRAPH_VERSIONS.graphify}`,
          ]),
        );
      const graphifyVersion = await run(
        staged.python,
        [
          ...GRAPH_PYTHON_FLAGS,
          "-c",
          'from importlib.metadata import version; print(version("graphifyy"))',
        ],
        { cwd: root, env: pythonEnvironment, captureStderr: true },
      );
      if (
        graphifyVersion.exitCode !== 0 ||
        graphifyVersion.stdout.trim() !== GRAPH_VERSIONS.graphify
      ) {
        return {
          ...notReady,
          failedStep: "Graphify compatibility",
          recovery: versionCheckRecovery(
            "Graphify",
            graphifyVersion,
            GRAPH_VERSIONS.graphify,
            root,
          ),
        };
      }
    }
    await replaceGraphDirectory(staged.directory, current.directory, root);
    return {
      runtime: "installed",
      tools: { codegraph: "installed", graphify: "installed" },
      code: "code-not-ready",
      documents: "documents-not-ready",
    };
  } finally {
    await rm(staged.directory, { recursive: true, force: true });
  }
}

const CAUSE_LINES = 5;
const CAUSE_CHARACTERS = 500;
/**
 * The deepest file of the staged CodeGraph tree below the project root, with its separator:
 * .qfai/tools/runtimes/.p-<8 hex>/codegraph/node_modules/@colbymchenry/codegraph-win32-x64/lib/
 * dist/viewer/assets/ibm-plex-mono-cyrillic-ext-400-italic-CBjNughH.woff2, measured for CodeGraph
 * 1.6.2 under the win32-x64 environment key. Under win32-arm64 the path is 2 characters longer.
 */
const STAGED_TOOL_DEPTH = 166;
const WINDOWS_PATH_LIMIT = 260;
const WINDOWS_PATH_MARGIN = 20;

// A version check prints no credentials, so its exit code and first stderr lines, or the version
// it printed, are shown, bounded and escaped as report paths are.
function versionCheckRecovery(
  engine: "CodeGraph" | "Graphify",
  result: GraphProcessResult,
  expected: string,
  root: string,
): string {
  const cause =
    result.exitCode !== 0 || result.failure
      ? `Cause: the ${engine} version check ${result.failure ?? `exited with code ${result.exitCode}`}${shownOutput(result.stderr, ": ")}.`
      : `Cause: the ${engine} version check printed ${shownOutput(result.stdout, "") || "nothing"}, expected ${expected}.`;
  const pathLimit = windowsPathLimitRecovery(root);
  return pathLimit ? `${cause}\n${pathLimit}` : cause;
}

function shownOutput(text: string | undefined, prefix: string): string {
  const lines = (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replaceAll("\t", " ").trim())
    .filter((line) => line.length > 0)
    .slice(0, CAUSE_LINES)
    .join(" | ");
  if (lines.length === 0) return "";
  const bounded =
    lines.length > CAUSE_CHARACTERS ? `${lines.slice(0, CAUSE_CHARACTERS)}...` : lines;
  return `${prefix}${formatReportPath(bounded)}`;
}

/** Whether the code analysis is current; an unreadable configuration leaves it not ready. */
async function currentCodeAnalysis(root: string, run: GraphProcess): Promise<boolean> {
  try {
    return await inspectCurrentCodeAnalysis(root, run);
  } catch (cause: unknown) {
    if (cause instanceof GraphConfigUnreadableError) return false;
    throw cause;
  }
}

/** A recovery line for a project root deep enough that the tool files near the Windows path limit. */
export function windowsPathLimitRecovery(
  root: string,
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  if (platform !== "win32") return undefined;
  const longest = root.length + STAGED_TOOL_DEPTH;
  if (longest < WINDOWS_PATH_LIMIT - WINDOWS_PATH_MARGIN) return undefined;
  return `The graph tool files reach about ${longest} characters, near or past the Windows limit of ${WINDOWS_PATH_LIMIT}. Move the project to a shorter path, or enable Windows long paths (LongPathsEnabled), then run qfai init again.`;
}

/** A download QFAI stopped at its limit names that limit; the rerun line still follows. */
function limitRecovery(step: string, result: GraphProcessResult): { recovery?: string } {
  const cause = graphLimitCause(step, result);
  return cause ? { recovery: cause } : {};
}

function withRerun(
  preparation: GraphPreparation,
  rerun: GraphPreparation["rerun"],
): GraphPreparation {
  return rerun ? { ...preparation, rerun } : preparation;
}

// The installer's own output is not shown, since it can carry credentials. The same download,
// run by hand, shows the cause in the user's terminal instead. It goes into a directory created
// empty for this failure, so the deletion the recovery line asks for removes nothing else. Any
// failure to create the directory, or a directory that has no literal displayed form, leaves
// the generic recovery line: the run has already failed, and a rerun it cannot name safely is
// not offered.
async function rerunByHand(
  engine: "codegraph" | "graphify",
  command: (directory: string) => string[],
): Promise<GraphPreparation["rerun"]> {
  let created: string;
  try {
    created = await mkdtemp(path.join(os.tmpdir(), `qfai-graph-check-${engine}-`));
  } catch {
    return undefined;
  }
  const directory = shellArgument(created);
  const args = command(created).map((arg) => shellArgument(arg));
  if (directory === undefined || args.some((arg) => arg === undefined)) {
    await rm(created, { recursive: true, force: true });
    return undefined;
  }
  return { command: args.join(" "), directory };
}

const PLAIN_ARGUMENT = /^[\w@+=:,./-]+$/;

/**
 * One argument of a displayed command, as the shell of the platform reads it literally: bare when
 * it holds no special character, otherwise single-quoted for a POSIX shell, and double-quoted on
 * Windows, which cmd.exe and PowerShell both read literally when the value holds no `"`, `$`,
 * backtick or `%`. A value that cannot be quoted so, or carries a control character that could
 * forge an output line, has no displayed form.
 */
export function shellArgument(
  value: string,
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  if (formatReportPath(value) !== value) return undefined;
  if (PLAIN_ARGUMENT.test(value)) return value;
  if (platform === "win32") return /["$`%]/.test(value) ? undefined : `"${value}"`;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function compatibleRuntime(
  executable: string,
  command: string,
  args: readonly string[],
  version: string,
  root: string,
  run: GraphProcess,
  env?: NodeJS.ProcessEnv,
): Promise<boolean> {
  try {
    await access(executable);
  } catch (cause: unknown) {
    if (isEnoent(cause)) return false;
    throw cause;
  }
  const result = await run(command, args, { cwd: root, ...(env ? { env } : {}) });
  return result.exitCode === 0 && result.stdout.trim() === version;
}
