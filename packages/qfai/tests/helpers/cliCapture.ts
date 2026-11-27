import { run } from "../../src/cli/main.js";

import { captureStderr } from "./stderr.js";
import { captureStdout } from "./stdout.js";

/**
 * Runs the CLI in-process and returns its exit code with what it wrote to each stream. Both
 * writers and `process.exitCode` are restored afterwards, also when the run throws.
 */
export async function runCliCaptured(
  args: string[],
  cwd = process.cwd(),
): Promise<{ code: number; out: string; err: string }> {
  const previous = process.exitCode;
  process.exitCode = undefined;
  let code = 0;
  let err = "";
  try {
    const out = await captureStdout(async () => {
      err = await captureStderr(async () => {
        await run(args, cwd);
        code = Number(process.exitCode ?? 0);
      });
    });
    return { code, out, err };
  } finally {
    process.exitCode = previous;
  }
}
