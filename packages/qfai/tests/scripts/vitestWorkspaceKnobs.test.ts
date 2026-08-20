/**
 * The parallelism knob set, the starting value on the two tunable axes, and the retry
 * setting that must not exist anywhere in the runner configuration.
 *
 * ## Why the knobs are asserted at all
 *
 * The baseline is a workspace where each project declares a name, an include pattern and
 * a shared timeout — nothing about how it runs. Everything else came from the runner's
 * defaults, which means this suite's concurrency was whatever the installed version
 * happened to default to, and an upgrade could change it with no diff in this repository.
 * `BR-0017-0047` closes that by requiring the knobs to be **declared**.
 *
 * Declaring a value that equals today's default is not a no-op. It moves the value from
 * the runner's release notes into this repository's diff.
 *
 * ## Why the set is asserted at TWO sites
 *
 * The first draft of this row asserted all six knobs on every project, and the
 * implementation that satisfied it was inert. The runner scopes three of these options to
 * the root: `ProjectConfig` is `Omit<UserConfig, NonProjectOptions | …>` and
 * `NonProjectOptions` names `maxWorkers`, `minWorkers` and `fileParallelism`. Its
 * `poolOptions.forks` is narrowed to `singleFork | isolate`, so `maxForks` is not a
 * project-level escape hatch either.
 *
 * That draft passed every gate, and nothing warned. No compiler was going to catch it:
 * `tsc`'s include is `src/**`, so none of the three runner config files is compiled —
 * `eslint.config.js:51` names that arrangement outright. And the runner drops unknown
 * project options silently. Measured on the `validators` project, constraining the worker
 * override to one against the declared default gave a wall-clock ratio of **0.93**, which
 * is noise. The runner's own type and the stopwatch agree.
 *
 * A test is therefore the only mechanism that can catch this class, which is what the
 * root-only guard below is for.
 *
 * So this row asserts each knob at the site the runner reads it, and adds a claim the
 * first draft could not have: no project may declare a root-only option. A declaration
 * nothing reads is the same defect class as a test project matching zero files, and this
 * row nearly shipped one.
 *
 * `TC-0017-0060`'s wording asks that every project declare all six. It cannot; two of the
 * six are not project-scoped in this runner. `CR-20260820-0003` carries the divergence.
 *
 * ## The starting value is a hypothesis, and it is the user's
 *
 * `BR-0017-0048` fixes ten on the worker axis and ten on the within-file concurrency axis
 * and requires each to stay **overridable**. `BR-0017-0051` is the other half: no agent
 * may substitute a different starting value on the strength of its own measurement. So
 * this row asserts ten, and asserts that ten is a default rather than a literal — the
 * measurement-gated adoption of a FINAL value is `TC-0017-0065`, a later change with a
 * timing artifact behind it.
 *
 * The override is what lets those two rules coexist. A measurement can be taken at any
 * value without editing a declaration, so taking one never looks like adopting one.
 *
 * ## Retries are forbidden, and this is the row that says so
 *
 * `BR-0017-0052`: a search of the runner workspace for a retry setting must return zero
 * results, "even to stabilize a tuning change". Asserted structurally over the resolved
 * configuration and textually over every file that configures the runner — the rule is
 * phrased as a search, and a commented-out retry is still a retry someone will uncomment.
 */
// QFAI:SPEC-0017:TC-0017-0060
// QFAI:SPEC-0017:TC-0017-0061
// QFAI:SPEC-0017:TC-0017-0068

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Every file that configures the runner.
 *
 * Four, since the knob set is split: the workspace, the root config that carries the
 * root-only axes, the shared module both import, and the MANIFEST.
 *
 * `package.json` was missing and it is the likeliest site of all: `vitest run --retry 2`
 * added to a `test:*` script appears in no configuration file, so the scan returned zero
 * results while the runner retried on every invocation of that slice. `BR-0017-0052`'s
 * search is over the runner configuration, and the command line IS part of it —
 * implementation-review finding L10.
 */
const RUNNER_FILES = [
  "vitest.workspace.ts",
  "vitest.config.ts",
  "vitest.knobs.ts",
  "package.json",
] as const;

/** The override variable names. Literals, because the names are the contract. */
const WORKERS_ENV = "QFAI_TEST_MAX_WORKERS";
const CONCURRENCY_ENV = "QFAI_TEST_MAX_CONCURRENCY";

/** The user's declared starting value on both tunable axes. */
const DECLARED_START = 10;

/**
 * The options this runner refuses to scope to a project.
 *
 * Literals rather than a read of the runner's type, which is not available at runtime.
 * Kept to the three that bear on parallelism; the full `NonProjectOptions` list is longer
 * and most of it has nothing to do with this row.
 */
