// QFAI:EX-0001-0198-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowDecision } from "../../../src/core/workflow/decide.js";
import { CONFIG_DIGEST, TOOL_DIGEST, completion } from "./finishFixture.js";

type Snapshot = Parameters<typeof decide>[0];
type Facts = Parameters<typeof decide>[2];

const directStages = [
  ["direct-edit", "maintenance", "qfai-maintain", "non-normative-edit"],
  ["direct-verify", "verify", "qfai-verify", "verify-full"],
].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
  stageInstanceId,
  stageKind,
  skill,
  operation,
  when: "always",
}));

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
  candidateRoute: "direct",
  goal: "Fix a typo in the README.",
  expectedBehaviorRefs: [{ kind: "request" as const, ref: "request" }],
  observedRefs: [],
  affectedFlowIds: [],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  proposedWriteScope: ["README.md"],
  protectedTargets: [],
  requiredStages: ["maintenance", "verify"],
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

it("Drive a direct run from start to finish with canned accepted results", () => {
  const decisions: WorkflowDecision[] = [];
  const record = (decision: WorkflowDecision) => {
    decisions.push(decision);
    const run = decision.verdict.run;
    if (!run) throw new Error("every step returns the run");
    return run;
  };
  const started = record(
    decide(null, { operation: "start", request: { text: "Fix a typo." }, harness }, startFacts),
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
    { plans: { direct: { route: "direct", stages: directStages } } },
    { proposal },
  );
  let run = record(routed);
  const plan = routed.verdict.plan;
  if (!plan) throw new Error("the routing result is checked into the direct plan");
  const base = {
    plan,
    flowBinding: { flowId: "BF-0007" },
    completionTarget: "qfai_done" as const,
    baseline: {
      findings: [],
      toolVersion: "2.0.0",
      cliEntryDigest: TOOL_DIGEST,
      policyDigests: { "qfai.config.yaml": CONFIG_DIGEST },
    },
  };
  const acceptedStages: NonNullable<Snapshot["acceptedStages"]> = [];
  for (const stage of directStages) {
    const issued = decide({ ...base, run, acceptedStages }, { operation: "next" }, {});
    run = record(issued);
    const workOrder = issued.verdict.workOrder;
    if (!workOrder) throw new Error(`the ready run issues ${stage.stageInstanceId}`);
    const reviewed = stage.stageKind === "verify" ? { reviewResults: reviews } : {};
    const snapshot = { ...base, run, acceptedStages, outstandingWorkOrder: workOrder };
    run = record(accept(snapshot, `result-${stage.stageKind}`, {}, reviewed));
    acceptedStages.push({ ...stage, outcome: "accepted", ...reviewed });
  }
  const finishFacts: Facts = {
    completion: {
      ...completion(),
      verifyReport: {
        runId: run.id,
        stageInstanceId: "direct-verify",
        status: "PASS",
        scope: "full",
      },
      changedPaths: ["README.md"],
    },
  };
  record(decide({ ...base, run, acceptedStages }, { operation: "finish" }, finishFacts));

  const states = decisions.flatMap((decision) => {
    const created = decision.events.some((event) => event.type === "run-created");
    const state = decision.verdict.run?.state ?? "none";
    return created ? ["created", state] : [state];
  });
  expect(states).toEqual([
    "created",
    "routing",
    "ready",
    "running",
    "ready",
    "running",
    "ready",
    "completed",
  ]);
});
