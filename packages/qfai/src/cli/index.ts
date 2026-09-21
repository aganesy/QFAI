#!/usr/bin/env node
import { run } from "./main.js";

/**
 * The command, with every failure turned into an exit code.
 *
 * Separated from the call below so the promise the command returns is awaited
 * by something rather than handed to a `.catch` whose own promise nobody reads.
 * `minimal-implementation.md` § 2 asks for a consuming caller; this is it, and
 * the `try` covers the whole body rather than one link of a chain.
 */
async function main(): Promise<void> {
  try {
    await run(process.argv.slice(2), process.cwd());
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

// The module's top level has no caller to return to, and this entry is built
// for CommonJS as well as for ESM, so a top-level `await` would not compile.
// What the rule asks for at a boundary that cannot return is an adapter that
// adopts the work and handles its rejections under the safety floor: `main` is
// that adapter, and it cannot reject — every failure above becomes an exit code
// — so the call leaves nothing for anyone to consume.
void main();
