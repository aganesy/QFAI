/* global Buffer, process */
// The root `build` script. It runs the package's build with the pnpm that runs this script,
// read from `npm_execpath`, rather than a bare `pnpm` looked up on PATH: under `corepack pnpm
// build` on a host with no standalone pnpm, a nested bare `pnpm` is not found.
import { spawnSync } from "node:child_process";
import { closeSync, openSync, readSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The leading bytes of an ELF, PE or Mach-O executable.
const NATIVE_MAGIC = [
  [0x7f, 0x45, 0x4c, 0x46],
  [0x4d, 0x5a],
  [0xcf, 0xfa, 0xed, 0xfe],
  [0xca, 0xfe, 0xba, 0xbe],
];

// The name does not say which kind of file pnpm put in `npm_execpath`: Corepack names a
// JavaScript entry `pnpm` or `pnpm.cjs`, and the standalone pnpm names its native executable
// `pnpm`, `pnpm.exe` or `pnpm-native`. The file's first bytes do.
function isNativeExecutable(file) {
  const head = Buffer.alloc(4);
  const fd = openSync(file, "r");
  try {
    readSync(fd, head, 0, head.length, 0);
  } finally {
    closeSync(fd);
  }
  return NATIVE_MAGIC.some((magic) => magic.every((byte, index) => head[index] === byte));
}

function build() {
  const cli = process.env.npm_execpath;
  const name = cli ? path.basename(cli) : "";
  if (!cli || !path.isAbsolute(cli) || !/^pnpm(?:-native)?(?:\.(?:cjs|mjs|js|exe))?$/i.test(name)) {
    process.stderr.write("Run `pnpm build` or `corepack pnpm build` from the repository root.\n");
    return 1;
  }
  const args = ["-C", path.join("packages", "qfai"), "build"];
  let native;
  try {
    native = isNativeExecutable(cli);
  } catch {
    process.stderr.write(
      "Cannot read the pnpm named by npm_execpath. Run `corepack pnpm build` from the repository root.\n",
    );
    return 1;
  }
  const [command, commandArgs] = native ? [cli, args] : [process.execPath, [cli, ...args]];
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
