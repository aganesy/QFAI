/**
 * `BR-0017-0053`: one parallelism tuning change per pull request, largest project first, behind three
 * green runs of the lanes that tuning affects.
 *
 * ## Two rows, because the example carried two obligations
 *
 * `CR-20260820-0012` (approved 2026-08-23, options **5 then 1**) found `EX-0017-0053` stating one
 * satisfiable obligation and one that could not be satisfied at all, joined by an "and". One ledger row
 * carried both, and a row gets one exit — so the unsatisfiable half held the satisfiable one hostage
 * and neither failure could be named. Option 5 split it; option 1 narrowed the second half's signal
 * from the aggregate verdict to the lanes the tuning affects, because the verdict included an input
 * (`build`) that says nothing about test stability and was red for an unrelated reason.
 *
 * The split keeps clause 2's subject **bound** to clause 1's change — the CR records that its own first
 * attempt unbound them, which would have turned one guard into two independently satisfiable ones and
 * lost the attributability `OC-80` is about.
 *
 * ## Why a green run here is not a vacuous one
 *
 * No project has been moved off the declared value yet, so both rules range over an empty set. That is
 * the honest state and it is also the shape that hides a broken scan, so the emptiness is never
 * asserted on its own: the first case asserts what the scan **read** — every project, by name, at the
 * declared value — so an empty departure set is a positive finding rather than the absence of one.
 * `tmp/plant-tuning.py` moves projects and checks both rules redden.
 */

import { readFile, readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { CONCURRENCY_ENV, DECLARED_START, WORKERS_ENV } from "../../vitest.knobs";

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const DECISIONS = path.join(REPO_ROOT, ".qfai", "specs", "spec-0017", "07_Decisions.md");

/**
 * The value every project declares, re-derived here rather than imported so the baseline is not read
 * out of the file under test: the declared starting value, held to the cores the machine has. The
 * measurement behind the cap sits on the declaration itself.
 */
const DECLARED_CONCURRENCY = Math.min(DECLARED_START, availableParallelism());

/** A GitHub Actions run identifier: a long bare integer. */
const RUN_ID = /\b\d{9,14}\b/g;

/**
 * The axes a tuning change can move. `maxConcurrency` is project-scoped and carries the declared
 * value; the three worker axes are root-only, so a project declaring one at all has been moved —
 * `vitest.workspace.ts` says the runner ignores them there, which makes such a declaration a silent
 * departure rather than a loud one.
 */
const ROOT_ONLY_AXES = ["maxWorkers", "minWorkers", "fileParallelism"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface Project {
  readonly name: string;
  readonly includes: readonly string[];
  /** Each setting that moves the project off the declared value, written `axis=value`. */
  readonly departures: readonly string[];
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/**
 * The projects as declared, with the tuning overrides cleared.
 *
 * The overrides change what every project runs with, not what any project declares, so a run with
 * one set has moved nothing. The workspace is imported afresh because it reads the environment once,
 * when it is evaluated.
 */
async function readProjects(): Promise<Project[]> {
  vi.resetModules();
  for (const key of [WORKERS_ENV, CONCURRENCY_ENV]) vi.stubEnv(key, undefined);
  const module: unknown = await import("../../vitest.workspace");
  const entries = isRecord(module) ? module["default"] : undefined;
  expect(Array.isArray(entries), "the workspace must resolve to a list of projects").toBe(true);
  const out: Project[] = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!isRecord(entry) || !isRecord(entry["test"])) continue;
    const test = entry["test"];
    const name = typeof test["name"] === "string" ? test["name"] : "";
    if (name === "") continue;

    const departures: string[] = [];
    if (test["maxConcurrency"] !== DECLARED_CONCURRENCY) {
      departures.push(`maxConcurrency=${String(test["maxConcurrency"])}`);
    }
    for (const axis of ROOT_ONLY_AXES) {
      if (test[axis] !== undefined) departures.push(`${axis}=${String(test[axis])}`);
    }
    const includes = Array.isArray(test["include"])
      ? test["include"].filter((value): value is string => typeof value === "string")
      : [];
    out.push({ name, includes, departures });
  }
  return out;
}

/** Test files under a glob's base directory. The size ordering "largest first" is measured, not declared. */
async function countTests(includes: readonly string[]): Promise<number> {
  let total = 0;
  for (const glob of includes) {
    const base = glob.split("**")[0] ?? "";
    const dir = path.join(PACKAGE_ROOT, base);
    // Named from the call rather than from `typeof readdir`: that alias picks the overload returning
    // `Dirent<NonSharedBuffer>`, whose `name` is a Buffer, and the mismatch only surfaced once this
    // file entered `tsconfig.tests.json`.
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { recursive: true, withFileTypes: true });
    } catch {
      continue; // A project may name a directory that does not exist yet; it simply counts zero.
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".test.ts")) total += 1;
    }
  }
  return total;
}

