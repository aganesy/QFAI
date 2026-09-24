/**
 * The surfaces that name this package's test slices, and the obligation that
 * they name the SAME set — plus the obligation that no named slice can match
 * zero test files.
 *
 * There are four, and nothing kept them in step:
 *
 *   1. the runner workspace — `packages/qfai/vitest.workspace.ts` `name:` values
 *   2. the `test` job's matrix — `.github/workflows/ci.yml` `strategy.matrix.slice`
 *   3. the per-slice scripts — `packages/qfai/package.json`'s `test:<slice>` keys
 *   4. the `node-floor` job's matrix, in the same workflow
 *
 * At the revision this file was written they held three different sets: eight
 * projects (one of them matching zero files), seven matrix entries, and five
 * scripts. Every one of those divergences is silent. A project matching zero
 * files reports nothing; a matrix entry with no script still ran, because the
 * matrix handed the project name to a generic script; a missing script is only
 * noticed by whoever tries to run it.
 *
 * ## Why the second sliced job is its own surface
 *
 * `node-floor` runs the same suite on the floor `engines.node` promises, and it
 * is sliced for the reason the `test` job is: one pool over the whole suite is
 * the longest job in the run and sets the wall clock for every other lane. Its
 * claim is about the WHOLE suite, and the slicing keeps that claim only while its
 * legs partition the suite — which is the very property claims 1 to 3 establish
 * for the other list.
 *
 * Reading surface 2 alone does not reach it. A slice dropped from the floor
 * matrix leaves all three original surfaces in perfect agreement: the project
 * exists, the script exists, the `test` job runs it. Nothing is unreachable from
 * CI and nothing advertises coverage that cannot exist. What stops is that slice
 * being exercised on the floor at all — the eight remaining legs go green, the
 * lane rolls up green, and an API absent in the floor release breaks exactly the
 * supported users the lane was added for. That is the same class of silent
 * divergence as the three above, arriving through a job this file did not read.
 *
 * ## Exit status does not distinguish an absent slice from an empty one
 *
 * The first draft of `TC-0017-0063` asserted that selecting the deleted project
 * "must not exit 0", on the assumption that a zero-file project resolves and
 * exits 0. That assumption is false, and the mutation oracle caught it: restoring
 * the project reddened the declaration claim and left the spawn claim green.
 *
 * Measured on the runner this package pins, both states exit 1 with the same
 * message:
 *
 *   - project absent — `projects: compatibility`, then
 *     `No test files found, exiting with code 1`
 *   - project present, its directory missing — the same, plus a
 *     `[compatibility] Config` echo
 *
 * `--project <name>` does not reject an unknown name; it filters to nothing. So
 * the spawn was a slow assertion that passed in both the fixed and the broken
 * state. It is gone, and this row asserts what actually differs: what the
 * workspace DECLARES, and whether each declaration has files behind it.
 *
 * ## Why the general invariant, and not just the one deleted name
 *
 * Pinning the deleted name alone would have been vacuous the moment it was
 * deleted. The defect class is "a declaration that advertises coverage which
 * cannot exist", and the tree held a SECOND instance of it: `integration`
 * declared a glob under `tests/review`, whose directory has not existed since
 * `017fe9fd` removed the last file under it. The glob was correct when `48f4f3a6`
 * wrote it; the directory outlived it by a month and nothing noticed. Because
 * `integration` has other globs with files behind them, a per-PROJECT check would
 * have passed over it — so the invariant is per-GLOB.
 */
// QFAI:EX-0002-0019-11
// QFAI:EX-0002-0019-09
// QFAI:EX-0002-0019-10

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { GLOB_SHAPE, declaredIncludeGlobs, testFileCount } from "../helpers/runnerProjects.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");
const WORKSPACE = path.join(PACKAGE_ROOT, "vitest.workspace.ts");
const PACKAGE_JSON = path.join(PACKAGE_ROOT, "package.json");
const CI_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "ci.yml");

