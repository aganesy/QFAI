/* global process */
// The root `build` script. It runs the package's build with the pnpm that runs this script,
// read from `npm_execpath`, rather than a bare `pnpm` looked up on PATH: under `corepack pnpm
// build` on a host with no standalone pnpm, a nested bare `pnpm` is not found.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isPnpmEntry, pnpmCommand } from "./lib/pnpm-command.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function build() {
  const cli = process.env.npm_execpath;
  if (!isPnpmEntry(cli)) {
    process.stderr.write("Run `pnpm build` or `corepack pnpm build` from the repository root.\n");
    return 1;
  }
  let command;
  let leadingArgs;
  try {
    [command, leadingArgs] = pnpmCommand(cli);
  } catch (error) {
    process.stderr.write(
      `Cannot read ${cli}: ${error instanceof Error ? error.message : String(error)}\n` +
        "Run `corepack pnpm build` from the repository root.\n",
    );
    return 1;
  }
  const result = spawnSync(
    command,
    [...leadingArgs, "-C", path.join("packages", "qfai"), "build"],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) {
    process.stderr.write(`Could not start ${cli}: ${result.error.message}\n`);
    return 1;
  }
  if (result.signal) {
    process.stderr.write(`pnpm stopped on signal ${result.signal}.\n`);
    return 1;
  }
  return result.status ?? 1;
}

process.exitCode = build();
