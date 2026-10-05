#!/usr/bin/env node
/**
 * Hold the route catalog, the plans the package ships and the approvals behind them together.
 *
 * The workflow contract's route rows are the catalog. Each row states a route's plan and cites the
 * `Change request:` row in `decisions.md` that approved it, and the package ships one plan file per
 * row. Nothing else notices when the three drift apart, and a route changed without a person's
 * approval is the failure this lane exists for: an agent never approves a route change.
 *
 * ## What fails the run
 *
 *   - a row citing a decision the table does not hold, one that is not an in-force change request
 *     naming the workflow contract, or one whose Approach does not name the route and record who
 *     approved it and when;
 *   - a plan file with no row, a row with no plan file, or a plan that states something its row
 *     does not: its family, its stages, their steps and reviews, or its decision, release or
 *     branch points;
 *   - against the base of the change, a route row added or changed that does not cite a change
 *     request this change appended, or a route row removed with no appended change request naming
 *     the route.
 *
 * The base is resolved the way `check-shipped-ci-parity.mjs` resolves it. An unresolvable base warns
 * and skips only the comparison with the base; the rest still runs.
 *
 * Exit codes: 0 clean / 1 a fault / 2 an unknown argument.
 */
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { argv, cwd, exit, stderr, stdout } from "node:process";
import { pathToFileURL } from "node:url";

import { blobAt, resolveRange } from "./check-shipped-ci-parity.mjs";

// `yaml` is installed under the package workspace only; see `check-workflow-hygiene.mjs`.
const require = createRequire(import.meta.url);
const { parse: parseYaml } = require("./../packages/qfai/node_modules/yaml");

export const CONTRACT = ".qfai/spec/03_contract/cli/cli-0015-qfai-workflow.md";
export const DECISIONS = ".qfai/spec/decisions.md";
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
      approvedBy: /Approved by (DEC-\d{4})\b/.exec(statement)?.[1],
    });
  }
  return routes;
}

/** Each row of the decisions table, by ID. */
export function decisionRowsOf(decisionsText) {
  const rows = new Map();
  for (const line of decisionsText.split(/\r?\n/)) {
    if (!line.startsWith("| DEC-")) continue;
    const [id, content = "", approach = "", status = ""] = cellsOf(line);
    rows.set(id, { id, content, approach, status });
  }
  return rows;
}

function namesRoute(text, route) {
  return new RegExp(`(^|[^a-z-])${route}([^a-z-]|$)`).test(text);
}

// What is wrong with the change request a route row cites, or nothing.
function citationFault(route, row, decisions) {
  const cited = row.approvedBy;
  if (!cited) return `${route}: the row cites no change request`;
  const decision = decisions.get(cited);
  if (!decision) return `${route}: the row cites ${cited}, which decisions.md does not hold`;
  const inForce = decision.status === "WIP" || decision.status === "DONE";
  const request = /^Change request:/.test(decision.content) && decision.content.includes(CONTRACT);
  if (!request || !inForce) {
    return `${route}: ${cited} is not an in-force change request naming ${CONTRACT}`;
  }
  const approach = decision.approach;
  const recorded = /\b\d{4}-\d{2}-\d{2}\b/.test(approach) && /approv/i.test(approach);
  if (!namesRoute(approach, route) || !recorded) {
    return `${route}: ${cited} does not name the route and record who approved it, and when`;
  }
  return undefined;
}

/** Each route row whose cited change request does not approve it. */
export function citationFaults(contractText, decisionsText) {
  const decisions = decisionRowsOf(decisionsText);
  return [...routeRowsOf(contractText)].flatMap(([route, row]) => {
    const fault = citationFault(route, row, decisions);
    return fault ? [fault] : [];
  });
}

function stepText(entry) {
  const step = typeof entry === "string" ? { name: entry } : entry;
  const name = step.name ?? step.step;
  return `${name}${step.mode ? `(${step.mode})` : ""}${step.passThrough ? "°" : ""}`;
}

// A stage as a row states it: `id[steps]`, then `{spec}` or `{code}` for the review after it.
function stageText(stage) {
  const steps = (stage.steps ?? []).map(stepText).join(" → ");
  return `${stage.id}[${steps}]${stage.review ? `{${stage.review}}` : ""}`;
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

// The route rows a change added, changed and removed.
function changedRoutes(baseContract, headContract) {
  const base = routeRowsOf(baseContract);
  const head = routeRowsOf(headContract);
  const touched = [...head].filter(([route, row]) => base.get(route)?.statement !== row.statement);
  const removed = [...base.keys()].filter((route) => !head.has(route));
  return { touched, removed };
}

/** Each route row a change moved without citing a change request it appended. */
export function changeFaults(base, head) {
  const { touched, removed } = changedRoutes(base.contract, head.contract);
  const before = decisionRowsOf(base.decisions);
  const appended = [...decisionRowsOf(head.decisions).values()].filter(
    (row) => !before.has(row.id) && /^Change request:/.test(row.content),
  );
  const appendedFor = (route) => appended.filter((row) => namesRoute(row.approach, route));
  const faults = touched.flatMap(([route, row]) =>
    appendedFor(route).some((each) => each.id === row.approvedBy)
      ? []
      : [`${route}: the route row changed, and cites no change request this change appended`],
  );
  for (const route of removed) {
    if (appendedFor(route).length === 0) {
      faults.push(`${route}: the route row was removed, and no appended change request names it`);
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

function baseFaults(head) {
  const range = resolveRange(undefined);
  if (range.unresolvable) {
    stderr.write(
      `check-route-catalog: warning: ${range.unresolvable}; the base is not compared.\n`,
    );
    return [];
  }
  const contract = blobAt(range.baseRev, CONTRACT);
  const decisions = blobAt(range.baseRev, DECISIONS);
  if (contract === null || decisions === null) return [];
  return changeFaults({ contract, decisions }, head);
}

function main() {
  if (argv.length > 2) {
    stderr.write("check-route-catalog: takes no argument.\n");
    return 2;
  }
  const root = cwd();
  const head = {
    contract: readFileSync(path.join(root, CONTRACT), "utf8"),
    decisions: readFileSync(path.join(root, DECISIONS), "utf8"),
  };
  const faults = [
    ...citationFaults(head.contract, head.decisions),
    ...planFaults(head.contract, readPlans(root)),
    ...baseFaults(head),
  ];
  if (faults.length === 0) {
    const count = routeRowsOf(head.contract).size;
    stdout.write(`check-route-catalog: ${count} routes, each approved and shipped as stated.\n`);
    return 0;
  }
  for (const fault of faults) stderr.write(`${fault}\n`);
  stderr.write(
    "\ncheck-route-catalog: a route is added, removed or changed only with a person's approval, " +
      "recorded as a new `Change request:` row that the route row cites.\n",
  );
  return 1;
}

if (argv[1] !== undefined && import.meta.url === pathToFileURL(argv[1]).href) {
  exit(main());
}