const ROOT_ONLY = ["maxWorkers", "minWorkers", "fileParallelism"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolved configuration, loaded by IMPORTING rather than by reading text.
 *
 * The knob values are computed, and an override path is exactly what a regex cannot see
 * through. `vi.resetModules()` before each import is what makes the override claim
 * possible at all: the modules read their environment once, at evaluation.
 */
async function load(
  env: Readonly<Record<string, string>> = {},
): Promise<{ projects: Record<string, unknown>[]; root: Record<string, unknown> }> {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }

  const workspace: unknown = await import("../../vitest.workspace");
  const entries = isRecord(workspace) ? workspace["default"] : undefined;
  if (!Array.isArray(entries)) {
    throw new Error("vitest.workspace.ts does not default-export an array of project entries");
  }
  const projects = entries
    .filter(isRecord)
    .map((entry) => entry["test"])
    .filter(isRecord);
  if (projects.length === 0) {
    throw new Error("vitest.workspace.ts declares no project test blocks");
  }

  const rootModule: unknown = await import("../../vitest.config");
  const rootDefault = isRecord(rootModule) ? rootModule["default"] : undefined;
  const root = isRecord(rootDefault) ? rootDefault["test"] : undefined;
  if (!isRecord(root)) {
    throw new Error("vitest.config.ts does not export a test configuration block");
  }

  return { projects, root };
}

const nameOf = (project: Record<string, unknown>): string =>
  typeof project["name"] === "string" ? project["name"] : "(unnamed)";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("TC-0017-0060 (TDD-0060): every runner project declares the full knob set", () => {
  it("declares each knob at the site the runner reads it", async () => {
    const { projects, root } = await load();

    // Presence alone is not enough: `fileParallelism: undefined` is present and means
    // nothing, and a pool with no options is the baseline this row exists to replace.
    const shaped = (v: unknown, kind: "name" | "block" | "count" | "flag"): boolean => {
      if (kind === "name") return typeof v === "string" && v.length > 0;
      if (kind === "block") return isRecord(v) && Object.keys(v).length > 0;
      if (kind === "count") return typeof v === "number" && v > 0;
      return typeof v === "boolean";
    };

    const PROJECT_KNOBS = [
      { key: "pool", kind: "name", want: "a pool name" },
      { key: "poolOptions", kind: "block", want: "a non-empty pool options block" },
      { key: "maxConcurrency", kind: "count", want: "a positive within-file concurrency" },
      { key: "hookTimeout", kind: "count", want: "a positive hook timeout" },
      { key: "testTimeout", kind: "count", want: "a positive test timeout" },
    ] as const;

    const ROOT_KNOBS = [
      { key: "maxWorkers", kind: "count", want: "a positive worker ceiling" },
      { key: "minWorkers", kind: "count", want: "a positive worker floor" },
      { key: "fileParallelism", kind: "flag", want: "an explicit file-parallelism boolean" },
    ] as const;

    const missing: string[] = [];
    for (const project of projects) {
      for (const knob of PROJECT_KNOBS) {
        if (!shaped(project[knob.key], knob.kind)) {
          missing.push(`${nameOf(project)}: ${knob.key} must be ${knob.want}`);
        }
      }
    }
    for (const knob of ROOT_KNOBS) {
      if (!shaped(root[knob.key], knob.kind)) {
        missing.push(`root: ${knob.key} must be ${knob.want}`);
      }
    }
    expect
      .soft(missing, "every knob must be declared, not inherited from the runner's defaults")
      .toEqual([]);

    // The pool options must name the pool they configure, otherwise the block is
    // decoration: the runner reads `poolOptions.<pool>` and ignores the rest.
    const orphaned = projects
      .filter((project) => {
        const pool = project["pool"];
        const options = project["poolOptions"];
        return typeof pool === "string" && isRecord(options) && !(pool in options);
      })
      .map(
        (project) => `${nameOf(project)}: poolOptions has no \`${String(project["pool"])}\` key`,
      );
    expect
      .soft(orphaned, "pool options that do not name the declared pool are read by nothing")
      .toEqual([]);

    // The claim the first draft could not make. A root-only option declared on a project
    // is silently ignored, so it reads as configuration and behaves as a comment. This
    // row shipped that defect once; the guard is what stops it recurring.
    const inert = projects.flatMap((project) =>
      ROOT_ONLY.filter((key) => project[key] !== undefined).map(
        (key) => `${nameOf(project)}: ${key} is root-only and is ignored here`,
      ),
    );
    expect
      .soft(inert, "a root-only option declared on a project is a declaration nothing reads")
      .toEqual([]);
  });
});

