#!/usr/bin/env node
/**
 * Recompute `documentationOnlyCostPin` in `.github/required-status-contexts.json`.
 *
 * A documentation-only pull request executes the jobs nothing can prevent from running: those with
 * no condition, and those whose condition is `always()`. That set and the sum of their declared
 * `timeout-minutes` are pinned, and the hygiene lane exits 1 while the committed figures and a fresh
 * recomputation disagree. So a change to either — a job added to the set, a timeout raised — fails
 * until this tool has run, which is what makes the new cost a number a reviewer reads in a diff
 * rather than a drift nobody is shown.
 *
 * It is not a cost bound. Enforcement is equality against a value derived from the same tree, so a
 * clause forbidding a higher cost could not fail: once this has run, no state of the tree violates
 * it. What the pin refuses is a change that did not re-pin. Whether the new figure is acceptable is
 * a cost claim, and the repository already requires those to arrive with measured before-and-after
 * numbers rather than on argument.
 *
 * It imports the lane's own `documentationOnlyCostFigures` rather than restating it. A second
 * implementation of "which jobs execute, and what do they declare" is two answers to one question,
 * and the first edit to either is where they begin to disagree — with the pin and the check that
 * reads it on opposite sides.
 *
 * Usage:
 *
 *   node scripts/pin-documentation-only-cost.mjs
 *
 * Exits non-zero, changing nothing, when a declared context names a workflow that cannot be read or
 * parsed, and when an unconditional job declares no `timeout-minutes` — the sum would then
 * understate what the path may cost, and pinning it would record that understatement as the figure.
 */
import path from "node:path";
import { argv, cwd, exit } from "node:process";
import { fileURLToPath } from "node:url";

import { documentationOnlyCostFigures } from "./check-workflow-hygiene.mjs";
import { pinCost, rootFrom } from "./lib/pin-cost.mjs";

const invokedDirectly = fileURLToPath(import.meta.url) === path.resolve(argv[1] ?? "");
if (invokedDirectly) {
  exit(
    await pinCost(rootFrom(argv, cwd()), {
      field: "documentationOnlyCostPin",
      compute: documentationOnlyCostFigures,
      pin: (figures) => ({ jobs: figures.jobs, timeoutMinutesSum: figures.timeoutMinutesSum }),
      describe: (figures) =>
        `${figures.jobs.length} job(s) execute (${figures.jobs.join(", ")}), declaring ${figures.timeoutMinutesSum} minutes`,
    }),
  );
}
