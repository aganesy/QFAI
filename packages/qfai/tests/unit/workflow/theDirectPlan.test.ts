// QFAI:EX-0001-0198-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowDecision } from "../../../src/core/workflow/decide.js";
import { planFacts } from "../../../src/core/workflow/observe.js";
import { CONFIG_DIGEST, TOOL_DIGEST, completion } from "./finishFixture.js";

type Snapshot = Parameters<typeof decide>[0];
type Facts = Parameters<typeof decide>[2];
type Run = NonNullable<WorkflowDecision["verdict"]["run"]>;
type Plan = NonNullable<WorkflowDecision["verdict"]["plan"]>;

const REQUEST = "Fix the typo 'recieve' in the module comment";
const MODULE = "src/notify/email.ts";

const startFacts: Facts = {
  start: {
    runId: "run-20260925000000002",
    qfaiVersion: "2.0.0",
    digestKey: "b".repeat(64),
    policyDigests: {},

    planDigests: {},
  },
};

const harness = {
  host: "claude-code",
  capabilities: Object.fromEntries(
    [
      "fetchSkillBody",
      "invokeStage",
      "delegateSubAgent",
      "relayQuestion",
      "runShellAndTests",
      "writeProjectRoot",
      "keepRunRecord",
      "resume",
    ].map((capability) => [capability, true]),
  ),
};

const proposal = {
  requestKind: "change",
  candidateRoute: "edit-text",
  goal: `${REQUEST}.`,
  expectedBehaviorRefs: [{ kind: "request" as const, ref: "request" }],
  observedRefs: [],
  affectedFlowIds: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  proposedWriteScope: [MODULE],
  protectedTargets: [],
};

// The completion gate's independent review, which the canned verify result carries.
const reviews = [
  {
    role: "qa-gatekeeper",
    agentInstance: "agent-qa-1",
    verdict: "PASS",
    reportRef: "reviews/qa-gatekeeper.json",
  },
];

const baseline = {
  findings: [],
  toolVersion: "2.0.0",
  cliEntryDigest: TOOL_DIGEST,
  policyDigests: { "qfai.config.yaml": CONFIG_DIGEST },
};

function accept(
  snapshot: Snapshot,
  resultId: string,
  facts: Facts = {},
  extra: { proposal?: typeof proposal; reviewResults?: typeof reviews } = {},
): WorkflowDecision {
  const workOrder = snapshot.outstandingWorkOrder;
  if (!workOrder) throw new Error("a work order is outstanding");
  const result = {
    resultId,
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    expectedSequence: snapshot.run.sequence,
    outcome: "accepted",
    ...extra,
  };
  return decide(snapshot, { operation: "accept", result }, facts);
}

// Starts a run for the request and routes it onto the shipped `edit-text` plan.
async function routedRun(record: (decision: WorkflowDecision) => Run) {
  const plans = await planFacts();
  const started = record(
    decide(null, { operation: "start", request: { text: REQUEST }, harness }, startFacts),
  );
  const routingWorkOrder = {
    workOrderId: "routing-1",
    stageInstanceId: "routing-stage-1",
    attempt: 1,
    stageKind: "route",
  };
  const routed = accept(
    { run: started, outstandingWorkOrder: routingWorkOrder },
    "result-route",
    { plans },
    { proposal },
  );
  const run = record(routed);
  const plan = routed.verdict.plan;
  if (!plan) throw new Error("the routing result is checked into the edit-text plan");
  return { run, plan };
}

// Issues and accepts each stage of the plan in turn, then finishes the run. Returns each issued
// work order's stage kind and step names.
function driveToFinish(record: (decision: WorkflowDecision) => Run, routed: Run, plan: Plan) {
  const base = { plan, completionTarget: "qfai_done" as const, baseline };
  const acceptedStages: NonNullable<Snapshot["acceptedStages"]> = [];
  const issuedSteps: [string, string[]][] = [];
  let run = routed;
  for (const stage of plan.stages) {
    const issued = decide({ ...base, run, acceptedStages }, { operation: "next" }, {});
    run = record(issued);
    const workOrder = issued.verdict.workOrder;
    if (!workOrder) throw new Error(`the ready run issues ${stage.stageInstanceId}`);
    issuedSteps.push([workOrder.stageKind, (workOrder.steps ?? []).map((step) => step.name)]);
    const reviewed = stage.stageKind === "verify" ? { reviewResults: reviews } : {};
    const snapshot = { ...base, run, acceptedStages, outstandingWorkOrder: workOrder };
    run = record(accept(snapshot, `result-${stage.stageKind}`, {}, reviewed));
    const { stageInstanceId, stageKind } = stage;
    acceptedStages.push({ stageInstanceId, stageKind, outcome: "accepted", ...reviewed });
  }
  const verifyReport = {
    runId: run.id,
    stageInstanceId: plan.stages.at(-1)?.stageInstanceId ?? "",
    status: "PASS",
    scope: "full",
  };
  const finishFacts: Facts = {
    completion: { ...completion(), verifyReport, changedPaths: [MODULE] },
  };
  record(decide({ ...base, run, acceptedStages }, { operation: "finish" }, finishFacts));
  return issuedSteps;
}

it("Drive an edit-text run from start to finish with canned accepted results", async () => {
  const decisions: WorkflowDecision[] = [];
  const record = (decision: WorkflowDecision) => {
    decisions.push(decision);
    const run = decision.verdict.run;
    if (!run) throw new Error("every step returns the run");
    return run;
  };
  const { run, plan } = await routedRun(record);
  const issuedSteps = driveToFinish(record, run, plan);

  const states = decisions.flatMap((decision) => {
    const created = decision.events.some((event) => event.type === "run-created");
    const state = decision.verdict.run?.state ?? "none";
    return created ? ["created", state] : [state];
  });
  expect({ route: plan.route, issuedSteps, states }).toEqual({
    route: "edit-text",
    issuedSteps: [
      ["maintenance", ["maintain-edit"]],
      ["verify", ["verify-change-note", "verify-context", "verify-qfai-gate", "verify-repo-gate"]],
    ],
    states: ["created", "routing", "ready", "running", "ready", "running", "ready", "completed"],
  });
});
