/**
 * The walk both cost pinners perform: read the declaration, recompute one field per declared
 * context from that context's workflow, and write the result back formatted.
 *
 * Extracted when the second pin arrived. The part worth sharing is this walk — parsing the
 * workflow the context names, refusing rather than pinning an understatement, and writing the
 * file through the one formatter the re-pin chain expects. What is NOT shared is the
 * computation: each pinner imports its own figures from the hygiene lane, so the pin and the
 * rule that reads it stay one implementation each.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { stderr, stdout } from "node:process";

import { writeFormattedJson } from "./write-declaration.mjs";

const require = createRequire(import.meta.url);
/** The parser the lane itself uses, out of the workspace that depends on it. */
const { parse: parseYaml } = require("../../packages/qfai/node_modules/yaml");

export const DECLARATION_REL = ".github/required-status-contexts.json";

/**
 * Recomputes `field` for every declared context and writes it into the declaration.
 *
 * `compute` takes the parsed workflow and returns the figures. Two of its keys are read here:
 * `jobsWithoutTimeout`, which refuses the write rather than pinning a sum that understates what
 * the path may cost, and whatever `pin` selects. `describe` turns the figures into the one line
 * the operator reads.
 *
 * Returns a process exit code: 0 when the declaration was written, 1 when nothing was.
 */
export async function pinCost(root, { field, compute, pin, describe }) {
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

    const figures = compute(parsed);

    // Refuse rather than pin an understatement. `job-guardrails` requires a `timeout-minutes` on
    // every job, so this is unreachable on a tree that lane passes — and on one it does not, a job
    // contributing nothing to the sum would be pinned as though it were free.
    if (figures.jobsWithoutTimeout.length > 0) {
      stderr.write(
        `${workflow} has job(s) declaring no timeout-minutes: ${figures.jobsWithoutTimeout.join(", ")}\n`,
      );
      return 1;
    }

    context[field] = pin(figures);
    stdout.write(`${workflow}: ${describe(figures)}\n`);
  }

  await writeFormattedJson(declarationPath, declaration);
  stdout.write(`pinned ${field} into ${DECLARATION_REL}\n`);
  return 0;
}

/** The root a pinner runs against: `--root <path>`, or the working directory. */
export function rootFrom(argv, fallback) {
  const at = argv.indexOf("--root");
  return at >= 0 && argv[at + 1] !== undefined ? path.resolve(argv[at + 1]) : fallback;
}
