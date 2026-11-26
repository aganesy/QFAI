import { spawnSync } from "node:child_process";
import type { BigIntStats } from "node:fs";
import { lstat } from "node:fs/promises";

import { isEnoent } from "../../src/core/fs/errno.js";

/** Creates a FIFO visible to Node, or returns undefined where the fixture is unavailable. */
export async function createFifoFixture(file: string): Promise<BigIntStats | undefined> {
  // Git Bash can create a pipe in the MSYS layer that Node on Windows cannot see.
  if (process.platform === "win32") return undefined;
  const result = spawnSync("mkfifo", [file], { encoding: "utf8", timeout: 10000 });
  if (isEnoent(result.error)) return undefined;
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `mkfifo failed (${String(result.signal ?? result.status)})\n${result.stderr}`.trimEnd(),
    );
  }
  const entry = await lstat(file, { bigint: true }).catch((error: unknown) => {
    if (isEnoent(error)) return undefined;
    throw error;
  });
  return entry?.isFIFO() === true ? entry : undefined;
}
