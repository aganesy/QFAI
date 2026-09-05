import process from "node:process";

/**
 * The parallelism knob set, defined once and split by the scope the runner honours.
 *
 * ## Why this file exists
 *
 * The knobs must be **declared** rather than inherited: an inherited value lives in the
 * runner's release notes, where a version bump can change it with no diff in this
 * repository, while a declared value shows up in review. Several of the values below
 * equal today's defaults, and that is not a reason to omit them.
 *
 * ## Why the set is SPLIT, and not all per project
 *
 * The runner scopes these options, and the split is its decision rather than a
 * preference. `ProjectConfig` is `Omit<UserConfig, NonProjectOptions | …>`, and
 * `NonProjectOptions` names `maxWorkers`, `minWorkers` and `fileParallelism`. Its
 * `poolOptions.forks` is further narrowed to `singleFork | isolate`, so `maxForks` is not
 * a project-level escape hatch either.
 *
 * A first attempt declared the worker axis on every project. It type-checked, it ran, it
 * emitted no warning — and it did nothing. Measured on the `validators` project,
 * constraining the worker override to one against the declared default gave a wall-clock
 * ratio of 0.93, which is noise. Two independent lines of evidence, the runner's own type
 * and the stopwatch, agree that a project-level worker declaration is inert.
 *
 * So the worker and file-parallelism axes are declared at the ROOT, where the runner reads
 * them, and everything genuinely project-scoped stays per project. Both halves are still
 * declared; only the declaration site follows the runner.
 *
 * ## Retries
 *
 * There is deliberately no such setting in either half. More workers means more
 * concurrent writers against temporary trees and the spawned binary, and re-running a
 * failing test would mask exactly the races that surfaces.
 */

/** The override variable for the worker axis. The NAME is part of the contract. */
export const WORKERS_ENV = "QFAI_TEST_MAX_WORKERS";

/** The override variable for the within-file concurrency axis. */
export const CONCURRENCY_ENV = "QFAI_TEST_MAX_CONCURRENCY";

/**
 * The declared starting value on both tunable axes.
 *
 * A hypothesis, not a measurement. The source repository's numbers are justified as
 * network-bound while this suite is filesystem- and subprocess-bound, so they do not
 * transfer. Adopting a final value needs a timing artifact comparing at least two
 * settings on the largest project, one project per pull request; revising this declared
 * starting value needs the user's sign-off. Neither is a decision this file may take.
 */
export const DECLARED_START = 10;

/**
 * A positive integer from `name`, or the declared starting value.
 *
 * Deliberately strict. `Number("")` and `Number(" ")` are both 0 — the shape a shell
 * produces from an unset variable — so a lenient parse would silently reconfigure the
 * suite to zero workers. Fractions and exponent forms are rejected for the same reason:
 * a tuning aid must not be able to change how the suite runs by accident.
 *
 * The override is what lets the measurement rules coexist with the declared value. A
 * timing run can be taken at any setting without editing a declaration, so taking a
 * measurement never looks like adopting one.
 */
export function tunable(name: string): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return DECLARED_START;
  }
  const trimmed = raw.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return DECLARED_START;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DECLARED_START;
}

/**
 * The axes the runner reads only from the root configuration.
 *
 * `minWorkers` is declared alongside the maximum so the pool has a stated floor rather
 * than an inherited one; it is not tunable, because the obligation is about the ceiling.
 */
export const rootKnobs = {
  maxWorkers: tunable(WORKERS_ENV),
  minWorkers: 1,
  fileParallelism: true,
} as const;

/**
 * The knobs every project declares.
 *
 * `forks` over `threads` on purpose: much of this suite spawns the built binary and writes
 * temporary trees, and process isolation is what keeps those from colliding.
 *
 * ## Why the timeout is 120 s and not 15 s
 *
 * It was 15 s, declared once for all seven projects, and three tests failed on it in a
 * full-suite run at the declared ten workers. Raising a timeout is normally the wrong
 * answer — it accommodates a race instead of removing one — so the cost was measured
 * before the number moved:
 *
 * ```text
 * node -e 0            (interpreter floor)      92 ms
 * require the bundle   dist/cli/index.cjs     1257 ms
 * qfai --version       (a command doing none)  1154 ms
 * ```
 *
 * **Ninety-three per cent of every CLI invocation is loading the 1.44 MB bundle**, before
 * any command runs. Fifty-seven test files spawn that binary, most of them several times
 * per test, and the pool is ten workers — so the machine runs up to twenty Node processes,
 * each paying a second before doing anything. In a run of the `e2e` project ALONE, five
 * tests already exceed 15 s and the slowest takes 47.3 s; under the full suite the same
 * files take longer again.
 *
 * So 15 s was never a budget for this workload. It was a budget for in-process tests,
 * applied to a suite that is subprocess-bound, and the eight e2e files that pass under it
 * do so by luck — the ones that reliably exceed it already carry their own
 * `{ timeout: 120000 }`, which is where this value comes from rather than from a guess.
 *
 * **The root cause is the cold start, not the budget**, and it is not fixed here: making
 * the CLI load only the command it was asked for is a change to another spec's surface and
 * belongs in its own pull request. It is filed as `CR-20260823-0001`. When it lands this
 * number should come back down, and the measurement above is what to re-take.
 *
 * This is not the retry setting the section above refuses. A retry re-runs a test that
 * failed; this lets a test that is working finish at the concurrency the project declares.
 */
export const projectKnobs = {
  testTimeout: 120_000,
  hookTimeout: 120_000,
  pool: "forks",
  poolOptions: { forks: { singleFork: false, isolate: true } },
  maxConcurrency: tunable(CONCURRENCY_ENV),
  /**
   * Here rather than in one project, because the leak it stops is not one
   * project's: a test anywhere that validates a `mkdtemp` fixture with
   * `--format github` emits `::error file=<relative path>::…` to the runner's
   * stdout, and GitHub resolves that path against THIS repository (#1160).
   *
   * `pool: "forks"` with `isolate: true` gives every test file its own process,
   * so a setup that patches `process.stdout` has to run per file — which is
   * what `setupFiles` does and what a `globalSetup` would not.
   */
  // `as string[]` because `projectKnobs` is `as const`, and `ProjectConfig`
  // declares `setupFiles` mutable — a readonly tuple is not assignable to it.
  setupFiles: ["./tests/setup/suppressWorkflowCommands.ts"] as string[],
} as const;
