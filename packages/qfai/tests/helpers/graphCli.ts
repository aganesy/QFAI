import { runInstalledGraphCli } from "../../src/cli/graphCli.js";
import { runGraphProcess, type GraphProcess } from "../../src/core/graph/process.js";
import { runInstalledGraphHook } from "../../src/cli/graphHook.js";
import type { GraphHookHost } from "../../src/core/graph/hooks.js";

export async function installedGraphHookResult(
  root: string,
  event: unknown,
  host: GraphHookHost = "codex",
) {
  const messages: string[] = [];
  const errors: string[] = [];
  let failures = 0;
  await runInstalledGraphHook(root, [host], {
    read: () => event,
    output: (text) => {
      messages.push(text);
    },
    error: (text) => {
      errors.push(text);
    },
    fail: () => {
      failures += 1;
    },
  });
  return { output: messages.join(""), errors, failures };
}

export async function graphCliResult(
  root: string,
  args: string[],
  run: GraphProcess = runGraphProcess,
) {
  const messages: string[] = [];
  let failures = 0;
  await runInstalledGraphCli(
    root,
    args,
    {
      output: (text) => {
        messages.push(text);
      },
      fail: () => {
        failures += 1;
      },
    },
    run,
  );
  const output = messages.join("");
  const value: unknown = JSON.parse(output);
  return { output, value, failures };
}