/**
 * The project name that stopped being declared, kept as a literal.
 *
 * A literal and not a derivation: the whole point of `TC-0017-0063` is that this
 * particular name stopped being declared, and a name read out of the file it was
 * removed from would make the assertion vacuous.
 */
const DELETED_PROJECT = "compatibility";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A capture group the pattern guarantees, narrowed.
 *
 * Under `noUncheckedIndexedAccess` every `match[1]` is `string | undefined`, and the project
 * rules forbid the assertion that would silence it. A pattern that matched but produced no
 * group means the pattern changed under the reader — a broken helper rather than a failing
 * claim — so it throws instead of handing the caller a value to compare.
 */
function group(match: RegExpMatchArray | RegExpExecArray, index: number): string {
  const value = match[index];
  if (value === undefined) {
    throw new Error(`the pattern matched without capture group ${index}`);
  }
  return value;
}

/**
 * Surface 1 — the runner project names.
 *
 * Read with a regex rather than by importing the workspace module. Importing it
 * would execute `defineWorkspace`, which pulls in vitest's config machinery from
 * inside a vitest run; the names are string literals in a hand-edited file, so a
 * text read is both sufficient and free of that reentrancy.
 */
function runnerProjects(): string[] {
  const source = readFileSync(WORKSPACE, "utf-8");
  const names = [...source.matchAll(/name:\s*"([^"]+)"/g)].map((m) => group(m, 1));
  if (names.length === 0) {
    throw new Error("vitest.workspace.ts declares no project names");
  }
  return names;
}

/**
 * Surfaces 2 and 4 — the slice list a named CI job expands over.
 *
 * Parameterised by job rather than duplicated, so a second sliced lane costs a
 * call site instead of a second reader that can be updated out of step with the
 * first. A job with no matrix throws: this helper is only asked about jobs that
 * are supposed to have one, and returning an empty list there would report as a
 * set mismatch rather than as the missing matrix it is.
 */
function matrixSlices(job: string): string[] {
  const doc: unknown = parseYaml(readFileSync(CI_WORKFLOW, "utf-8"));
  if (!isRecord(doc) || !isRecord(doc["jobs"]) || !isRecord(doc["jobs"][job])) {
    throw new Error(`ci.yml declares no \`${job}\` job`);
  }
  const strategy = doc["jobs"][job]["strategy"];
  const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
  const slices = isRecord(matrix) ? matrix["slice"] : undefined;
  if (!Array.isArray(slices) || !slices.every((s) => typeof s === "string")) {
    throw new Error(`ci.yml's ${job} job declares no string matrix.slice list`);
  }
  return slices;
}

/**
 * The jobs that expand over the slice set, by key.
 *
 * Literals, and deliberately so. Discovering sliced jobs by scanning for a
 * `matrix.slice` would make the claim vacuous in the direction that matters: a
 * lane that stopped declaring one would stop being checked instead of failing.
 */
const SLICED_JOBS = ["test", "node-floor"] as const;

/**
 * Surface 3 — the per-slice scripts, identified by what they DO rather than by
 * what they are called.
 *
 * A per-slice script is one whose command selects a project. Defining it that
 * way rather than by a `test:` key prefix is the difference between a definition
 * and a list: `test:coverage` and `test:assets` both carry the prefix and neither
 * names a slice — they select directories. A prefix filter needed a hand-kept
 * exclusion for each of them, and would have needed a third the next time someone
 * added a `test:something` that selects files.
 *
 * The first draft of this row did use the prefix, and the RED caught it by
 * demanding that `test:assets` select an `assets` project that does not exist.
 */
// `[a-z0-9-]+` and not `[a-z]+`: one project is named `e2e`, and `pr-fix` and
// `pr-merge` carry a hyphen. The first draft used the letters-only class, so surface 3
// silently lost `test:e2e` and the equality claim would have failed for a reason that
// had nothing to do with alignment. A count check in the implementation script caught
// it; the character class is recorded here because every project whose name reaches
// outside the letters hits it the same way, and the miss is silent in the direction
// that matters — the slice drops out of surface 3, so the count claim passes while the
// equality claim fails. The digit was the first such character and the hyphen the
// second. A name using a third needs this class widened before its slice is read here
// at all.
const PROJECT_SELECTOR = /^vitest run --project ([a-z0-9-]+)$/;

