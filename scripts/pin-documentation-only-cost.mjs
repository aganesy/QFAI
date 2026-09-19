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
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { argv, cwd, exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";

import { documentationOnlyCostFigures } from "./check-workflow-hygiene.mjs";
import { writeFormattedJson } from "./lib/write-declaration.mjs";

const require = createRequire(import.meta.url);
/** The parser the lane itself uses, out of the workspace that depends on it. */
const { parse: parseYaml } = require("../packages/qfai/node_modules/yaml");

const DECLARATION_REL = ".github/required-status-contexts.json";

async function main(root) {
  const declarationPath = path.join(root, DECLARATION_REL);
  const declaration = JSON.parse(readFileSync(declarationPath, "utf-8"));
  const contexts = Array.isArray(declaration.contexts) ? declaration.contexts : [];

  for (const context of contexts) {
    const workflow = String(context.workflow);
    const workflowPath = path.join(root, ".github", "workflows", workflow);

    let parsed;
    try {
      parsed = parseYaml(readFileSync(workflowPath, "utf-8"));
    } catch (error) {
      stderr.write(`cannot read ${workflow}: ${error instanceof Error ? error.message : error}\n`);
      return 1;
    }

    const figures = documentationOnlyCostFigures(parsed);

    // Refuse rather than pin an understatement. `job-guardrails` requires a `timeout-minutes` on
    // every job, so this is unreachable on a tree that lane passes — and on one it does not, a job
    // contributing nothing to the sum would be pinned as though it were free.
    if (figures.jobsWithoutTimeout.length > 0) {
      stderr.write(
        `${workflow} has unconditional job(s) declaring no timeout-minutes: ${figures.jobsWithoutTimeout.join(", ")}\n`,
      );
      return 1;
    }

    context.documentationOnlyCostPin = {
      jobs: figures.jobs,
      timeoutMinutesSum: figures.timeoutMinutesSum,
    };
    stdout.write(
      `${workflow}: ${figures.jobs.length} job(s) execute (${figures.jobs.join(", ")}), declaring ${figures.timeoutMinutesSum} minutes\n`,
    );
  }

  await writeFormattedJson(declarationPath, declaration);
  stdout.write(`pinned into ${DECLARATION_REL}\n`);
  return 0;
}

const invokedDirectly = fileURLToPath(import.meta.url) === path.resolve(argv[1] ?? "");
if (invokedDirectly) {
  const rootFlag = argv.indexOf("--root");
  exit(
    await main(
      rootFlag >= 0 && argv[rootFlag + 1] !== undefined ? path.resolve(argv[rootFlag + 1]) : cwd(),
    ),
  );
}
