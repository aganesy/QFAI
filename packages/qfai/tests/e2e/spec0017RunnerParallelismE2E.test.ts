/**
 * `US-0017-0007`, asserted over what the runner DOES rather than over what the configuration says.
 *
 * ## Why this file exists
 *
 * This story's E2E annotation was removed in round 1, and correctly: its sole assertion was that
 * `qfai.config.yaml` exists after init, which `tests/e2e/initE2E.test.ts` already asserted, and which
 * "would hold for a project with no knobs in it at all". The matrix had already scored its
 * `Oracle strength` `❌` and the annotation was appended anyway. `QFAI-ATDD-111` has reported the story
 * uncovered ever since.
 *
 * Eleven rounds then reviewed the instruments and never came back to the gap. Two things about it were
 * wrong, and the second is why the first went unnoticed for so long.
 *
 * **The subject is the OWN repository, not the shipped scaffold.** The story reads "as a maintainer
 * tuning a 415-file suite", and its three slice surfaces — vitest project names, the CI matrix slice
 * list, the per-slice scripts — are all this repository's. Every other `tests/e2e/**` file here runs
 * `qfai init` into a temporary directory and asserts over an adopter's tree, so the obvious reading of
 * the layer obligation pointed at a tree this story is not about. "No knob file ships" is true and is
 * not a gap in coverage; it is a mismatch between the story's subject and where the search was made.
 *
 * **And the eight tests that do cover the story assert declarations.** `vitestWorkspaceKnobs.test.ts`
 * checks that each knob is declared "at the site the runner reads it"; `sliceSurfaceAlignment.test.ts`
 * checks the three surfaces hold one set of names. Every one is a claim about how the configuration is
 * WRITTEN — which is item 7 of `§ Gaps / Open risks`, the class that accounts for most of this spec's
 * findings, sitting undisturbed in eight tests.
 *
 * `vitest.knobs.ts` knows the difference. Its own docstring records that a project-level worker
 * declaration "type-checked, it ran, it emitted no warning — and it did nothing", measured at a 0.93
 * wall-clock ratio. So the file already contains the proof that a declaration can be declared, read by a
 * test, and have no effect. Nothing asserted the effect.
 *
 * ## What this measures
 *
 * The worker axis is observed through the pool's behaviour: four test files that each record when they
 * start and finish, run twice through the real `rootKnobs`, once with the override at 1 and once at 4.
 * The maximum number of simultaneously live files is 1 in the first case — guaranteed by the pool rather
 * than by timing — and greater than 1 in the second.
 *
 * That is deliberately not a wall-clock ratio. A ratio needs a threshold, a threshold needs a machine,
 * and this suite runs on `ubuntu-latest` as well as here. Counting overlap needs neither: with one worker
 * the intervals cannot overlap whatever the machine does, and with four they do unless the machine has
 * one core, which no runner this project targets has.
 *
 * ## The fixture's SHAPE is load-bearing, and the first version got it wrong
 *
 * The fixture mirrors the real repository: root config carries `rootKnobs`, the workspace's project carries
 * `projectKnobs`. The first version spread both into one flat `test:` block, and round 12 measured what
 * that cost — it honoured the worker axis whichever object carried it, so it could not be put into the one
 * inert state this module exists to record. With the axes declared per project, four files run at once with
 * the override pinned to one; the flat fixture would have passed.
 *
 * That made mutation 1 below — "the axis declared at a scope the runner ignores" — the mutation this test
 * was structurally unable to observe, while listing it as one it caught. It reddened for a different
 * reason.
 *
 * ## Falsifications, five, all reddening
 *
 *   1. the axis declared at a scope the runner ignores (`maxWorkers` set to `undefined`)
 *   2. the override read and discarded (a fixed literal)
 *   3. file parallelism switched off, so no axis can matter
 *   4. the override variable renamed — which found a self-referential oracle in the first version: it read
 *      the name from the module it tests, so a rename carried the test along and everything stayed green.
 *      The name is pinned as a literal now, the one value here that must not come from the subject.
 *   5. **`maxWorkers` MOVED from `rootKnobs` to `projectKnobs`** — the real inertness mode, added after
 *      round 12 showed the flat fixture blind to it. Now: `expected 4 to be 1` at one worker.
 *
 * ## What this test does NOT establish, since a sibling already does
 *
 * `tests/scripts/vitestWorkspaceKnobs.test.ts` asserts the split directly — `maxWorkers`, `minWorkers` and
 * `fileParallelism` must be shaped at root, and a root-only option declared on a project is "a declaration
 * nothing reads". So mutation 5 reddens there too, and this test is not the only instrument that catches
 * it. What it adds is the direction that one cannot: that the axis, correctly declared, has an EFFECT. The
 * two are complementary and the honest claim is that pair, not this file alone.
 */

