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
 * `TC-0017-0060`'s wording used to ask that every project declare all six. It cannot; two
 * of the six are not project-scoped in this runner, so the two declarations would have
 * type-checked and configured nothing. `CR-20260820-0003` carried that divergence for
 * three days and was decided 2026-08-23, **option A**: the rule and the case now say what
 * this test has always asserted — each knob at the scope that reads it, and none at a
 * scope that does not. The spec moved to the implementation because the implementation
 * was right; the row was never reset.
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

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");

/**
 * The runner's CONFIGURATION files — three, since the knob set is split: the workspace, the
 * root config that carries the root-only axes, and the shared module both import.
 *
 * The command-line sites are deliberately NOT in this list. A manifest's `scripts` and a
 * workflow's `run:` values are where `--retry 2` would actually be added, and they are
 * gathered structurally in `TC-0017-0068` CLAIM 2 rather than scanned as whole files —
 * because the CLI-flag pattern would otherwise match the very comment that explains it.
 * `package.json` briefly appeared here as a fourth entry (implementation-review finding
 * L10) and that was the wrong shape: whole-file scanning is what made the claim vacuous.
 */
const CONFIG_FILES = ["vitest.workspace.ts", "vitest.config.ts", "vitest.knobs.ts"] as const;

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

describe("the knob set stays portable, because a fixture spreads it into a foreign root", () => {
  it("holds no root-relative path", async () => {
    // `spec0017RunnerParallelismE2E` writes a fixture project into a `mkdtemp` root and spreads
    // `projectKnobs` into its config VERBATIM — that is what the suite is for, since it exists to
    // reproduce the declared knobs and measure what the runner does with them.
    //
    // So every value here has to mean the same thing in a root that is not this one. A
    // `setupFiles: ["./tests/setup/…"]` resolves against the FIXTURE root, where the file does not
    // exist, and all four slot files failed to collect — the measurement never ran, and the
    // failure named the fixture rather than the knob that broke it. That is the shape this row
    // catches: not "setupFiles is absent" but "nothing here is root-relative".
    //
    // Where a path-valued option belongs is beside the projects, in `vitest.workspace.ts`, which
    // no fixture copies. `SETUP_FILES` is exported for that and the row below checks it arrives.
    const knobs: unknown = await import("../../vitest.knobs");
    const projectKnobs = isRecord(knobs) ? knobs["projectKnobs"] : undefined;
    expect(isRecord(projectKnobs), "vitest.knobs must export projectKnobs").toBe(true);

    const relative: string[] = [];
    const walk = (value: unknown, at: string): void => {
      if (typeof value === "string") {
        if (/^\.{1,2}\//.test(value)) relative.push(`${at}: ${value}`);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          walk(item, `${at}[${String(index)}]`);
        });
        return;
      }
      if (isRecord(value)) {
        for (const [key, item] of Object.entries(value)) walk(item, `${at}.${key}`);
      }
    };
    walk(projectKnobs, "projectKnobs");

    expect(
      relative,
      "a relative path in the shared knob set resolves against whichever root spreads it, and one " +
        "of those roots is a temp directory holding none of this repository's files",
    ).toEqual([]);

    // Non-vacuity: the walk must have seen the knobs, or an empty result means nothing.
    expect(
      Object.keys(isRecord(projectKnobs) ? projectKnobs : {}).length,
      "the knob set must be non-empty for this to be about",
    ).toBeGreaterThan(0);
  });

  it("gives every project the per-file setup, at the site the fixture does not copy", async () => {
    const { projects } = await load();
    expect(projects.length, "the workspace must declare projects").toBeGreaterThan(0);

    const missing = projects
      .filter((project) => {
        const declared = project["setupFiles"];
        return !Array.isArray(declared) || declared.length === 0;
      })
      .map(nameOf);
    expect(
      missing,
      "the annotation suppressor patches `process.stdout` per FILE, and `pool: forks` with " +
        "`isolate: true` gives every file its own process — a project without it leaks real " +
        "GitHub annotations from whatever fixture it validates (#1160)",
    ).toEqual([]);
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
    // have been backwards.
    //
    // TWO shapes, and the second was missing. `retry:` / `retries =` is what a setting looks
    // like in a config file. `--retry 2` is what it looks like on a COMMAND LINE, and the
    // space-separated form is the documented CLI spelling — the pattern demanded `:` or `=`
    // immediately after the word, so it caught `--retry=2` and missed `--retry 2`. Measured
    // against the literals rather than reasoned about:
    //
    //   MISSED   "test:core": "vitest run --project core --retry 2"
    //   CAUGHT   "test:core": "vitest run --project core --retry=2"
    //
    // Implementation-review finding F1, which is the second vacuous claim this rework shipped.
    const SETTING = /\bretr(?:y|ies)\s*[:=]/i;
    const CLI_FLAG = /--retr(?:y|ies)\b/i;

    // Command text is gathered STRUCTURALLY, not by scanning whole files, because the
    // CLI-flag pattern would otherwise match this file's own docblock explaining it — the
    // exact trap the first draft fell into one level down. A manifest contributes its script
    // VALUES; a workflow contributes its `run:` values. Prose cannot reach either.
    const manifestScripts = (
      rel: string,
      root: string,
      label: string,
    ): { line: string; at: string }[] => {
      const parsed: unknown = JSON.parse(readFileSync(path.join(root, rel), "utf-8"));
      const scripts =
        isRecord(parsed) && isRecord(parsed["scripts"]) ? parsed["scripts"] : undefined;
      if (scripts === undefined) return [];
      return Object.entries(scripts)
        .filter(([, value]) => typeof value === "string")
        .map(([name, value]) => ({ line: String(value), at: `${label} scripts.${name}` }));
    };

    // Workflow commands come from the PARSED document, not from an indentation guess.
    //
    // The first version filtered lines by `/^\s*(?:-\s*)?run:/` or `/^\s{8,}\S/`. Measured over
    // the real `ci.yml`: 325 lines selected, zero run-block lines missed — but 69 of them were
    // `with:` / `env:` entries and COMMENTS, so a comment documenting the prohibition reddened
    // the lane, and a `with: { retries: 3 }` input did too. `ci.yml` is the likeliest place to
    // document the rule, and turning that red points the reader at deleting the documentation —
    // the backwards incentive this claim was rewritten to remove. Round 6 finding F-5.
    //
    // Comment lines are stripped inside each `run:` body for the same reason the `--no-renames`
    // claim strips them: a body explaining why no retry belongs there must not be a retry.
    const workflowRuns = (rel: string): { line: string; at: string }[] => {
      const doc: unknown = parseYaml(readFileSync(path.join(REPO_ROOT, rel), "utf-8"));
      const jobs = isRecord(doc) && isRecord(doc["jobs"]) ? doc["jobs"] : {};
      const out: { line: string; at: string }[] = [];
      for (const [jobId, job] of Object.entries(jobs)) {
        const steps = isRecord(job) && Array.isArray(job["steps"]) ? job["steps"] : [];
        steps.forEach((step, index) => {
          const run = isRecord(step) ? step["run"] : undefined;
          if (typeof run !== "string") return;
          run
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith("#"))
            .forEach((line) => out.push({ line, at: `${rel} ${jobId}.steps[${index}].run` }));
        });
      }
      return out;
    };

    // EVERY workflow, globbed rather than listed. `release.yml` runs `pnpm ci:gate`, and `ci:gate`
    // contains `pnpm -C packages/qfai test` — so it invokes the runner and a `--retry` added there
    // was unseen by a one-file list. Round 6 finding F-6; a glob also cannot go stale.
    const workflowDir = path.join(REPO_ROOT, ".github", "workflows");
    const workflowFiles = readdirSync(workflowDir)
      .filter((name) => /\.ya?ml$/.test(name))
      .map((name) => path.join(".github", "workflows", name));
    expect
      .soft(workflowFiles.length, "there must be workflows to scan for this claim to mean anything")
      .toBeGreaterThan(0);

    const commandSites = [
      ...manifestScripts("package.json", PACKAGE_ROOT, "packages/qfai/package.json"),
      ...manifestScripts("package.json", REPO_ROOT, "package.json"),
      ...workflowFiles.flatMap(workflowRuns),
    ];
    const configSites = CONFIG_FILES.flatMap((file) =>
      readFileSync(path.join(PACKAGE_ROOT, file), "utf-8")
        .split(/\r?\n/)
        .map((line, index) => ({ line, at: `${file}:${index + 1}` })),
    );

    const hits = [
      ...configSites.filter(({ line }) => SETTING.test(line)),
      ...commandSites.filter(({ line }) => SETTING.test(line) || CLI_FLAG.test(line)),
    ].map(({ line, at }) => `${at}: ${line.trim()}`);
    expect
      .soft(hits, "a search of the runner configuration for a retry must return zero results")
      .toEqual([]);
  });
});
