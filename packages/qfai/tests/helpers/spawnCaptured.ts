/**
 * Spawns a process and keeps everything a failing assertion needs to explain itself.
 *
 * Node calls a `close` listener with **two** arguments, `(code, signal)`. A child that
 * chose its own exit gives a number and `null`; a child a signal ended gives `null` and
 * the signal's name. A helper that takes the first and drops the second turns every kill
 * into `code: null` with its cause thrown away, and `expect(result.code).toBe(0)` then
 * fails with `expected null to be +0` — a message that names no cause, no signal and no
 * child.
 *
 * The other direction is worse and quieter: `expect(result.code).not.toBe(0)` is how a
 * test says "the script rejected this input", and a killed child satisfies it. Such a
 * test passes while proving nothing, and nothing in the run says so.
 *
 * So the outcome is one value, and assertions read that value rather than the raw code.
 * `exit 0`, `exit 1` and `killed by SIGKILL` are three different strings: a kill cannot
 * satisfy either direction by accident, and whichever way the assertion fails, the
 * message carries the signal.
 */

import { spawn } from "node:child_process";

/** What a spawned child reported, with the cause of its ending kept. */
export interface Spawned {
  /** The exit code, or `null` when a signal ended the child. */
  code: number | null;
  /** The signal that ended the child, or `null` when it exited on its own. */
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  /**
   * The ending as one readable value: `exit <n>` for a child that chose its code,
   * `killed by <SIGNAL>` for one a signal ended.
   */
  outcome: string;
}

/** The outcome of a child that ran to completion and reported failure. */
export const EXIT_NONZERO = /^exit [1-9][0-9]*$/;

/** The outcome of a child that ran to completion and reported success. */
export const EXIT_ZERO = "exit 0";

/**
 * How a child ended, as the string every assertion reads.
 *
 * Exported so a test can name the outcome it expects without rebuilding the spelling,
 * which is the copy that would drift from the one assertions compare against.
 */
export function outcomeOf(code: number | null, signal: NodeJS.Signals | null): string {
  if (signal !== null) return `killed by ${signal}`;
  if (code === null) return "closed with neither an exit code nor a signal";
  return `exit ${code}`;
}

/**
 * A runtime that died before it could run the program, as it opens its report.
 *
 * .NET opens with `Unhandled exception.` and follows it with the exception's own type and
 * message; other runtimes name the type first. Both shapes are anchored to the start of a
 * line, because the words are ordinary enough to appear inside a message a script chose to
 * print — and a script's own line about an exception is the script answering.
 */
const RUNTIME_ABORT_RE = /^(?:Unhandled exception\.|[A-Za-z_][\w.]*(?:Exception|Error): )/m;

/**
 * What to show when an assertion about a child's OUTPUT fails.
 *
 * `expected '' to contain 'authored removal-list answer'` is the whole of what one such
 * failure reported, and it reads as the script under test printing the wrong thing. It meant
 * the script printed nothing at all — a different failure, and one no rerun of the assertion
 * can tell apart, because the assertion is about the text and the defect is about the child.
 *
 * So a row that reads the output passes this as its message. Silence is named as silence and
 * attributed to the child's ending, and a child that spoke hands the reader its stderr, which
 * is the part `toContain` never shows.
 *
 * A child that spoke can still have said nothing about the script. When a runtime aborts
 * before the program starts, its report is the whole of stderr — and the assertion, being
 * about the text, reads it as the script printing the wrong thing.
 * `System.IO.FileLoadException: The given assembly name was invalid.` arrived that way on a
 * leg whose change touched no PowerShell, and the message that reached the reader named no
 * file, no case and no script. So that case is named, and named FIRST, because what the
 * reader does next differs: a wrong answer is the script's, and a dead runtime is not.
 */
