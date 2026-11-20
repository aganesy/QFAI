/**
 * The forward-compatibility lane has to tell a type failure from a compiler that
 * never finished.
 *
 * `spawnSync` leaves `status` null when the compiler could not start, when a
 * signal stopped it, and when its captured output passed the buffer limit. The
 * lane exited 1 in every one of those cases and printed nothing about why, so a
 * killed or unstartable compiler read exactly like a type error nobody could find.
 *
 * Reached through a stand-in for `spawnSync` rather than by running a compiler:
 * the outcomes under test are the ones a real compiler run almost never produces.
 */
import type { SpawnSyncOptions, SpawnSyncReturns } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

type Outcome = { code: number; message: string | null };
type Spawn = (
  command: string,
  args: readonly string[],
  options: SpawnSyncOptions,
) => Pick<SpawnSyncReturns<string>, "status" | "signal" | "error">;

type Lane = { runFutureCompiler: (spawn: Spawn) => Outcome };

/** A `file:` URL rather than the path: a Windows drive letter reads as a scheme. */
async function load(): Promise<Lane> {
  const url = pathToFileURL(path.join(repoRoot, "scripts", "check-types-future.mjs")).href;
  return (await import(url)) as Lane;
}

/** A stand-in compiler run that ends the way `result` says, recording its options. */
function stub(result: Partial<Pick<SpawnSyncReturns<string>, "status" | "signal" | "error">>) {
  const calls: SpawnSyncOptions[] = [];
  const spawn: Spawn = (_command, _args, options) => {
    calls.push(options);
    return { status: null, signal: null, ...result };
  };
  return { spawn, calls };
}

describe("runFutureCompiler", () => {
  it("names the error when the compiler could not start", async () => {
    const { runFutureCompiler } = await load();
    const { spawn } = stub({ error: new Error("spawn EACCES") });

    const outcome = runFutureCompiler(spawn);

    expect(outcome.code).toBe(1);
    expect(outcome.message).toContain("could not run");
    expect(outcome.message).toContain("spawn EACCES");
  });

  it("names the signal that stopped the compiler", async () => {
    const { runFutureCompiler } = await load();
    const { spawn } = stub({ signal: "SIGKILL" });

    const outcome = runFutureCompiler(spawn);

    expect(outcome.code).toBe(1);
    expect(outcome.message).toContain("SIGKILL");
  });

  // Streamed rather than captured, so no amount of diagnostics can pass a
  // buffer limit and turn a type failure into a missing exit status.
  it("streams the compiler's output instead of capturing it", async () => {
    const { runFutureCompiler } = await load();
    const { spawn, calls } = stub({ status: 0 });

    runFutureCompiler(spawn);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.stdio).toBe("inherit");
  });

  // A type failure keeps the compiler's own exit code and adds nothing: the
  // diagnostics the compiler printed are the explanation.
  it("passes a type failure's exit code through", async () => {
    const { runFutureCompiler } = await load();
    const { spawn } = stub({ status: 2 });

    expect(runFutureCompiler(spawn)).toEqual({ code: 2, message: null });
  });

  it("reports a pass", async () => {
    const { runFutureCompiler } = await load();
    const { spawn } = stub({ status: 0 });

    expect(runFutureCompiler(spawn)).toEqual({
      code: 0,
      message: "Future TypeScript compatibility check passed.",
    });
  });
});
