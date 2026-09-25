// QFAI:BF-0001
/**
 * E2E: `qfai-run` drives each built-in plan with `next` and `accept` alone.
 *
 * On a `qfai init` project, a run on each of the five plans is fed canned accepted results. Every
 * work order `next` issues names the executor skill and operation its plan gives that stage, in
 * plan order, until `next` has nothing left: `workOrder: null` for a change route, and the
 * routing work order `qfai-run` handles itself once `discovery` hands the run back to routing.
 * The operator types no stage name; the only input they give is an answer to a question.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { EXAMPLE_IDS, FLOW_ID, seedFlow } from "./workflowFeatureRun.js";
import {
  DISCOVERY_PROPOSAL,
  answer,
  commitAll,
  field,
  initProject,
  list,
  removeProjects,
  routedRun,
  submit,
  resultFor,
  workflow,
  write,
} from "./workflowJourney.js";

afterEach(removeProjects);

const PLANS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "defaults",
  "workflows",
);

interface PlanStage {
  kind: string;
  skills: string[];
  operation: string;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}

// The stages of the package's plan for `route`, in plan order.
async function planStages(route: string): Promise<PlanStage[]> {
  const plan = record(parseYaml(await readFile(path.join(PLANS, `${route}.yml`), "utf8")));
  return (Array.isArray(plan.stages) ? plan.stages : []).map((stage) => {
    const { kind, skill, operation } = record(stage);
    return {
      kind: String(kind),
      skills: (Array.isArray(skill) ? skill : [skill]).map(String),
      operation: String(operation),
    };
  });
}

// What a stage submits when it has nothing to report beyond being done.
const REPORT = ".qfai/report/stage-record.md";

async function cannedResult(root: string, issued: unknown, step: number) {
  const kind = field(issued, "workOrder.stageKind");
  const extra: Record<string, unknown> = {};
  if (kind === "sdd") {
    const slotId = field(issued, "workOrder.target.slotId");
    extra.bindings = [{ slotId, flowId: FLOW_ID, storyIds: ["US-0001-0002"] }];
  }
  if (kind === "diagnose") {
    extra.diagnosis = {
      verdict: "regression",
      reproductionRef: REPORT,
      matchedIds: [EXAMPLE_IDS[0]],
    };
  }
  if (kind === "regression_fix") {
    extra.testObservation = "pass";
    extra.regressionFix = { testId: EXAMPLE_IDS[0], rerunRef: REPORT, reviewRef: REPORT };
  }
  await write(root, REPORT, `Stage ${String(step)}.\n`);
  return resultFor(issued, `stage-${String(step)}`, extra);
}

/**
 * Feeds canned accepted results until `next` issues no stage work order. Returns every stage
 * work order it issued, and the last `next` document.
 */
async function drive(root: string, runId: string) {
  const issued: unknown[] = [];
  for (let step = 1; step <= 12; step += 1) {
    const next = workflow(root, ["next", "--run", runId]);
    const kind = field(next.json, "workOrder.stageKind");
    if (kind === undefined || kind === "route") return { issued, last: next.json };
    issued.push(next.json);
    const accepted = await submit(root, runId, "accept", await cannedResult(root, next.json, step));
    if (field(accepted.json, "ok") !== true) throw new Error(`${String(kind)}: ${accepted.stdout}`);
  }
  throw new Error("the plan did not end within twelve stages");
}

// Whether every issued order names its plan stage's skill and operation, in plan order.
async function followsPlan(route: string, issued: unknown[]) {
  const stages = await planStages(route);
  let position = -1;
  for (const document of issued) {
    const kind = field(document, "workOrder.stageKind");
    const index = stages.findIndex((stage, at) => at > position && stage.kind === kind);
    const stage = stages[index];
    if (!stage) return false;
    const skill = String(field(document, "workOrder.executor.skill"));
    if (!stage.skills.includes(skill)) return false;
    if (field(document, "workOrder.operation") !== stage.operation) return false;
    position = index;
  }
  return issued.length > 0;
}

const base = {
  expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
  observedRefs: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  protectedTargets: [],
  rationale: "The route the request needs.",
};

const PROPOSALS: Record<string, object> = {
  direct: {
    ...base,
    requestKind: "change",
    candidateRoute: "direct",
    goal: "Fix the typo in the README.",
    affectedFlowIds: [],
    proposedWriteScope: ["README.md"],
    requiredStages: ["maintenance", "verify"],
  },
  bugfix: {
    ...base,
    requestKind: "change",
    candidateRoute: "bugfix",
    goal: "A sixth address is accepted again; refuse it.",
    affectedFlowIds: [FLOW_ID],
    proposedWriteScope: ["src/**", "tests/**"],
    requiredStages: ["diagnose", "verify"],
  },
  "bounded-change": {
    ...base,
    requestKind: "change",
    candidateRoute: "bounded-change",
    goal: "Allow ten notification addresses per customer.",
    affectedFlowIds: [FLOW_ID],
    proposedWriteScope: [".qfai/spec/02_business-flow/**", "src/**", "tests/**"],
    requiredStages: ["sdd_delta", "implement", "verify"],
  },
  feature: {
    ...base,
    requestKind: "change",
    candidateRoute: "feature",
    goal: "Let a customer mark one address as preferred.",
    affectedFlowIds: [],
    newStories: [
      {
        goal: "Mark a preferred address",
        covers: ["one preferred address per customer"],
        excludes: ["sending the notifications"],
        evidence: ["No story of the flow names a preferred address."],
        flowId: FLOW_ID,
      },
    ],
    proposedWriteScope: [".qfai/spec/02_business-flow/**", "src/**", "tests/**"],
    requiredStages: ["sdd", "implement", "verify"],
  },
  discovery: DISCOVERY_PROPOSAL,
};

async function driven(route: string) {
  const root = await initProject();
  await seedFlow(root);
  await write(root, "README.md", "# Notifications\n\nYou recieve one email per address.\n");
  commitAll(root);
  const proposal = PROPOSALS[route] ?? {};
  const { runId, routed } = await routedRun(root, proposal);
  for (const question of list(routed.json, "questions")) {
    await answer(root, runId, question, "proceed");
  }
  const { issued, last } = await drive(root, runId);
  return {
    followsPlan: await followsPlan(route, issued),
    ends: [
      field(last, "workOrder.stageKind") ?? null,
      field(last, "workOrder.executor.skill") ?? null,
    ],
    state: field(last, "run.state"),
  };
}

for (const route of ["direct", "bugfix", "bounded-change", "feature"]) {
  it(`the ${route} plan runs in plan order from next and accept alone, until next returns no work order`, async () => {
    expect(await driven(route)).toEqual({ followsPlan: true, ends: [null, null], state: "ready" });
  }, 300_000);
}

it("the discovery plan hands the run back to routing, which qfai-run handles itself", async () => {
  expect(await driven("discovery")).toEqual({
    followsPlan: true,
    ends: ["route", "qfai-run"],
    state: "routing",
  });
}, 300_000);
