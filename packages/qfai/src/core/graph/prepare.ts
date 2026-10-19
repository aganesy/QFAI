import { randomUUID } from "node:crypto";
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
} from "./process.js";
import { isEnoent } from "../fs/errno.js";
import { inspectCurrentCodeAnalysis } from "./analysis.js";
import { GRAPH_VERSIONS, graphRuntimePaths } from "./layout.js";
import { assertGraphStoragePath, replaceGraphDirectory } from "./storage.js";
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
  const tools = path.join(root, ".qfai", "tools");
  const stagingRoot = path.join(tools, `.preparing-${randomUUID()}`);
  const staged = graphRuntimePaths(stagingRoot);
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
          recovery: rerunByHand(
            "npm",
            "install",
            "--prefix",
            quoted(manualCheckDirectory("codegraph")),
            "--no-audit",
            "--no-fund",
            "--save-exact",
            "--ignore-scripts",
            `@colbymchenry/codegraph@${GRAPH_VERSIONS.codegraph}`,
          ),
        };
      const codeVersion = await run(process.execPath, [staged.codegraph, "--version"], {
        cwd: root,
        env,
      });
      if (codeVersion.exitCode !== 0 || codeVersion.stdout.trim() !== GRAPH_VERSIONS.codegraph) {
        return { ...notReady, failedStep: "CodeGraph compatibility" };
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
          recovery: rerunByHand(
            "uv",
            "pip",
            "install",
            "--target",
            quoted(manualCheckDirectory("graphify")),
            quoted(`graphifyy[ollama]==${GRAPH_VERSIONS.graphify}`),
          ),
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
        return { ...notReady, failedStep: "Graphify compatibility" };
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
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

// The installer's own output is not shown, since it can carry credentials. The same download,
// run by hand into a throwaway directory, shows the cause in the user's terminal instead.
function rerunByHand(...command: string[]): string {
  return `To see the cause, run: ${command.join(" ")}`;
}

function manualCheckDirectory(engine: "codegraph" | "graphify"): string {
  return path.join(os.tmpdir(), "qfai-graph-check", engine);
}

function quoted(argument: string): string {
  return `"${argument}"`;
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