// QFAI:SPEC-0017:US-0017-0007

import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { afterAll, describe, expect, it } from "vitest";

import { CONCURRENCY_ENV, DECLARED_START, WORKERS_ENV, tunable } from "../../vitest.knobs.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const temporary: string[] = [];

afterAll(async () => {
  for (const dir of temporary) {
    await removeTempTree(dir);
  }
});

/** How long each fixture file holds its slot. Long enough that overlap is not a coin flip. */
const HOLD_MS = 700;
const FIXTURE_FILES = 4;

interface Interval {
  readonly file: string;
  readonly start: number;
  readonly end: number;
}

/**
 * The greatest number of intervals alive at once.
 *
 * A sweep over the endpoints rather than a pairwise comparison, so the answer is the true maximum and
 * not "some pair overlapped".
 */
function peakConcurrency(intervals: readonly Interval[]): number {
  const events = intervals
    .flatMap((i) => [
      { at: i.start, delta: 1 },
      { at: i.end, delta: -1 },
    ])
    // An end at the same instant as a start is not an overlap, so ends are processed first.
    .sort((a, b) => a.at - b.at || a.delta - b.delta);
  let live = 0;
  let peak = 0;
  for (const event of events) {
    live += event.delta;
    peak = Math.max(peak, live);
  }
  return peak;
}

/**
 * A throwaway suite whose files record their own live interval, configured through the REAL knobs.
 *
 * The config imports `vitest.knobs.ts` from this package rather than restating any value, which is what
 * makes the measurement a statement about the shipped knob module instead of about a copy of it.
 */
async function fixture(): Promise<{ dir: string; log: string }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-parallelism-"));
  temporary.push(dir);
  const log = path.join(dir, "intervals.jsonl");
  await mkdir(path.join(dir, "tests"), { recursive: true });

  const knobs = path.join(PACKAGE_ROOT, "vitest.knobs.ts").split(path.sep).join("/");

  // The REAL shape, not a flattened one. Spreading both halves into a single `test:` block honoured the
  // worker axis whichever object carried it — so the fixture could not be put into the one inert state
  // this module exists to record, where the axis is declared at project scope and the runner ignores it.
  // Round 12 measured that: with the axes per project, four files run at once with the override pinned to
  // one. Root config carries `rootKnobs`; the workspace's project carries `projectKnobs`.
  await writeFile(
    path.join(dir, "vitest.config.ts"),
    // **No `vitest/config` import.** `defineConfig` is an identity helper, and the fixture wrote a
    // BARE specifier into a config living in `os.tmpdir()` — where no ancestor has a `node_modules`
    // holding vitest, so nothing resolves it. Measured: `require.resolve("vitest/config")` from a
    // fresh temp dir is `MODULE_NOT_FOUND`. Two of round 20's reviewers reproduced the load failure
    // and this stage could not, which is the worst shape a test can have: its outcome depends on the
    // resolver's mood rather than on the subject. The sibling workspace file next to this one has
    // always exported a plain object, so the two now agree and neither imports anything but the knobs.
    [
      `import { rootKnobs } from "${knobs}";`,
      ``,
      `export default {`,
      `  test: { ...rootKnobs },`,
      `};`,
      ``,
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    path.join(dir, "vitest.workspace.ts"),
    [
      `import { projectKnobs } from "${knobs}";`,
      ``,
      `export default [`,
      `  {`,
      `    test: {`,
      `      ...projectKnobs,`,
      `      name: "slots",`,
      `      include: ["tests/**/*.test.ts"],`,
      `    },`,
      `  },`,
      `];`,
      ``,
    ].join("\n"),
    "utf8",
  );

  for (let n = 0; n < FIXTURE_FILES; n += 1) {
    await writeFile(
      path.join(dir, "tests", `slot${String(n)}.test.ts`),
      [
        `import { appendFileSync } from "node:fs";`,
        `import { it } from "vitest";`,
        ``,
        `it("holds a slot", () => {`,
        `  const start = Date.now();`,
        `  const until = start + ${String(HOLD_MS)};`,
        `  while (Date.now() < until) {`,
        `    // Busy, not idle: a sleeping fork proves nothing about how many the pool will run.`,
        `  }`,
        `  appendFileSync(`,
        `    ${JSON.stringify(log)},`,
        `    JSON.stringify({ file: "slot${String(n)}", start, end: Date.now() }) + "\\n",`,
        `  );`,
        `});`,
        ``,
      ].join("\n"),
      "utf8",
    );
  }
  return { dir, log };
}