function perSliceScriptEntries(): { key: string; slice: string }[] {
  const pkg: unknown = JSON.parse(readFileSync(PACKAGE_JSON, "utf-8"));
  if (!isRecord(pkg) || !isRecord(pkg["scripts"])) {
    throw new Error("packages/qfai/package.json declares no scripts");
  }
  const out: { key: string; slice: string }[] = [];
  for (const [key, body] of Object.entries(pkg["scripts"])) {
    if (typeof body !== "string") continue;
    const m = PROJECT_SELECTOR.exec(body.trim());
    if (m !== null) out.push({ key, slice: group(m, 1) });
  }
  return out;
}

function perSliceScripts(): string[] {
  return perSliceScriptEntries().map((e) => e.slice);
}

/** A named job's steps, narrowed. Used by `TC-0017-0064` to read what each matrix runs. */
function jobSteps(job: string): Record<string, unknown>[] {
  const doc: unknown = parseYaml(readFileSync(CI_WORKFLOW, "utf-8"));
  if (!isRecord(doc) || !isRecord(doc["jobs"]) || !isRecord(doc["jobs"][job])) {
    throw new Error(`ci.yml declares no \`${job}\` job`);
  }
  const steps = doc["jobs"][job]["steps"];
  if (!Array.isArray(steps)) {
    throw new Error(`ci.yml's ${job} job declares no steps`);
  }
  return steps.filter(isRecord);
}

const sorted = (xs: readonly string[]): string[] => [...xs].sort();

describe("TC-0017-0062 (TDD-0062): the slice surfaces hold one set of nine names", () => {
  it("agrees across the runner workspace, both CI matrices and the per-slice scripts", () => {
    const projects = sorted(runnerProjects());
    const scripts = sorted(perSliceScripts());

    // CLAIM 1 — the sets are equal. Asserted pairwise against the RUNNER as the
    // reference, because it is the surface the others describe: a matrix entry
    // or a script naming a project that does not exist is meaningless, while a
    // project with neither is merely unreachable from CI.
    //
    // Every sliced job, not just the first. The two lists are identical today and
    // are still two declarations in the workflow, so one of them can be edited
    // alone — and a slice missing from `node-floor` leaves the runner, the scripts
    // and the `test` job in agreement while that slice stops running on the floor.
    for (const job of SLICED_JOBS) {
      expect
        .soft(sorted(matrixSlices(job)), `the ${job} matrix names exactly the runner's projects`)
        .toEqual(projects);
    }
    expect
      .soft(scripts, "the per-slice scripts name exactly the runner's projects")
      .toEqual(projects);

    // CLAIM 2 — and there are nine. The count is asserted because the spec states
    // it, and it is asserted LAST: if the sets disagree, the count is not the
    // useful thing to be told.
    //
    // A number rather than a phrase, because this is the only claim that catches a
    // shrink every surface agreed to: drop a slice from all three and CLAIM 1 still
    // holds.
    expect.soft(projects.length, "the aligned set has nine members").toBe(9);
  });
});

