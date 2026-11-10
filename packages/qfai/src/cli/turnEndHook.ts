import { readFileSync } from "node:fs";
import os from "node:os";

import { runTurnEndHook } from "../core/turnEndHook.js";

/**
 * The Stop and SubagentStop hook `qfai init` installs, run by the guard in the host hook file.
 *
 * It never fails the host: every error is swallowed and the hook exits 0 with nothing printed, so
 * a broken install lets the turn end rather than holding it open.
 */
async function main(): Promise<void> {
  try {
    let input: unknown;
    try {
      input = JSON.parse(readFileSync(0, "utf8"));
    } catch {
      input = undefined;
    }
    const output = await runTurnEndHook(input, {
      processDir: process.cwd(),
      stateDir: os.tmpdir(),
    });
    if (output !== "") process.stdout.write(output);
  } catch {
    // Nothing to report: the turn ends as if no check were marked.
  }
  process.exitCode = 0;
}

// The entry is loaded by `require` from the guard and has no caller to return to; `main` handles
// every failure itself, so the promise it returns cannot reject.
void main();
