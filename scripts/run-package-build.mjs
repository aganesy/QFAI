/* global process */
// The root `build` script. It runs the package's build with the pnpm that runs this script,
// read from `npm_execpath`, rather than a bare `pnpm` looked up on PATH: under `corepack pnpm
// build` on a host with no standalone pnpm, a nested bare `pnpm` is not found.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function build() {
  const cli = process.env.npm_execpath;
  const name = cli ? path.basename(cli) : "";
  if (!cli || !path.isAbsolute(cli) || !/^pnpm(?:\.(?:cjs|mjs|js|exe))?$/i.test(name)) {
    process.stderr.write("Run `pnpm build` or `corepack pnpm build` from the repository root.\n");
    return 1;
  }
  // Corepack and an npm-installed pnpm name a JavaScript entry; the standalone pnpm names
  // its own native executable.
  const args = ["-C", path.join("packages", "qfai"), "build"];
  const [command, commandArgs] = /\.(?:cjs|mjs|js)$/i.test(name)
    ? [process.execPath, [cli, ...args]]
    : [cli, args];
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit" });
  if (result.error) {
    process.stderr.write("Could not start pnpm.\n");
    return 1;
  }
  if (result.signal) {
    process.stderr.write(`pnpm stopped on signal ${result.signal}.\n`);
    return 1;
  }
  return result.status ?? 1;
}

process.exitCode = build();
