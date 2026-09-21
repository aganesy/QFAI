#!/usr/bin/env node
/**
 * Recompute `codePathCostPin` in `.github/required-status-contexts.json`.
 *
 * A code-path pull request runs the whole tree, so what it costs is a property of the tree and not
 * of a condition. Four figures are pinned: the instances the tree expands to, the sum of their
 * declared `timeout-minutes`, the instances that perform a frozen-lockfile install, and the jobs
 * that declare a build step. The hygiene lane exits 1 while the committed figures and a fresh
 * recomputation disagree, so a slice added, a ceiling raised or a build moved fails until this tool
 * has run — which puts the new figure in a diff a reviewer reads rather than leaving it to drift.
 *
 * It is not a cost bound, for the reason its sibling is not: enforcement is equality against a
 * value derived from the same tree, so a clause forbidding a higher cost could not fail once this
 * has run. What the pin refuses is a change that did not re-pin.
 *
 * Nor does it compare the declared figure with a run. Nothing here reads what a run actually cost:
 * that needs the forge's API and a finished run, which no lint lane has. The gap is deliberate and
 * recorded — this catches a tree that moved, not a tree that was always more expensive than it
 * said.
 *
 * Usage:
 *
 *   node scripts/pin-code-path-cost.mjs
 *
 * Exits non-zero, changing nothing, when a declared context names a workflow that cannot be read or
 * parsed, and when a job declares no `timeout-minutes` — the sum would then understate what the
 * path may cost, and pinning it would record that understatement as the figure.
 */
import path from "node:path";
import { argv, cwd, exit } from "node:process";
import { fileURLToPath } from "node:url";

import { codePathCostFigures } from "./check-workflow-hygiene.mjs";
import { pinCost, rootFrom } from "./lib/pin-cost.mjs";

const invokedDirectly = fileURLToPath(import.meta.url) === path.resolve(argv[1] ?? "");
if (invokedDirectly) {
  exit(
    await pinCost(rootFrom(argv, cwd()), {
      field: "codePathCostPin",
      compute: codePathCostFigures,
      pin: (figures) => ({
        instances: figures.instances,
        timeoutMinutesSum: figures.timeoutMinutesSum,
        installInstances: figures.installInstances,
        buildJobs: figures.buildJobs,
      }),
      describe: (figures) =>
        `${figures.instances} instance(s), declaring ${figures.timeoutMinutesSum} minutes, ` +
        `${figures.installInstances} install(s), build declared by ${figures.buildJobs.join(", ")}`,
    }),
  );
}
