import path from "node:path";

export const GRAPH_VERSIONS = { codegraph: "1.6.2", graphify: "0.9.86" } as const;

export interface GraphExecutionEnvironment {
  platform: string;
  architecture: string;
}

export function graphExecutionEnvironment(): GraphExecutionEnvironment {
  return { platform: process.platform, architecture: process.arch };
}

export function graphEnvironmentKey(
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
): string {
  if (!/^[a-z0-9]+$/i.test(environment.platform) || !/^[a-z0-9]+$/i.test(environment.architecture))
    throw new Error("Unsupported graph execution environment.");
  return `${environment.platform}-${environment.architecture}`;
}

/** The project-local directory every graph file is written under. */
export function graphToolsDirectory(root: string): string {
  return path.join(root, ".qfai", "tools");
}

export function graphRuntimePaths(
  root: string,
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
) {
  return graphRuntimeFiles(
    path.join(graphToolsDirectory(root), "runtimes", graphEnvironmentKey(environment)),
    environment,
  );
}

/** The runtime files inside one runtime directory, the installed one or a staged copy of it. */
export function graphRuntimeFiles(
  directory: string,
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
) {
  return {
    directory,
    codegraph: path.join(
      directory,
      "codegraph",
      "node_modules",
      "@colbymchenry",
      "codegraph",
      "npm-shim.js",
    ),
    codegraphSdk: path.join(
      directory,
      "codegraph",
      "node_modules",
      "@colbymchenry",
      "codegraph",
      "npm-sdk.js",
    ),
    codegraphNode: path.join(
      directory,
      "codegraph",
      "node_modules",
      "@colbymchenry",
      `codegraph-${environment.platform}-${environment.architecture}`,
      environment.platform === "win32" ? "node.exe" : "node",
    ),
    python:
      environment.platform === "win32"
        ? path.join(directory, "graphify", "Scripts", "python.exe")
        : path.join(directory, "graphify", "bin", "python"),
  };
}

export const GRAPH_ANALYSIS_ENGINES = ["codegraph", "graphify", "graphify-code"] as const;
export type GraphAnalysisEngine = (typeof GRAPH_ANALYSIS_ENGINES)[number];

export function graphAnalysisRoot(
  root: string,
  engine: GraphAnalysisEngine,
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
): string {
  return path.join(graphToolsDirectory(root), "analysis", graphEnvironmentKey(environment), engine);
}

/** The steps that build an engine's analysis in a hidden sibling before switching it into place. */
export const GRAPH_STAGING_STEPS = ["preparing", "refreshing", "restoring"] as const;
export type GraphStagingStep = (typeof GRAPH_STAGING_STEPS)[number];

/** The hidden sibling of the active analysis `current` in which `step` builds `engine`'s analysis. */
export function graphAnalysisStaging(
  current: string,
  step: GraphStagingStep,
  engine: GraphAnalysisEngine,
  id: string,
): string {
  return path.join(path.dirname(current), `.${step}-${engine}-${id}`);
}

const STAGING_ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Whether `name` is a sibling `graphAnalysisStaging` names for `step` and `engine` with a random
 * UUID. The UUID is matched whole, so one engine's prefix never matches another engine's copy:
 * `.refreshing-graphify-` is also the start of `.refreshing-graphify-code-<id>`.
 */
export function isGraphAnalysisStaging(
  name: string,
  step: GraphStagingStep,
  engine: GraphAnalysisEngine,
): boolean {
  return new RegExp(`^\\.${step}-${engine}-${STAGING_ID}$`).test(name);
}

/**
 * The hidden sibling of the installed runtime directory a runtime is staged in. It is short, so
 * staging adds almost no depth to the deepest runtime file: Windows limits a path to 260
 * characters unless long paths are enabled.
 */
export function graphRuntimeStaging(installed: string, id: string): string {
  return path.join(path.dirname(installed), `.p-${id}`);
}

/** The hidden sibling `current` is kept in while its replacement is renamed into place. */
export function graphRetainedDirectory(current: string, id: string): string {
  return path.join(path.dirname(current), `.previous-${id}`);
}

/** The private home an engine runs with, so it reads and writes no user-wide configuration. */
export function graphPrivateHome(
  root: string,
  engine: "codegraph" | "graphify",
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
): string {
  return path.join(graphToolsDirectory(root), "home", graphEnvironmentKey(environment), engine);
}

/** Where CodeGraph installs its own files inside its private home. */
export function graphCodegraphInstallDirectory(home: string): string {
  return path.join(home, ".codegraph");
}

/** The local state directory, which holds the analysis lock. */
export function graphStatePath(root: string): string {
  return path.join(graphToolsDirectory(root), "state", graphEnvironmentKey());
}

export const GRAPH_LOCK_FILE = "analysis.lock";

/** The command entrypoint and the record of what was installed, both in the tools directory. */
export const GRAPH_CLI_ENTRYPOINT = "graph-cli.mjs";
export const GRAPH_ENTRYPOINT_RECORD = "graph-entrypoints.json";
