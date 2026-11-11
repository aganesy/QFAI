#!/usr/bin/env node
/**
 * Hold the route catalog and the plans the package ships together.
 *
 * The workflow contract's route rows are the catalog. Each row states a route's plan, and the
 * package ships one plan file per row. Nothing else notices when the two drift apart.
 *
 * ## What fails the run
 *
 *   - a plan file with no row, a row with no plan file, or a plan that states something its row
 *     does not: its family, its stages, their steps, reviews and served artifacts, or its
 *     decision, release or branch points.
 *
 * Exit codes: 0 clean / 1 a fault / 2 an unknown argument.
 */
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { argv, cwd, exit, stderr, stdout } from "node:process";
import { pathToFileURL } from "node:url";

// `yaml` is installed under the package workspace only; see `check-workflow-hygiene.mjs`.
const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("./../packages/qfai/node_modules/yaml");

export const CONTRACT = ".qfai/spec/03_contract/cli/cli-0015-qfai-workflow.md";
export const PLANS_DIR = "packages/qfai/assets/defaults/workflows";

/** The cells of one Markdown table row, a `\|` inside a cell kept as a pipe. */
function cellsOf(line) {
  const cells = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/);
  return cells.map((cell) => cell.trim().replaceAll("\\|", "|"));
}

function ticked(text) {
  return [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

// The list a row states after `label`, up to the full stop: `none`, or backticked names.
function listAfter(statement, label) {
  const match = new RegExp(`${label}: ([^.]*)\\.`).exec(statement);
  return match ? ticked(match[1]) : undefined;
}

// The release point a row states: a step, `the end`, which a plan writes `end`, or none.
function releasePointOf(statement) {
  const stated = /Release point: ([^.]*)\./.exec(statement)?.[1];
  if (stated === undefined || stated === "none") return undefined;
  return stated === "the end" ? "end" : ticked(stated)[0];
}

// The branch points a row states, in order. The list joins entries with commas: a branch point
// is an entry that is one name alone, and every other entry is an outcome with the routes it
// leads to, such as `revert` to `revert-culprit`. A misspelled step stays in the list, so a row
// naming a step its plan lacks disagrees with the plan.
function branchStepsOf(statement) {
  const listed = /Branch points: ([^.]*)\./.exec(statement)?.[1];
  if (listed === undefined) return undefined;
  return listed.split(", ").flatMap((entry) => /^`([^`]+)`$/.exec(entry.trim())?.slice(1) ?? []);
}

/** Each route row of the contract, by route. */
export function routeRowsOf(contractText) {
  const routes = new Map();
  for (const line of contractText.split(/\r?\n/)) {
    if (!line.startsWith("| BR-")) continue;
    const [id, statement = ""] = cellsOf(line);
    const route = /^Route `([a-z-]+)` — family `([a-z]+)`/.exec(statement);
    if (!route) continue;
    const plan = /Plan: `([^`]*)`/.exec(statement)?.[1];
    routes.set(route[1], {
      id,
      statement,
      family: route[2],
      plan,
      decisionPoints: listAfter(statement, "Decision points"),
      releasePoint: releasePointOf(statement),
      branchPoints: branchStepsOf(statement),
    });
  }
  return routes;
}

function stepText(entry) {
  const step = typeof entry === "string" ? { name: entry } : entry;
  const name = step.name ?? step.step;
  return `${name}${step.mode ? `(${step.mode})` : ""}${step.passThrough ? "°" : ""}`;
}

// A stage as a row states it: `id[steps]`, then `{spec}` or `{code}` for the review after it,
// then `<artifacts>` for what it serves beyond its kind.
function stageText(stage) {
  const steps = (stage.steps ?? []).map(stepText).join(" → ");
  const review = stage.review ? `{${stage.review}}` : "";
  const serves = Array.isArray(stage.serves) ? `<${stage.serves.join(", ")}>` : "";
  return `${stage.id}[${steps}]${review}${serves}`;
}

/** A plan file as its route row states it. */
export function planStatement(planText) {
  const plan = parseYaml(planText) ?? {};
  return {
    family: plan.family,
    plan: (plan.stages ?? []).map(stageText).join(" ▸ "),
    decisionPoints: plan.decisionPoints ?? [],
    releasePoint: plan.releasePoint,
    branchPoints: (plan.branchPoints ?? []).map((point) => point.step),
  };
}

const COMPARED = ["family", "plan", "decisionPoints", "releasePoint", "branchPoints"];

/** Each plan with no row, row with no plan, and field a plan and its row state differently. */
export function planFaults(contractText, plans) {
  const rows = routeRowsOf(contractText);
  const faults = [];
  for (const route of plans.keys()) {
    if (!rows.has(route)) faults.push(`${route}.yml: no route row of the catalog names it`);
  }
  for (const [route, row] of rows) {
    const text = plans.get(route);
    if (text === undefined) {
      faults.push(`${route}: the package ships no plan for this route row`);
      continue;
    }
    const stated = planStatement(text);
    for (const key of COMPARED) {
      if (JSON.stringify(stated[key]) !== JSON.stringify(row[key])) {
        faults.push(`${route}: the plan's ${key} is not what its route row states`);
      }
    }
  }
  return faults;
}

export function readPlans(root) {
  const dir = path.join(root, PLANS_DIR);
  const plans = new Map();
  for (const name of readdirSync(dir)
    .filter((file) => file.endsWith(".yml"))
    .sort()) {
    plans.set(name.replace(/\.yml$/, ""), readFileSync(path.join(dir, name), "utf8"));
  }
  return plans;
}

async function main() {
  if (argv.length > 2) {
    stderr.write("check-route-catalog: takes no argument.\n");
    return 2;
  }
  const root = cwd();
  const contract = readFileSync(path.join(root, CONTRACT), "utf8");
  const faults = planFaults(contract, readPlans(root));
  if (faults.length === 0) {
    const count = routeRowsOf(contract).size;
    stdout.write(`check-route-catalog: ${count} routes, each shipped as stated.\n`);
    return 0;
  }
  for (const fault of faults) stderr.write(`${fault}\n`);
  stderr.write(
    "\ncheck-route-catalog: each route row and its shipped plan state the same route.\n",
  );
  return 1;
}

if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  try {
    exit(await main());
  } catch (error) {
    stderr.write(
      `check-route-catalog: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    exit(1);
  }
}
