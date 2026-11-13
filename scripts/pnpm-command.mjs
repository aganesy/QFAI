/* global Buffer, process */
// How a root script starts the pnpm that runs it, named by `npm_execpath`, rather than a bare
// `pnpm` looked up on PATH: under `corepack pnpm <script>` on a host with no standalone pnpm, a
// nested bare `pnpm` is not found.
import { closeSync, openSync, readSync } from "node:fs";
import path from "node:path";

// The names pnpm puts in `npm_execpath`: Corepack names a JavaScript entry `pnpm` or `pnpm.cjs`,
// and the standalone pnpm names its native executable `pnpm`, `pnpm.exe` or `pnpm-native`.
const PNPM_ENTRY = /^pnpm(?:-native)?(?:\.(?:cjs|mjs|js|exe))?$/i;

// The leading bytes of an ELF, PE or Mach-O executable.
const NATIVE_MAGIC = [
  [0x7f, 0x45, 0x4c, 0x46],
  [0x4d, 0x5a],
  [0xcf, 0xfa, 0xed, 0xfe],
  [0xca, 0xfe, 0xba, 0xbe],
];

/** Whether `cli` is an absolute path whose name pnpm gives its entry. */
export function isPnpmEntry(cli) {
  return typeof cli === "string" && path.isAbsolute(cli) && PNPM_ENTRY.test(path.basename(cli));
}

// The name does not say which kind of file pnpm put in `npm_execpath`; the file's first bytes do.
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

/**
 * The command and arguments that start the pnpm entry `cli` with `args`: the entry itself when
 * it is a native executable, otherwise Node.js running it. Throws when `cli` cannot be read.
 */
export function pnpmCommand(cli, args) {
  return isNativeExecutable(cli) ? [cli, args] : [process.execPath, [cli, ...args]];
}