export function outputContext(result: Spawned): string {
  if (result.stdout.length === 0 && RUNTIME_ABORT_RE.test(result.stderr)) {
    return `${result.outcome}, and the child's runtime aborted before the script wrote anything — what follows is the runtime's report, not the script's answer\n${result.stderr}`;
  }
  if (result.stdout.length + result.stderr.length > 0) {
    return `${result.outcome}\n${result.stderr}`;
  }
  return `${result.outcome}, and the child wrote nothing on either stream — the harness failed rather than the script printing the wrong thing`;
}

/**
 * The signals a runtime dies on when its own process is broken.
 *
 * A script cannot raise these by answering: an exit is a code, and a script that means to fail
 * says so with one. On the PowerShell legs they arrive together with a .NET report of an
 * assembly name that is intact up to a point and garbage after it —
 * `System.Collections.Concurrent, Version=10.0.0.0, Culture=neutral, PublicKeyT` and then a
 * character no assembly name holds — which is the host's own memory, not the script.
 */
const HOST_CRASH_SIGNALS: ReadonlySet<NodeJS.Signals> = new Set(["SIGABRT", "SIGBUS", "SIGSEGV"]);

/** Whether the child's runtime crashed, rather than the program it ran giving an answer. */
export function hostCrashed(result: Pick<Spawned, "signal">): boolean {
  return result.signal !== null && HOST_CRASH_SIGNALS.has(result.signal);
}

/**
 * Runs one case again when the runtime it spawned crashed, and says so.
 *
 * The retry is the whole case, not the spawn: a crash can land after the script has already
 * written to the fixture's stubs, and a second spawn over that state would count one run's
 * calls twice. So `attempt` rebuilds everything it reads.
 *
 * SIMPLIFIED: one retry, on a crash signal only. A second crash, or any exit code, is reported
 * as it happened.
 * Lift when: the runner's PowerShell no longer crashes this way — the warning below stops
 * appearing in the test legs' logs.
 */
export async function retryOnHostCrash<T extends Spawned>(
  attempt: () => Promise<T>,
  warn: (message: string) => void = (message) => {
    process.stderr.write(`${message}\n`);
  },
): Promise<T> {
  const first = await attempt();
  if (!hostCrashed(first)) return first;
  warn(
    `the child's runtime crashed (${first.outcome}) before answering; running the case once more. Its report:\n${first.stderr.slice(0, 600)}`,
  );
  return await attempt();
}

export interface SpawnCapturedOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Written to the child's stdin, which is then closed. Omitted, stdin is `ignore`. */
  input?: string;
}

/** Runs `command` to completion and answers with what it reported. */
export async function spawnCaptured(
  command: string,
  args: readonly string[],
  options: SpawnCapturedOptions = {},
): Promise<Spawned> {
  const { cwd, env, input } = options;
  return await new Promise<Spawned>((resolve, reject) => {
    const child = spawn(command, [...args], {
      ...(cwd === undefined ? {} : { cwd }),
      ...(env === undefined ? {} : { env }),
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });

    const { stdout, stderr } = child;
    if (stdout === null || stderr === null) {
      reject(new Error(`${command} was spawned without pipes`));
      return;
    }

    let out = "";
    let err = "";
    stdout.setEncoding("utf-8");
    stdout.on("data", (chunk: string) => {
      out += chunk;
    });
    stderr.setEncoding("utf-8");
    stderr.on("data", (chunk: string) => {
      err += chunk;
    });
    child.on("error", reject);

    if (input !== undefined) {
      const { stdin } = child;
      if (stdin === null) {
        reject(new Error(`${command} was spawned without a stdin pipe`));
        return;
      }
      // A program that ignores its input exits with the pipe still open, so the write
      // fails. That is the program finishing, not the program failing.
      stdin.on("error", () => {});
      stdin.end(input);
    }

    child.on("close", (code, signal) => {
      resolve({ code, signal, stdout: out, stderr: err, outcome: outcomeOf(code, signal) });
    });
  });
}