/**
 * Every moved project whose move is not recorded with three run identifiers.
 *
 * Bound to the change rather than to the project: the identifiers count only in the section that
 * records THIS move: the last one naming the project and every setting it now departs with, each in
 * backticks. An earlier change to the same project is a different change, and its greens say nothing
 * about this one. Losing that binding is the mistake `CR-20260820-0012` records its own first split
 * making.
 *
 * Whether the runs were consecutive is not something a record can show, so this counts distinct
 * identifiers; `CR-20260925-0021` restates the case to what the record carries.
 */
function unjustifiedMoves(
  moved: readonly Pick<Project, "name" | "departures">[],
  sections: readonly string[],
): string[] {
  const out: string[] = [];
  for (const { name, departures } of moved) {
    const record = sections
      .filter((section) => section.includes(`\`${name}\``))
      .filter((section) => departures.every((setting) => section.includes(`\`${setting}\``)))
      .at(-1);
    if (record === undefined) {
      out.push(`${name}: no section records the move to ${departures.join(", ")}`);
      continue;
    }
    const ids = new Set(record.match(RUN_ID) ?? []);
    if (ids.size < 3)
      out.push(`${name}: ${String(ids.size)} run identifier(s) recorded against its move, needs 3`);
  }
  return out;
}

// QFAI:SPEC-0017:TC-0017-0069
describe("at most one runner project is moved off the declared parallelism value", () => {
  it("reads every project, and finds the departing set holds no more than the largest one", async () => {
    // Read under an override that differs from the declared value, which is what a timing run sets.
    // The declarations have not moved, so the result must be the same as with no override at all.
    vi.stubEnv(CONCURRENCY_ENV, String(DECLARED_CONCURRENCY + 1));
    const projects = await readProjects();

    // Non-vacuity, and the part that makes an empty departure set mean something. The names are
    // enumerated rather than counted: a scan that silently dropped a project would still satisfy a
    // count, and dropping the tuned one is exactly the failure this rule cannot afford.
    expect(
      projects.map((project) => project.name).sort(),
      "the scan must see the whole runner surface; a project it cannot read is a project that can be " +
        "tuned without this rule noticing",
    ).toEqual(["cli", "core", "e2e", "integration", "scripts", "unit", "validators"]);

    // Each project is compared with the DECLARED value, not with the shared knob, so a quiet edit to
    // the knob moves every project at once and fails the rule below rather than hiding.
    const moved = projects.filter((project) => project.departures.length > 0);
    // AT MOST one, not none. Writing `toEqual([])` here would be stricter than the rule and would
    // redden on the first legitimate tuning change — a guard someone then has to weaken, which is how
    // a guard stops being believed. The empty case is carried by the enumeration above instead.
    const described = moved.map((project) => `${project.name}: ${project.departures.join(", ")}`);
    expect(
      described.length > 1 ? described : [],
      "one tuning change per pull request (OC-80): batching two makes an emergent race unattributable, " +
        "so a second departing project fails this however the run history reads",
    ).toEqual([]);

    // Conditional, and it stays here rather than in a fixture: the day a project is moved this is the
    // assertion that says whether the ORDER was respected, and it must already be written by then.
    if (moved.length === 1) {
      const sizes = await Promise.all(
        projects.map(async (project) => ({
          name: project.name,
          tests: await countTests(project.includes),
        })),
      );
      const largest = [...sizes].sort(
        (a, b) => b.tests - a.tests || a.name.localeCompare(b.name),
      )[0];
      expect(moved[0]?.name, "largest project first").toBe(largest?.name);
    }
  });
});

