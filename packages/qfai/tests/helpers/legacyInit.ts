import path from "node:path";
import { runInit as initialize } from "../../src/cli/commands/init.js";
import { runGraphProcess, type GraphProcess } from "../../src/core/graph/process.js";
import { GRAPH_VERSIONS } from "../../src/core/graph/layout.js";
import { graphProcessFixture } from "./graphProcess.js";

// Legacy init suites exercise QFAI behavior with only acquisition/version ports replaced.
// Native provisioning proof is separate; managed acceptance uses dedicated process fixtures.
export function createLegacyGraphProcess(actual: GraphProcess = runGraphProcess): GraphProcess {
  return async (command, args, options) => {
    if (command === "git") return actual(command, args, options);
    if (
      ["claude", "codex", "copilot"].includes(command) &&
      args.length === 1 &&
      args[0] === "--version"
    )
      return { exitCode: 1, stdout: "" };
    const invocation = args[0]?.endsWith("npm-cli.js") ? args.slice(1) : args;
    const inside = (file: string | undefined): boolean => {
      if (!file) return false;
      const relative = path.relative(path.join(options.cwd, ".qfai", "tools"), file);
      return (
        relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
      );
    };
    const npmLauncher =
      command === "npm" ||
      (command === process.execPath &&
        args[0] !== undefined &&
        path.basename(args[0]) === "npm-cli.js");
    const npm =
      npmLauncher &&
      invocation.length === 8 &&
      invocation[0] === "install" &&
      invocation[1] === "--prefix" &&
      inside(invocation[2]) &&
      invocation.slice(3).join("\0") ===
        [
          "--no-audit",
          "--no-fund",
          "--save-exact",
          "--ignore-scripts",
          `@colbymchenry/codegraph@${GRAPH_VERSIONS.codegraph}`,
        ].join("\0");
    const venv =
      command === "uv" &&
      invocation.length === 5 &&
      invocation.slice(0, 4).join("\0") ===
        ["venv", "--python", ">=3.10", "--no-python-downloads"].join("\0") &&
      inside(invocation[4]);
    const pip =
      command === "uv" &&
      invocation.length === 5 &&
      invocation.slice(0, 3).join("\0") === ["pip", "install", "--python"].join("\0") &&
      inside(invocation[3]) &&
      invocation[4] === `graphifyy[ollama]==${GRAPH_VERSIONS.graphify}`;
    const codeVersion =
      command === process.execPath &&
      invocation.length === 2 &&
      inside(invocation[0]) &&
      invocation[0]?.endsWith("npm-shim.js") &&
      invocation[1] === "--version";
    const pythonVersion =
      inside(command) &&
      invocation.length === 5 &&
      invocation.slice(0, 4).join("\0") === ["-I", "-X", "utf8", "-c"].join("\0") &&
      invocation[4] === 'from importlib.metadata import version; print(version("graphifyy"))';
    if (!npm && !venv && !pip && !codeVersion && !pythonVersion)
      throw new Error("Unexpected external operation in legacy init acquisition fixture.");
    return graphProcessFixture().run(command, args, options);
  };
}

export const legacyGraphProcess = createLegacyGraphProcess();

export function runInit(...args: Parameters<typeof initialize>): ReturnType<typeof initialize> {
  return initialize(args[0], args[1], args[2] ?? legacyGraphProcess);
}
