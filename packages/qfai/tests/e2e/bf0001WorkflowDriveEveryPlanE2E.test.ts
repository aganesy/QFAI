// QFAI:BF-0001
/**
 * E2E: `qfai-run` drives each built-in plan with `next` and `accept` alone.
 *
 * On a `qfai init` project, a run on each of these plans is fed canned accepted results, every
 * branch point continuing. Every work order `next` issues names the steps its plan gives that
 * stage, in plan order, until `next` returns `workOrder: null`, whether the route ends in the
 * verify block or at `triage-close`. The operator types no stage name; the only input they give
 * is an answer to a question.
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
  stepNames,
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
  steps: string[];
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}

// The step a plan entry names: a bare name, or the `step` of an entry marking it pass-through.
function stepOf(entry: unknown): string[] {
  const step = typeof entry === "string" ? entry : record(entry).step;
  return typeof step === "string" ? [step] : [];
}

// The stages of the package's plan for `route`, in plan order, with every step each runs.
async function planStages(route: string): Promise<PlanStage[]> {
  const plan = record(parseYaml(await readFile(path.join(PLANS, `${route}.yml`), "utf8")));
  return (Array.isArray(plan.stages) ? plan.stages : []).map((stage) => {
    const { kind, steps } = record(stage);
    return {
      kind: String(kind),
      steps: (Array.isArray(steps) ? steps : []).flatMap(stepOf),
    };
  });
}

// What a stage submits when it has nothing to report beyond being done.
const REPORT = ".qfai/report/stage-record.md";

async function cannedResult(root: string, issued: unknown, step: number) {
  const kind = field(issued, "workOrder.stageKind");
  const extra: Record<string, unknown> = {};
  if (kind === "sdd" && field(issued, "workOrder.target.kind") === "new_story") {
    const slotId = field(issued, "workOrder.target.slotId");
    extra.bindings = [{ slotId, flowId: FLOW_ID, storyIds: ["US-0001-0002"] }];
  }
  if (stepNames(issued).includes("implement-diagnose")) {
    extra.diagnosis = {
      verdict: "missing-test",
      reproductionRef: REPORT,
      matchedIds: [EXAMPLE_IDS[0]],
    };
  }
  if (stepNames(issued).includes("triage-close")) {
    extra.closure = { outcome: "decided", followUps: [] };
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
    if (kind === undefined) return { issued, last: next.json };
    issued.push(next.json);
    const accepted = await submit(root, runId, "accept", await cannedResult(root, next.json, step));
    if (field(accepted.json, "ok") !== true) throw new Error(`${String(kind)}: ${accepted.stdout}`);
  }
  throw new Error("the plan did not end within twelve stages");
}

// Whether every issued order names its plan stage's steps, in plan order.
async function followsPlan(route: string, issued: unknown[]) {
  const stages = await planStages(route);
  let position = -1;
  for (const document of issued) {
    const kind = field(document, "workOrder.stageKind");
    const index = stages.findIndex((stage, at) => at > position && stage.kind === kind);
    const stage = stages[index];
    if (!stage) return false;
    if (JSON.stringify(stepNames(document)) !== JSON.stringify(stage.steps)) return false;
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
  "edit-text": {
    ...base,
    requestKind: "change",
    candidateRoute: "edit-text",
    goal: "Fix the typo in the README.",
    affectedFlowIds: [],
    proposedWriteScope: ["README.md"],
  },
  "fix-defect": {
    ...base,
    requestKind: "change",
    candidateRoute: "fix-defect",
    goal: "A sixth address is accepted again; refuse it.",
    affectedFlowIds: [FLOW_ID],
    proposedWriteScope: ["src/**", "tests/**"],
  },
  "add-feature": {
    ...base,
    requestKind: "change",
    candidateRoute: "add-feature",
    goal: "Allow ten notification addresses per customer.",
    affectedFlowIds: [FLOW_ID],
    proposedWriteScope: [".qfai/spec/02_business-flow/**", "src/**", "tests/**"],
  },
  "add-feature with a new story": {
    ...base,
    requestKind: "change",
    candidateRoute: "add-feature",
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
  },
  "decide-design": DISCOVERY_PROPOSAL,
};

async function driven(route: string, plan = route) {
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
    followsPlan: await followsPlan(plan, issued),
    kinds: issued.map((document) => field(document, "workOrder.stageKind")),
    ends: [
      field(last, "workOrder.stageKind") ?? null,
      field(last, "workOrder.executor.skill") ?? null,
    ],
    state: field(last, "run.state"),
  };
}

// The stages each route issues, every stage of its plan in plan order.
const ISSUED: [string, string, string[]][] = [
  ["edit-text", "edit-text", ["maintenance", "verify"]],
  ["fix-defect", "fix-defect", ["diagnose", "sdd_append", "acceptance", "implement", "verify"]],
  ["add-feature", "add-feature", ["sdd", "acceptance", "implement", "maintenance", "verify"]],
  [
    "add-feature with a new story",
    "add-feature",
    ["sdd", "acceptance", "implement", "maintenance", "verify"],
  ],
  ["decide-design", "decide-design", ["discussion", "triage"]],
];

for (const [route, plan, kinds] of ISSUED) {
  it(`the ${route} plan runs in plan order from next and accept alone, until next returns no work order`, async () => {
    expect(await driven(route, plan)).toEqual({
      followsPlan: true,
      kinds,
      ends: [null, null],
      state: "ready",
    });
  }, 300_000);
}