// QFAI:SPEC-0017:TC-0017-0083
describe("a moved project carries the run identifiers that justify the move", () => {
  it("requires three recorded runs against the change that moved it, and none against no change", async () => {
    const projects = await readProjects();
    const moved = projects.filter((project) => project.departures.length > 0);

    const text = await readFile(DECISIONS, "utf8");
    const sections = text.split(/^### /m).slice(1);
    expect(
      sections.length,
      "the decision record must be readable for this to check it",
    ).toBeGreaterThan(0);

    expect(
      unjustifiedMoves(moved, sections),
      "a project moved off the declared value without three recorded runs is a parallelism claim " +
        "landing on argument, which is the thing BR-0017-0030 and this rule both forbid",
    ).toEqual([]);

    // **The antecedent is empty today, so the assertion above is vacuous, so it is not the whole
    // case.** These fixtures exercise the predicate itself: without them a `return []` would satisfy
    // the line above, and this row would report coverage of a rule it never evaluated.
    const THREE = "runs `32370185891`, `32370813280`, `32370926286`";
    const unit = { name: "unit", departures: ["maxConcurrency=4"] };
    expect(
      unjustifiedMoves([unit], [`DR-X: tuned \`unit\` to \`maxConcurrency=4\` — ${THREE}`]),
      "three identifiers in the section recording the move is the accepting shape",
    ).toEqual([]);
    expect(
      unjustifiedMoves(
        [unit],
        ["DR-X: tuned `unit` to `maxConcurrency=4` — runs `32370185891`, `32370813280`"],
      ),
      "two is not three",
    ).toEqual(["unit: 2 run identifier(s) recorded against its move, needs 3"]);
    expect(
      unjustifiedMoves([unit], ["DR-X: tuned `unit` to `maxConcurrency=4`, and it was faster"]),
      "a move with no identifiers at all",
    ).toEqual(["unit: 0 run identifier(s) recorded against its move, needs 3"]);
    // The binding, which is the half `CR-20260820-0012` records its own first attempt losing: greens
    // belonging to a different tuning change say nothing about this one.
    expect(
      unjustifiedMoves([unit], [`DR-X: tuned \`integration\` to \`maxConcurrency=4\` — ${THREE}`]),
      "identifiers recorded against a DIFFERENT project must not justify this one",
    ).toEqual(["unit: no section records the move to maxConcurrency=4"]);
    // The same project, changed twice. The earlier change's greens sit in a section that names the
    // project, and pooling by project name would let them justify the later move.
    expect(
      unjustifiedMoves(
        [unit],
        [
          `DR-X: tuned \`unit\` to \`maxConcurrency=6\` — ${THREE}`,
          "DR-Y: tuned `unit` to `maxConcurrency=4`, and it was faster",
        ],
      ),
      "an earlier change to the same project must not justify a later move of it",
    ).toEqual(["unit: 0 run identifier(s) recorded against its move, needs 3"]);
    expect(
      unjustifiedMoves(
        [unit],
        [
          "DR-X: tuned `unit` to `maxConcurrency=6`, and it was faster",
          `DR-Y: tuned \`unit\` to \`maxConcurrency=4\` — ${THREE}`,
        ],
      ),
      "and the later change's own greens justify it whatever the earlier record carries",
    ).toEqual([]);
  });
});

/**
 * `BR-0017-0054`, the post-merge half of the flake budget.
 *
 * The signature is the rule: there is no parameter for the pre-merge greens, because "three greens
 * before merge do not close it permanently" means they are not an input to this question at all. A
 * predicate that accepted them could be argued into using them.
 */
function budgetHolds(input: {
  readonly rerunsToGreen: number;
  readonly defaultBranchRuns: number;
  readonly reopened: boolean;
}): boolean {
  // "ABOVE one in twenty" — exactly one in twenty is inside the budget. A rule stated with a strict
  // inequality and implemented with a loose one moves the threshold by one run at every scale.
  //
  // Cross-multiplied rather than divided, which is also why there is no zero-runs guard: `0 * 20 > 0`
  // is already false, so no runs yet holds the budget without a branch of its own. A guard was written
  // here first and the falsification found it unreachable — every mutation of it left the suite green,
  // because the arithmetic it was protecting cannot divide by zero.
  const exceeds = input.rerunsToGreen * 20 > input.defaultBranchRuns;
  return !exceeds || input.reopened;
}

// QFAI:SPEC-0017:TC-0017-0070
describe("a rerun-to-green rate above one in twenty reopens the setting", () => {
  it("holds the post-merge budget open, and finds no merged tuning change owing it anything", async () => {
    // The antecedent, read rather than assumed: a merged tuning change would be recorded, because
    // `BR-0017-0053` requires the record. None is, so nothing is owed — and the enumeration says that
    // positively instead of leaving an empty loop to stand for it.
    const text = await readFile(DECISIONS, "utf8");
    const sections = text.split(/^### /m).slice(1);
    const projectNames = (await readProjects()).map((project) => project.name);
    const tuningRecords = sections.filter((section) =>
      projectNames.some((name) => section.includes(`tuned \`${name}\``)),
    );
    expect(
      tuningRecords.length,
      "no tuning change has merged, so the post-merge rate has nothing to be a rate OF; the day one " +
        "merges, its record is what this reads",
    ).toBe(0);
    expect(
      sections.length,
      "the record must be readable for that to mean anything",
    ).toBeGreaterThan(0);

    // The predicate itself, because the scan above is vacuous by construction today and a rule this
    // row never evaluates is a row that reports coverage it does not have.
    expect(
      budgetHolds({ rerunsToGreen: 2, defaultBranchRuns: 20, reopened: false }),
      "two in twenty is above one in twenty, and the setting was not reopened",
    ).toBe(false);
    expect(
      budgetHolds({ rerunsToGreen: 2, defaultBranchRuns: 20, reopened: true }),
      "the same rate, with the setting reopened, is the accepting outcome — reopening IS the remedy",
    ).toBe(true);
    // The boundary the wording fixes: "above", so exactly one in twenty is not above.
    expect(
      budgetHolds({ rerunsToGreen: 1, defaultBranchRuns: 20, reopened: false }),
      "exactly one in twenty is inside the budget",
    ).toBe(true);
    expect(
      budgetHolds({ rerunsToGreen: 2, defaultBranchRuns: 39, reopened: false }),
      "the threshold is a rate, not a count: two in thirty-nine is still above one in twenty",
    ).toBe(false);
    expect(
      budgetHolds({ rerunsToGreen: 2, defaultBranchRuns: 40, reopened: false }),
      "and two in forty is exactly one in twenty, so it is not",
    ).toBe(true);
    expect(
      budgetHolds({ rerunsToGreen: 0, defaultBranchRuns: 0, reopened: false }),
      "no default-branch runs yet is not a rate of zero, it is no rate at all — the branch that would " +
        "otherwise divide by zero and report a violation nobody can act on",
    ).toBe(true);
  });
});
