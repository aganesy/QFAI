import { randomBytes } from "node:crypto";
import { access, cp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  codegraphEnvironment,
  graphifyEnvironment,
  GRAPH_PYTHON_FLAGS,
  npmCommand,
  runGraphProcess,
  type GraphProcess,
  type GraphProcessResult,
} from "./process.js";
import { isEnoent } from "../fs/errno.js";
import { inspectCurrentCodeAnalysis } from "./analysis.js";
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
  /** A failed download repeated by hand into a throwaway directory, whose output shows the cause. */
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
      code: (await inspectCurrentCodeAnalysis(root, run)) ? "code-ready" : "code-not-ready",
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
  await mkdir(staged.directory, { recursive: true });
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
        { cwd: root, env },
      );
      if (install.exitCode !== 0)
        return {
          ...notReady,
          failedStep: "CodeGraph download",
          rerun: rerunByHand("codegraph", (directory) => [
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
        };
      const codeVersion = await run(process.execPath, [staged.codegraph, "--version"], {
        cwd: root,
        env,
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
      if (venv.exitCode !== 0)
        return {
          ...notReady,
          failedStep: "Python 3.10+ and uv prerequisite",
          recovery: "Install Python 3.10 or later and uv, then run qfai init again.",
        };
      const pythonInstall = await run(
        "uv",
        [
          "pip",
          "install",
          "--python",
          staged.python,
          `graphifyy[ollama]==${GRAPH_VERSIONS.graphify}`,
        ],
        { cwd: root, env: pythonEnvironment },
      );
      if (pythonInstall.exitCode !== 0)
        return {
          ...notReady,
          failedStep: "Graphify download",
          rerun: rerunByHand("graphify", (directory) => [
            "uv",
            "pip",
            "install",
            "--python",
            '">=3.10"',
            "--target",
            directory,
            `"graphifyy[ollama]==${GRAPH_VERSIONS.graphify}"`,
          ]),
        };
      const graphifyVersion = await run(
        staged.python,
        [
          ...GRAPH_PYTHON_FLAGS,
          "-c",
          'from importlib.metadata import version; print(version("graphifyy"))',
        ],
        { cwd: root, env: pythonEnvironment },
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
/** The deepest file of the staged CodeGraph tree, below the project root, for the pinned version. */
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
    result.exitCode !== 0
      ? `Cause: the ${engine} version check exited with code ${result.exitCode}${shownOutput(result.stderr, ": ")}.`
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

// The installer's own output is not shown, since it can carry credentials. The same download,
// run by hand into a throwaway directory, shows the cause in the user's terminal instead.
// The directory is escaped as report paths are, so a temporary directory carrying a control
// character cannot forge output lines.
function rerunByHand(
  engine: "codegraph" | "graphify",
  command: (directory: string) => string[],
): { command: string; directory: string } {
  const raw = path.join(os.tmpdir(), "qfai-graph-check", engine);
  const shown = formatReportPath(raw);
  const directory = shown === raw ? `"${raw}"` : shown;
  return { command: command(directory).join(" "), directory };
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