async function runAt(workers: number): Promise<Interval[]> {
  const { dir, log } = await fixture();
  const result = spawnSync(
    process.execPath,
    [path.join(PACKAGE_ROOT, "node_modules", "vitest", "vitest.mjs"), "run", "--root", dir],
    {
      cwd: dir,
      encoding: "utf8",
      timeout: 180000,
      env: { ...process.env, [WORKERS_ENV]: String(workers), CI: "1" },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `the fixture suite did not pass at ${String(workers)} workers (status ${String(result.status)}): ` +
        `${result.stdout ?? ""}${result.stderr ?? ""}`.slice(0, 1200),
    );
  }
  const text = await readFile(log, "utf8");
  const intervals: Interval[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const parsed: unknown = JSON.parse(line);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "file" in parsed &&
      "start" in parsed &&
      "end" in parsed
    ) {
      intervals.push({
        file: String(parsed.file),
        start: Number(parsed.start),
        end: Number(parsed.end),
      });
    }
  }
  return intervals;
}

describe(
  "E2E: the declared worker axis is honoured by the runner, not merely declared (US-0017-0007)",
  { timeout: 400000 },
  () => {
    it("runs one file at a time at one worker and several at four", async () => {
      const serial = await runAt(1);
      expect(serial, "every fixture file must have recorded its interval").toHaveLength(
        FIXTURE_FILES,
      );
      // Guaranteed by the pool rather than by timing: with one worker there is never a second slot for a
      // second file to occupy, whatever the machine is doing.
      expect(
        peakConcurrency(serial),
        "at one worker the pool must never hold two files live at once",
      ).toBe(1);

      const parallel = await runAt(4);
      expect(parallel, "every fixture file must have recorded its interval").toHaveLength(
        FIXTURE_FILES,
      );
      // The direction that would have caught the inert declaration the knobs file documents: raising the
      // axis has to change what the runner does. No threshold and no ratio — just "more than one at
      // once", which fails only on a single-core machine.
      expect(
        peakConcurrency(parallel),
        "at four workers the pool must hold more than one file live at once; if this is 1 the axis is " +
          "declared and inert, which is the state `vitest.knobs.ts` records for a project-level " +
          "worker declaration",
      ).toBeGreaterThan(1);
    });

    it("reads the axis from the override the knob module names, and defaults to the declared value", () => {
      // The contract the test above depends on: the override NAME is part of it, so a rename that left
      // the measurement above passing by accident would fail here. `DECLARED_START` is read rather than
      // restated, because a literal here would be a second place to maintain the user's chosen value.
      // The NAME as a literal, which is the one thing this file must not read from the module it tests.
      // Falsification found the hole: renaming `WORKERS_ENV` left every assertion here green, because
      // the fixture and the test both followed the rename. The name is a contract with the CALLER — a
      // CI workflow, a developer's shell — so a silent rename is a broken contract that no
      // self-referential check can see.
      expect(WORKERS_ENV, "the worker override's name is a contract with the caller").toBe(
        "QFAI_TEST_MAX_WORKERS",
      );
      expect(CONCURRENCY_ENV, "and so is the concurrency override's").toBe(
        "QFAI_TEST_MAX_CONCURRENCY",
      );

      const previous = process.env[WORKERS_ENV];
      try {
        // `Reflect.deleteProperty`, not an assignment. `process.env[x] = undefined` stores the STRING
        // "undefined", so the previous version never reached the absent branch — it tested the
        // not-a-number branch twice — and its `finally` restored the string rather than the absence.
        // The lint rule bars a dynamic `delete`; `Reflect.deleteProperty` is the same operation and is
        // what `buildCommand.test.ts` already uses for a computed key.
        Reflect.deleteProperty(process.env, WORKERS_ENV);
        expect(tunable(WORKERS_ENV), "an absent override falls back to the declared value").toBe(
          DECLARED_START,
        );
        process.env[WORKERS_ENV] = "4";
        expect(tunable(WORKERS_ENV), "a valid override is honoured").toBe(4);
        for (const bad of ["", " ", "0", "-1", "2.5", "1e3", "ten"]) {
          process.env[WORKERS_ENV] = bad;
          expect(
            tunable(WORKERS_ENV),
            `${JSON.stringify(bad)} must not be able to reconfigure the suite`,
          ).toBe(DECLARED_START);
        }
      } finally {
        if (previous === undefined) Reflect.deleteProperty(process.env, WORKERS_ENV);
        else process.env[WORKERS_ENV] = previous;
      }
    });
  },
);