describe("TC-0017-0061 (TDD-0061): the declared starting value is ten on both axes", () => {
  it("defaults both tunable axes to ten", async () => {
    const { projects, root } = await load();

    const offAxis: string[] = [];
    if (root["maxWorkers"] !== DECLARED_START) {
      offAxis.push(`root: maxWorkers is ${String(root["maxWorkers"])}`);
    }
    for (const project of projects) {
      if (project["maxConcurrency"] !== DECLARED_START) {
        offAxis.push(`${nameOf(project)}: maxConcurrency is ${String(project["maxConcurrency"])}`);
      }
    }
    expect
      .soft(offAxis, `both tunable axes start at ${DECLARED_START} — the user's declared value`)
      .toEqual([]);
  });

  it("resolves each axis through its own override rather than a fixed literal", async () => {
    // The boundary. A fixed literal satisfies the value claim above and fails here, which
    // is the difference between "ten" and "ten by default". Distinct values per axis, so a
    // single shared knob driving both would also fail.
    const { projects, root } = await load({ [WORKERS_ENV]: "3", [CONCURRENCY_ENV]: "7" });

    const notOverridden: string[] = [];
    if (root["maxWorkers"] !== 3) {
      notOverridden.push(`root: ${WORKERS_ENV}=3 gave ${String(root["maxWorkers"])}`);
    }
    for (const project of projects) {
      if (project["maxConcurrency"] !== 7) {
        notOverridden.push(
          `${nameOf(project)}: ${CONCURRENCY_ENV}=7 gave ${String(project["maxConcurrency"])}`,
        );
      }
    }
    expect
      .soft(notOverridden, "each axis must resolve through its own override, not a fixed literal")
      .toEqual([]);
  });

  it("falls back to ten when an override is absent, empty or not a positive integer", async () => {
    // A tuning aid must not be able to reconfigure the suite by accident. `Number("")` and
    // `Number(" ")` are both 0 — the shape a shell produces from an unset variable — so a
    // lenient parse would run the suite at zero workers.
    for (const bad of ["", "   ", "0", "-4", "2.5", "ten", "1e2"]) {
      const { projects, root } = await load({ [WORKERS_ENV]: bad, [CONCURRENCY_ENV]: bad });
      const wrong: string[] = [];
      if (root["maxWorkers"] !== DECLARED_START) {
        wrong.push(`root: ${JSON.stringify(bad)} gave ${String(root["maxWorkers"])}`);
      }
      for (const project of projects) {
        if (project["maxConcurrency"] !== DECLARED_START) {
          wrong.push(
            `${nameOf(project)}: ${JSON.stringify(bad)} gave ${String(project["maxConcurrency"])}`,
          );
        }
      }
      expect
        .soft(wrong, `an override of ${JSON.stringify(bad)} must fall back to ${DECLARED_START}`)
        .toEqual([]);
    }
  });
});

describe("TC-0017-0068 (TDD-0068): the runner workspace carries zero retry settings", () => {
  it("declares no retry in the resolved configuration and holds no retry setting in any runner file", async () => {
    // CLAIM 1 — structural, over both halves of the split. `retry` is the runner's key;
    // a configuration carrying it would re-run a failing test, which `BR-0017-0052`
    // forbids outright.
    const { projects, root } = await load();
    const withRetry = [
      ...projects
        .filter((project) => project["retry"] !== undefined)
        .map((project) => `${nameOf(project)}: retry = ${String(project["retry"])}`),
      ...(root["retry"] === undefined ? [] : [`root: retry = ${String(root["retry"])}`]),
    ];
    expect
      .soft(withRetry, "a retry would mask the concurrent-writer races more workers surface")
      .toEqual([]);

    // CLAIM 2 — textual, because `BR-0017-0052` is phrased as a search returning zero
    // results. This catches what the structural claim cannot: a commented-out retry, one
    // behind a branch not taken, or one inside a pool options block. None of those appears
    // in the resolved configuration, and each is a retry the next person enables.
    //
    // A retry SETTING, not the word. The first draft matched the bare word and reddened on
    // the configuration's own comment saying no retry may be added — the very comment that
    // stops someone adding one, so weakening the documentation to satisfy the scan would
    // have been backwards. `retry` or `retries` immediately followed by an assignment is
    // what a setting looks like in every form these files can take, a commented-out one
    // included; prose about retries is not one.
    const hits = RUNNER_FILES.flatMap((file) =>
      readFileSync(path.join(PACKAGE_ROOT, file), "utf-8")
        .split(/\r?\n/)
        .map((line, index) => ({ line, at: index + 1 }))
        .filter(({ line }) => /\bretr(?:y|ies)\s*[:=]/i.test(line))
        .map(({ line, at }) => `${file}:${at}: ${line.trim()}`),
    );
    expect
      .soft(hits, "a search of the runner configuration for a retry must return zero results")
      .toEqual([]);
  });
});
