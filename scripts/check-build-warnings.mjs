/* global process */
// Builds the package with the pnpm that runs this script, named by `npm_execpath`, and fails on
// the build warnings listed below. Run directly with `node`, where `npm_execpath` is unset, it
// starts a native `pnpm` executable on PATH; a `pnpm.cmd` shim on Windows is not found.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isPnpmEntry, pnpmCommand } from "./lib/pnpm-command.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const patterns = [
  "empty-import-meta",
  '"import.meta" is not available with the "cjs" output format',
];

function checkBuildWarnings() {
  const cli = process.env.npm_execpath ?? "pnpm";
  if (process.env.npm_execpath !== undefined && !isPnpmEntry(cli)) {
    process.stderr.write("Run `corepack pnpm ci:gate:build` from the repository root.\n");
    return 1;
  }
  let command;
  let leadingArgs;
  try {
    [command, leadingArgs] = cli === "pnpm" ? [cli, []] : pnpmCommand(cli);
  } catch (error) {
    process.stderr.write(
      `Cannot read ${cli}: ${error instanceof Error ? error.message : String(error)}\n` +
        "Run `corepack pnpm ci:gate:build` from the repository root.\n",
    );
    return 1;
  }
  const result = spawnSync(
    command,
    [...leadingArgs, "-C", path.join("packages", "qfai"), "build"],
    { cwd: root, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error) {
    process.stderr.write(`Could not start ${cli}: ${result.error.message}\n`);
    return 1;
  }
  if (result.signal) {
    process.stderr.write(`pnpm stopped on signal ${result.signal}.\n`);
    return 1;
  }
  if (result.status !== 0) return result.status ?? 1;

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const hits = patterns.filter((pattern) => output.includes(pattern));
  if (hits.length > 0) {
    process.stderr.write(
      ["Build warnings detected:", ...hits.map((hit) => `- ${hit}`)].join("\n") + "\n",
    );
    return 1;
  }
  return 0;
}

process.exitCode = checkBuildWarnings();
