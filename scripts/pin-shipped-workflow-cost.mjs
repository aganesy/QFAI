#!/usr/bin/env node
/* global console */
/**
 * Recompute `.github/shipped-workflow-cost.json` from the templates `qfai init` writes.
 *
 * The declaration records, per adopter path, which jobs allocate a runner, on which class, the
 * declared timeout ceiling, and the billable-job floor the per-job rounding costs. A test holds
 * the committed figures against a fresh recomputation, so a template change that moves an
 * adopter's cost fails until this has run — which puts the new figure in a diff a reviewer reads
 * rather than leaving it to be discovered on someone's invoice.
 *
 * It imports the figures rather than restating them, for the reason the other two pinners give:
 * two implementations of "what does this path cost" are two answers, and the first edit to either
 * is where they start to disagree.
 *
 * Refuses to write, changing nothing, when a job that allocates a runner declares no
 * `timeout-minutes`. The ceiling would then understate what the path may cost, and pinning it
 * would record the understatement as the figure.
 *
 * Usage: `node scripts/pin-shipped-workflow-cost.mjs`
 */
import path from "node:path";
import { argv, cwd, exit, stderr } from "node:process";
import { fileURLToPath } from "node:url";

import { allShippedCostFigures, BILLABLE_JOB_FLOOR_MINUTES } from "./shipped-workflow-cost.mjs";
import { writeFormattedJson } from "./lib/write-declaration.mjs";

const DECLARATION_REL = ".github/shipped-workflow-cost.json";

const NOTE = [
  "What the workflows `qfai init` writes cost an adopter, per path, derived from the templates.",
  "",
  "Not a bound: enforcement is equality against a value recomputed from the same templates, so a",
  "clause forbidding a higher cost could not fail once this has been re-pinned. What it refuses is",
  "a change that moved an adopter's cost and did not move the figure.",
  "",
  "Not a measurement either. Wall time and billed minutes belong to a run, and no lint has one.",
  "`billableFloorMinutes` is what the per-job rounding costs before any work happens: GitHub bills",
  "a job that allocated a runner at one minute even when it finishes in four seconds.",
  "",
  "Re-pin with `node scripts/pin-shipped-workflow-cost.mjs`.",
];

export async function pinShippedWorkflowCost(root) {
  const figures = allShippedCostFigures(root);

  const understated = figures.filter((entry) => entry.jobsWithoutTimeout.length > 0);
  if (understated.length > 0) {
    for (const entry of understated) {
      stderr.write(
        `pin-shipped-workflow-cost: ${entry.path} allocates a runner for ` +
          `${entry.jobsWithoutTimeout.join(", ")}, which declares no timeout-minutes. ` +
          `The ceiling would understate the path; nothing was written.\n`,
      );
    }
    return 1;
  }

  await writeFormattedJson(path.join(root, DECLARATION_REL), {
    $comment: NOTE,
    billableJobFloorMinutes: BILLABLE_JOB_FLOOR_MINUTES,
    paths: figures.map(({ jobsWithoutTimeout: _owed, ...kept }) => kept),
  });

  for (const entry of figures) {
    console.log(
      `${entry.path}: ${entry.runnerJobs} runner job(s), ` +
        `${entry.timeoutMinutesSum} declared timeout-minute(s), ` +
        `${entry.billableFloorMinutes} billable floor minute(s)`,
    );
  }
  return 0;
}

const invokedDirectly = fileURLToPath(import.meta.url) === path.resolve(argv[1] ?? "");
if (invokedDirectly) {
  exit(await pinShippedWorkflowCost(cwd()));
}
