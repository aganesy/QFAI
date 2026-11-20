/**
 * The future compiler lane refuses a tsconfig that silences deprecations, and only that.
 *
 * The lane used to ask whether the file's text contained the word `ignoreDeprecations`. That
 * refused a tsconfig whose comment or `$comment` string merely named the option, stopping the lane
 * before any compiler ran, and it passed a key spelled with a JSON escape that the compiler reads
 * as the option itself. The decision now reads the parsed `compilerOptions`, the way the compiler
 * does.
 *
 * It also has to tell a type failure from a compiler that never finished. `spawnSync` leaves
 * `status` null when the compiler could not start, when a signal stopped it, and when its captured
 * output passed the buffer limit; the lane exited 1 in each case and printed nothing about why.
 * Those cases are reached through a stand-in for `spawnSync` rather than a real compiler run, which
 * almost never produces them.
 */
import type { SpawnSyncOptions, SpawnSyncReturns } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

type Outcome = { code: number; message: string | null };
type SpawnResult = Pick<SpawnSyncReturns<string>, "status" | "signal" | "error">;
type Spawn = (command: string, args: readonly string[], options: SpawnSyncOptions) => SpawnResult;

type Guard = {
  tsconfigSilencesDeprecations: (fileName: string, text: string) => boolean;
  runFutureCompiler: (spawn: Spawn) => Outcome;
};

/**
 * A `file:` URL rather than the path: an absolute Windows path starts with a drive letter, which an
 * import specifier reads as a scheme.
 */
async function load(): Promise<Guard> {
  const url = pathToFileURL(path.join(repoRoot, "scripts", "check-types-future.mjs")).href;
  return (await import(url)) as Guard;
}

const FILE = "tsconfig.json";

describe("tsconfigSilencesDeprecations", () => {
  it("refuses the option set in compilerOptions", async () => {
    const { tsconfigSilencesDeprecations } = await load();

    expect(
      tsconfigSilencesDeprecations(FILE, '{ "compilerOptions": { "ignoreDeprecations": "6.0" } }'),
    ).toBe(true);
  });

  // JSONC: the compiler accepts comments and trailing commas, so the guard has to as well.
  it("refuses the option in a tsconfig with comments and trailing commas", async () => {
    const { tsconfigSilencesDeprecations } = await load();
    const text = [
      "{",
      "  // the base config",
      '  "compilerOptions": {',
      '    "strict": true,',
      '    "ignoreDeprecations": "6.0",',
      "  },",
      "}",
    ].join("\n");

    expect(tsconfigSilencesDeprecations(FILE, text)).toBe(true);
  });

  // A key the compiler decodes to the option is the option, however the file spells it.
  it("refuses the option spelled with a JSON escape", async () => {
    const { tsconfigSilencesDeprecations } = await load();

    expect(
      tsconfigSilencesDeprecations(
        FILE,
        '{ "compilerOptions": { "ignore\\u0044eprecations": "6.0" } }',
      ),
    ).toBe(true);
  });

  it("passes a tsconfig that names the option only in a comment", async () => {
    const { tsconfigSilencesDeprecations } = await load();
    const text = [
      "{",
      "  // ignoreDeprecations is not used here: fix the deprecated option instead.",
      '  "compilerOptions": { "strict": true, },',
      "}",
    ].join("\n");

    expect(tsconfigSilencesDeprecations(FILE, text)).toBe(false);
  });

  it("passes a tsconfig that names the option only in another string", async () => {
    const { tsconfigSilencesDeprecations } = await load();
    const text =
      '{ "$comment": "never set ignoreDeprecations", "compilerOptions": { "strict": true } }';

    expect(tsconfigSilencesDeprecations(FILE, text)).toBe(false);
  });

  // The option outside compilerOptions is not an option the compiler reads.
  it("passes the name used as a key outside compilerOptions", async () => {
    const { tsconfigSilencesDeprecations } = await load();

    expect(tsconfigSilencesDeprecations(FILE, '{ "ignoreDeprecations": "6.0" }')).toBe(false);
  });

  // A file the guard cannot read is not one it can vouch for.
  it("throws on a tsconfig it cannot parse, rather than passing it", async () => {
    const { tsconfigSilencesDeprecations } = await load();

    expect(() => tsconfigSilencesDeprecations(FILE, '{ "compilerOptions": ')).toThrow(FILE);
  });
});

/** A stand-in compiler run that ends the way `result` says, recording its options. */
function stub(result: Partial<SpawnResult>) {
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