describe("TC-0017-0063 (TDD-0063): no declared slice can match zero test files", () => {
  it("has dropped the zero-file project and leaves no include glob without files", () => {
    // CLAIM 1 — the deleted name is gone from the declaration. This, and not the
    // runner's exit status, is what the deletion actually changed.
    expect
      .soft(runnerProjects(), `${DELETED_PROJECT} must not be declared in the runner workspace`)
      .not.toContain(DELETED_PROJECT);

    // CLAIM 2 — and the directory it included is gone too.
    //
    // The history, because a wrong version of this comment stood here first: that
    // directory DID exist and held four tests. `c47d3db5` removed all four when the
    // canonical contracts replaced the compatibility surfaces. The tests were not
    // lost by accident and should not be restored — the defect is that the project
    // DECLARATION outlived them by months, advertising a slice that could not fail.
    expect
      .soft(
        existsSync(path.join(PACKAGE_ROOT, "tests", DELETED_PROJECT)),
        `tests/${DELETED_PROJECT}/ was emptied deliberately — the declaration is what outlived it`,
      )
      .toBe(false);

    const declared = declaredIncludeGlobs();
    expect(declared.length, "the workspace must declare include globs").toBeGreaterThan(0);

    // CLAIM 3 — every glob has the shape CLAIM 4's counting method assumes.
    // Asserted before CLAIM 4 uses it, so a glob that cannot be counted is
    // reported as an unsupported shape rather than as an empty directory.
    const misshapen = declared.filter((d) => !GLOB_SHAPE.test(d.glob));
    expect
      .soft(
        misshapen.map((d) => `${d.project}: ${d.glob}`),
        "every include glob must be countable by walking its literal directory prefix",
      )
      .toEqual([]);

    // CLAIM 4 — and every glob has at least one test file behind it. Per glob and
    // not per project: `integration` declares five, and four populated globs would
    // have hidden the fifth.
    const empty = declared
      .filter((d) => GLOB_SHAPE.test(d.glob))
      .filter((d) => testFileCount(d.glob) === 0)
      .map((d) => `${d.project}: ${d.glob}`);
    expect
      .soft(empty, "an include glob with no test files advertises coverage that cannot exist")
      .toEqual([]);
  });
});

describe("TC-0017-0064 (TDD-0064): the two missing per-slice scripts exist and are used", () => {
  it("gives every slice its own script and stops the matrix passing a project name to a generic one", () => {
    const scripts = perSliceScripts();

    // CLAIM 1 — the two that were missing. Named as literals, because "two
    // missing" is only checkable against which two.
    for (const slice of ["unit", "scripts"]) {
      expect
        .soft(scripts, `slice \`${slice}\` had no per-slice script and must now have one`)
        .toContain(slice);
    }

    // CLAIM 2 — each per-slice script is NAMED after the project it selects.
    // Selecting a project is already how surface 3 is derived, so the open
    // question is whether the key agrees with the selection: a `test:foo` that
    // ran `--project bar` would satisfy CLAIM 1 and mislead every reader of the
    // matrix.
    for (const { key, slice } of perSliceScriptEntries()) {
      expect
        .soft(key, `a per-slice script selecting ${slice} must be named test:${slice}`)
        .toBe(`test:${slice}`);
    }

    // CLAIM 3 — and the matrix calls those scripts rather than handing a project
    // name to the generic runner. This is the half that makes surface 3
    // load-bearing: while the matrix passed a project name to the generic script,
    // a slice with no script of its own still ran, so nothing ever demanded the
    // script exist.
    //
    // Asserted over the PARSED `run:` values rather than the raw file text. A text
    // assertion trips on prose — the first draft reddened on the very comment that
    // explains why the old form was abandoned, because the comment quotes it. The
    // obligation is about what the matrix RUNS.
    //
    // For every sliced job. The generic-runner form lets a matrix entry with no
    // script of its own still run, and either sliced lane can reintroduce it on its
    // own — at which point surface 3 stops being load-bearing for that lane and the
    // alignment claim above describes nothing.
    for (const job of SLICED_JOBS) {
      const runValues = jobSteps(job)
        .map((step) => step["run"])
        .filter((run): run is string => typeof run === "string");
      expect(runValues.length, `the ${job} job must declare run steps`).toBeGreaterThan(0);

      const genericWithProject = runValues.filter((run) => /\btest\b[^\n]*--project/.test(run));
      expect
        .soft(
          genericWithProject,
          `no ${job} step may pass a project name to the generic test script`,
        )
        .toEqual([]);

      expect
        .soft(
          runValues.filter((run) => run.includes("test:${{ matrix.slice }}")),
          `the ${job} matrix must invoke the per-slice script for its slice`,
        )
        .not.toEqual([]);
    }
  });
});
