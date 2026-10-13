import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GRAPH_VERSIONS } from "../../src/core/graph/prepare.js";
import type { GraphProcess } from "../../src/core/graph/process.js";

export function graphProcessFixture(): {
  run: GraphProcess;
  calls: { command: string; args: readonly string[]; env?: NodeJS.ProcessEnv }[];
} {
  const calls: { command: string; args: readonly string[]; env?: NodeJS.ProcessEnv }[] = [];
  const run: GraphProcess = async (command, args, options) => {
    calls.push({ command, args, ...(options.env ? { env: options.env } : {}) });
    if (args.includes("--prefix")) {
      const prefix = args[args.indexOf("--prefix") + 1];
      if (!prefix || !args.includes(`@colbymchenry/codegraph@${GRAPH_VERSIONS.codegraph}`)) {
        return { exitCode: 1, stdout: "" };
      }
      const shim = path.join(prefix, "node_modules", "@colbymchenry", "codegraph", "npm-shim.js");
      await mkdir(path.dirname(shim), { recursive: true });
      await writeFile(shim, "fixture executable\n");
    }
    if (args[0] === "venv") {
      const directory = args.at(-1);
      if (!directory) return { exitCode: 1, stdout: "" };
      const executable =
        process.platform === "win32"
          ? path.join(directory, "Scripts", "python.exe")
          : path.join(directory, "bin", "python");
      await mkdir(path.dirname(executable), { recursive: true });
      await writeFile(executable, "fixture interpreter\n");
    }
    const stdout = args.includes("--version")
      ? GRAPH_VERSIONS.codegraph
      : args.includes("-c")
        ? GRAPH_VERSIONS.graphify
        : "";
    return { exitCode: 0, stdout };
  };
  return { run, calls };
}
