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

export function graphRuntimePaths(
  root: string,
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
) {
  const directory = path.join(root, ".qfai", "tools", "runtimes", graphEnvironmentKey(environment));
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

export function graphAnalysisRoot(
  root: string,
  engine: "codegraph" | "graphify" | "graphify-code",
  environment: GraphExecutionEnvironment = graphExecutionEnvironment(),
): string {
  return path.join(root, ".qfai", "tools", "analysis", graphEnvironmentKey(environment), engine);
}
