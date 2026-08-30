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
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DECLARED_START, projectKnobs } from "../../vitest.knobs";
import workspace from "../../vitest.workspace";

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");
const DECISIONS = path.join(REPO_ROOT, ".qfai", "specs", "spec-0017", "07_Decisions.md");

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
  readonly departures: readonly string[];
}

function readProjects(): Project[] {
  const entries: unknown = workspace;
  expect(Array.isArray(entries), "the workspace must resolve to a list of projects").toBe(true);
  const out: Project[] = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!isRecord(entry) || !isRecord(entry["test"])) continue;
    const test = entry["test"];
    const name = typeof test["name"] === "string" ? test["name"] : "";
    if (name === "") continue;

    const departures: string[] = [];
    if (test["maxConcurrency"] !== projectKnobs.maxConcurrency) {
      departures.push(`maxConcurrency=${String(test["maxConcurrency"])}`);
    }
    for (const axis of ROOT_ONLY_AXES) {
      if (test[axis] !== undefined)
        departures.push(`${axis}=${String(test[axis])} (root-only axis)`);
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
    // file entered `tsconfig.tests.json` — which is the whole of what review finding [12] predicted.
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
 * Every moved project that does not carry three run identifiers recorded against IT.
 *
 * Bound to the change rather than free-standing: the identifiers must sit in a record that names this
 * project. Three greens recorded for a different tuning change say nothing about this one, and losing
 * that binding is the mistake `CR-20260820-0012` records its own first split making.
 */
function unjustifiedMoves(moved: readonly string[], sections: readonly string[]): string[] {
  const out: string[] = [];
  for (const name of moved) {
    const naming = sections.filter((section) => section.includes(`\`${name}\``));
    const ids = new Set<string>();
    for (const section of naming) for (const id of section.match(RUN_ID) ?? []) ids.add(id);
    if (ids.size < 3)
      out.push(`${name}: ${String(ids.size)} run identifier(s) recorded against it, needs 3`);
  }
  return out;
}

// QFAI:SPEC-0017:TC-0017-0069
describe("at most one runner project is moved off the declared parallelism value", () => {
  it("reads every project, and finds the departing set holds no more than the largest one", async () => {
    const projects = readProjects();

    // Non-vacuity, and the part that makes an empty departure set mean something. The names are
    // enumerated rather than counted: a scan that silently dropped a project would still satisfy a
    // count, and dropping the tuned one is exactly the failure this rule cannot afford.
    expect(
      projects.map((project) => project.name).sort(),
      "the scan must see the whole runner surface; a project it cannot read is a project that can be " +
        "tuned without this rule noticing",
    ).toEqual(["cli", "core", "e2e", "integration", "scripts", "unit", "validators"]);

    // The value being compared against is the DECLARED one, not whatever the file happens to hold.
    // Without this the rule would follow a quiet edit to `projectKnobs` and report nothing moved.
    expect(
      projectKnobs.maxConcurrency,
      "the comparison baseline must be the declared starting value, or every project moves together " +
        "and the set stays empty",
    ).toBe(DECLARED_START);

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
    const projects = readProjects();
    const moved = projects.filter((project) => project.departures.length > 0);

    const text = await readFile(DECISIONS, "utf8");
    const sections = text.split(/^### /m).slice(1);
    expect(
      sections.length,
      "the decision record must be readable for this to check it",
    ).toBeGreaterThan(0);

    expect(
      unjustifiedMoves(
        moved.map((project) => project.name),
        sections,
      ),
      "a project moved off the declared value without three recorded runs is a parallelism claim " +
        "landing on argument, which is the thing BR-0017-0030 and this rule both forbid",
    ).toEqual([]);

    // **The antecedent is empty today, so the assertion above is vacuous, so it is not the whole
    // case.** These four fixtures exercise the predicate itself: without them a `return []` would
    // satisfy the line above, and this row would report coverage of a rule it never evaluated.
    const THREE = "runs `32370185891`, `32370813280`, `32370926286`";
    expect(
      unjustifiedMoves(["unit"], [`DR-X: tuned \`unit\` — ${THREE}`]),
      "three identifiers recorded against the project that moved is the accepting shape",
    ).toEqual([]);
    expect(
      unjustifiedMoves(["unit"], ["DR-X: tuned `unit` — runs `32370185891`, `32370813280`"]),
      "two is not three",
    ).toEqual(["unit: 2 run identifier(s) recorded against it, needs 3"]);
    expect(
      unjustifiedMoves(["unit"], ["DR-X: tuned `unit`, and it was faster"]),
      "a move with no identifiers at all",
    ).toEqual(["unit: 0 run identifier(s) recorded against it, needs 3"]);
    // The binding, which is the half `CR-20260820-0012` records its own first attempt losing: greens
    // belonging to a different tuning change say nothing about this one.
    expect(
      unjustifiedMoves(["unit"], [`DR-X: tuned \`integration\` — ${THREE}`]),
      "identifiers recorded against a DIFFERENT project must not justify this one",
    ).toEqual(["unit: 0 run identifier(s) recorded against it, needs 3"]);
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
    const projectNames = readProjects().map((project) => project.name);
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
