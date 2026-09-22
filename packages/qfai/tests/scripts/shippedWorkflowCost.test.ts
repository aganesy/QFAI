/**
 * What the shipped workflows cost an adopter, held against what the templates declare.
 *
 * This repository pins the cost of its own CI twice over. The templates `qfai init` writes had no
 * equivalent, and they are the surface where the money is somebody else's: a template change that
 * adds a runner-allocating job spends an adopter's minutes on every pull request they open, and
 * nothing put that number in front of a reviewer.
 *
 * The cases are about the three things a cost figure has to be: derived from the tree rather than
 * typed, refused rather than guessed where a condition is unfamiliar, and equal to what is
 * committed — which is what makes a moved cost fail until it has been re-pinned.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  allShippedCostFigures,
  BILLABLE_JOB_FLOOR_MINUTES,
  COST_PATHS,
  instancesOf,
  jobRuns,
} from "../../../../scripts/shipped-workflow-cost.mjs";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const DECLARATION = path.join(repoRoot, ".github", "shipped-workflow-cost.json");

type PinnedPath = {
  path: string;
  what: string;
  jobs: string[];
  runnerJobs: number;
  runners: string[];
  timeoutMinutesSum: number;
  billableFloorMinutes: number;
};

async function declaration(): Promise<{
  billableJobFloorMinutes: number;
  paths: PinnedPath[];
}> {
  return JSON.parse(await readFile(DECLARATION, "utf-8")) as {
    billableJobFloorMinutes: number;
    paths: PinnedPath[];
  };
}

describe("the shipped set's cost is pinned", () => {
  it("agrees with a fresh recomputation from the templates", async () => {
    // The whole rule. A template change that adds a runner-allocating job, raises a timeout or
    // widens a matrix moves one of these figures, and the change fails here until
    // `node scripts/pin-shipped-workflow-cost.mjs` has run and the new number is in the diff.
    const pinned = await declaration();
    const fresh = allShippedCostFigures(repoRoot).map(
      ({ jobsWithoutTimeout: _ignored, ...kept }) => kept,
    );

    expect(pinned.paths).toEqual(fresh);
  });

  it("costs every path the paths list declares", async () => {
    // A path nobody computes is a path nobody is shown, so the two lists are one.
    const pinned = await declaration();

    expect(pinned.paths.map((entry) => entry.path)).toEqual(COST_PATHS.map((entry) => entry.id));
  });

  it("records the per-job floor, which is what the rounding costs", async () => {
    // The adopter evidence behind this turned on it: a job that runs for four seconds is billed
    // as a minute, so the floor is a real number even when every job is fast.
    const pinned = await declaration();

    expect(pinned.billableJobFloorMinutes).toBe(BILLABLE_JOB_FLOOR_MINUTES);
    for (const entry of pinned.paths) {
      expect(entry.billableFloorMinutes, entry.path).toBe(
        entry.runnerJobs * BILLABLE_JOB_FLOOR_MINUTES,
      );
    }
  });

  it("names a runner class for every path that allocates one", async () => {
    // Finding 5 of the issue behind this is about moving short jobs to a lighter class. It cannot
    // be reviewed against a figure that does not say which class the minutes were spent on.
    const pinned = await declaration();

    for (const entry of pinned.paths) {
      if (entry.runnerJobs === 0) continue;
      expect(entry.runners.length, entry.path).toBeGreaterThan(0);
    }
  });
});

describe("what the cost reader refuses", () => {
  /** Any path will do for a condition the reader rejects outright; this is the first. */
  const anyPath = COST_PATHS[0];
  if (anyPath === undefined) throw new Error("no cost path is declared");

  it("throws on a job condition it does not recognise", () => {
    // A condition read wrongly is counted as running or not running, and either way the figure is
    // a number nobody can check. The shipped contract keeps the list of permitted conditions
    // short, so refusing here is cheap and silent drift is not.
    expect(() => jobRuns({ if: "${{ github.actor == 'dependabot[bot]' }}" }, anyPath)).toThrow(
      /unrecognised job condition/,
    );
  });

  it("throws on a matrix axis it cannot expand", () => {
    expect(() =>
      instancesOf({ strategy: { matrix: { leg: "${{ fromJSON(vars.LEGS) }}" } } }, anyPath),
    ).toThrow(/unrecognised matrix axis/);
  });

  it("reads the close gate as the one condition that empties a path", () => {
    const close = COST_PATHS.find((entry) => entry.action === "closed");
    expect(close, "a close path is declared").toBeDefined();
    if (close === undefined) return;

    const gated = { if: "${{ github.event.action != 'closed' }}" };
    expect(jobRuns(gated, close)).toBe(false);
    expect(jobRuns(gated, anyPath)).toBe(true);
  });

  it("reads a lane's opt-in as both halves together", () => {
    // A lane runs when the diff selected it AND the manifest declares the script. Read as either
    // one, an adopter with the script and no matching change would be costed for a lane that
    // never starts.
    const lane = {
      if: "${{ contains(needs.detection.outputs.scripts, 'unit') && contains(needs.detection.outputs.lanes, 'unit') }}",
    };
    const declaresUnit = COST_PATHS.find((entry) => entry.testScripts.includes("unit"));
    const declaresNone = COST_PATHS.find((entry) => entry.testScripts.length === 0);
    expect(declaresUnit).toBeDefined();
    expect(declaresNone).toBeDefined();
    if (declaresUnit === undefined || declaresNone === undefined) return;

    expect(jobRuns(lane, declaresUnit)).toBe(!declaresUnit.documentsOnly);
    expect(jobRuns(lane, declaresNone)).toBe(false);
  });

  it("reads the document lane's scope as whether the change touched a document", () => {
    // The document checks run when their scope found a change they read. Costed on
    // `documentsOnly` instead, a pull request touching source AND a document would be counted as
    // skipping checks it runs, and the saving the scope buys would be overstated.
    const lane = {
      if: "${{ needs.scope.outputs.run == 'true' && github.event.action != 'closed' }}",
    };
    const touches = COST_PATHS.find((entry) => entry.documentsTouched === true && !entry.action);
    const avoids = COST_PATHS.find((entry) => entry.documentsTouched === false);
    const close = COST_PATHS.find((entry) => entry.action === "closed");
    expect(touches, "a path touching documents is declared").toBeDefined();
    expect(avoids, "a path touching no document is declared").toBeDefined();
    expect(close, "a close path is declared").toBeDefined();
    if (touches === undefined || avoids === undefined || close === undefined) return;

    expect(jobRuns(lane, touches)).toBe(true);
    expect(jobRuns(lane, avoids)).toBe(false);
    expect(jobRuns(lane, close), "the close gate still empties the path").toBe(false);
  });
});
