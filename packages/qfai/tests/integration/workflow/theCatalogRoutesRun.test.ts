// QFAI:AC-0001-0220-08
// QFAI:AC-0001-0214-01
// QFAI:AC-0001-0214-02
// QFAI:AC-0001-0215-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { planFacts } from "../../../src/core/workflow/observe.js";
import { extractionFor } from "../../helpers/workflowExtraction.js";

type Snapshot = Parameters<typeof decide>[0];
type Facts = Parameters<typeof decide>[2];
type Result = NonNullable<Parameters<typeof decide>[1]["result"]>;
type Proposal = NonNullable<Result["proposal"]>;
type WorkOrder = NonNullable<Snapshot["outstandingWorkOrder"]>;

const FLOWS = ["BF-0001", "BF-0003"];

async function plannedStages(route: string) {
  const stages = (await planFacts())[route]?.stages;
  if (!stages) throw new Error(`no shipped plan ${route}`);
  return stages;
}

async function planOf(route: string, writeScope: string[]): Promise<NonNullable<Snapshot["plan"]>> {
  return { route, writeScope, stages: await plannedStages(route) };
}

function proposal(route: string, flows: string[], scope: string[] = []): Proposal {
  return {
    requestKind: "routed",
    extraction: extractionFor(route),
    goal: "Serve the request.",
    expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
    observedRefs: [],
    affectedFlowIds: flows,
    riskSignals: [],
    unresolvedQuestions: [],
    newStories: [],
    proposedWriteScope: scope,
    protectedTargets: [],
    rationale: "The request names what it needs.",
  };
}

// `accept` of a routing result proposing the route.
async function routed(route: string, flows: string[], scope: string[] = []) {
  const snapshot: Snapshot = {
    run: { id: "run-20260928000000001", state: "routing", sequence: 2 },
    outstandingWorkOrder: {
      workOrderId: "work-order-route-1",
      stageInstanceId: "route",
      attempt: 1,
      stageKind: "route",
    },
  };
  const facts: Facts = { plans: await planFacts(), flows: FLOWS };
  const result: Result = {
    resultId: `route-${route}`,
    workOrderId: "work-order-route-1",
    stageInstanceId: "route",
    attempt: 1,
    expectedSequence: 2,
    outcome: "accepted",
    testObservation: "not_applicable",
    proposal: proposal(route, flows, scope),
  };
  return decide(snapshot, { operation: "accept", result }, facts);
}

function bound(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  if (error) return error.code === "proposal-refused" ? error.reasons : error.code;
  return decision.events.flatMap((event) => (event.flowId ? [event.flowId] : []));
}

// A run in `ready` on a shipped plan, with the stages before `accepted` already in.
async function readyOn(route: string, accepted: number, extra: Partial<Snapshot> = {}) {
  const plan = await planOf(route, extra.plan?.writeScope ?? []);
  const snapshot: Snapshot = {
    run: { id: "run-20260928000000002", state: "ready", sequence: 10 },
    ...extra,
    plan,
    acceptedStages: plan.stages.slice(0, accepted).map((stage) => ({
      stageInstanceId: stage.stageInstanceId,
      stageKind: stage.stageKind,
      outcome: "accepted",
    })),
  };
  return snapshot;
}

// `next` on the snapshot, and the running snapshot its work order leaves.
function issued(snapshot: Snapshot): { running: Snapshot; workOrder: WorkOrder } {
  const decision = decide(snapshot, { operation: "next" }, {});
  const workOrder = decision.verdict.workOrder;
  const run = decision.verdict.run;
  if (!workOrder || !run) throw new Error(`next issued nothing: ${JSON.stringify(decision)}`);
  return { running: { ...snapshot, run, outstandingWorkOrder: workOrder }, workOrder };
}

function resultFor(running: Snapshot, workOrder: WorkOrder, extra: Partial<Result>): Result {
  return {
    resultId: `result-${workOrder.stageInstanceId}`,
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    expectedSequence: running.run.sequence,
    outcome: "accepted",
    testObservation: "not_applicable",
    ...extra,
  };
}

function accepted(running: Snapshot, workOrder: WorkOrder, extra: Partial<Result>) {
  const result = resultFor(running, workOrder, extra);
  const decision = decide(running, { operation: "accept", result }, {});
  const error = decision.verdict.error;
  return error ? (error.code === "invalid-input" ? error.reasons : error.code) : "accepted";
}

// QFAI:EX-0001-0220-40
it("Checked proposals with no new story bind the flow their route takes", async () => {
  const answer = await routed("answer-question", ["BF-0001"]);
  const plan = answer.verdict.plan;
  const ready = await readyOn("answer-question", 0);
  const first = issued(ready).workOrder;

  expect({
    fixDefect: bound(await routed("fix-defect", ["BF-0001"], ["src/**"])),
    fixDefectNone: bound(await routed("fix-defect", [], ["src/**"])),
    repairTest: bound(await routed("repair-test", ["BF-0003"], ["tests/**"])),
    repairTestNone: bound(await routed("repair-test", [], ["tests/**"])),
    answer: bound(answer),
    answerRoute: plan?.route,
    target: first.target,
  }).toEqual({
    fixDefect: ["BF-0001"],
    fixDefectNone: [{ reason: "flow-binding", subject: "affectedFlowIds" }],
    repairTest: ["BF-0003"],
    repairTestNone: [],
    answer: [],
    answerRoute: "answer-question",
    target: undefined,
  });
});

// QFAI:EX-0001-0185-40
it("A route that ends at triage-close admits the discussion records, not DESIGN.md", async () => {
  expect({
    records: bound(await routed("decide-acceptance", [], [".qfai/discussion/**"])),
    design: bound(await routed("decide-acceptance", [], [".qfai/discussion/**", "DESIGN.md"])),
  }).toEqual({
    records: [],
    design: [{ reason: "scope-escape", subject: "DESIGN.md" }],
  });
});

// QFAI:EX-0001-0214-02
it("An answer-question proposal naming a source file, and an answer that changed a file", async () => {
  const { running, workOrder } = issued(await readyOn("answer-question", 0));

  expect({
    proposal: bound(await routed("answer-question", [], ["src/report.ts"])),
    writeAreas: workOrder.scope?.writeAreas,
    result: accepted(running, workOrder, {
      changedFiles: [{ path: "README.md", digest: "a".repeat(64) }],
      closure: { outcome: "answered", followUps: [] },
    }),
  }).toEqual({
    proposal: [{ reason: "scope-escape", subject: "src/report.ts" }],
    writeAreas: [],
    result: [{ reason: "write-scope", subject: "README.md" }],
  });
});

// QFAI:EX-0001-0215-02
it("The read-only recheck of a retriage-bundle run", async () => {
  const snapshot = await readyOn("retriage-bundle", 0, {
    plan: { route: "retriage-bundle", stages: [], writeScope: ["src/**"] },
  });
  const { running, workOrder } = issued(snapshot);

  expect({
    step: workOrder.steps?.[0],
    writeAreas: workOrder.scope?.writeAreas,
    changed: accepted(running, workOrder, {
      changedFiles: [{ path: "src/app.ts", digest: "b".repeat(64) }],
    }),
    recorded: accepted(running, workOrder, {
      artifactRefs: [{ path: ".qfai/evidence/retriage-bundle.md", digest: "c".repeat(64) }],
    }),
  }).toEqual({
    step: {
      name: "implement-diagnose",
      path: ".qfai/assistant/step/implement-diagnose/STEP.md",
      mode: "read-only",
      passThrough: false,
      decisionPoint: null,
      branchPoint: false,
    },
    writeAreas: [],
    changed: [{ reason: "write-scope", subject: "src/app.ts" }],
    recorded: "accepted",
  });
});

const CLOSURE = {
  outcome: "answered",
  followUps: [
    {
      goal: "Document the report directory option.",
      reason: "The answer found the option missing from the documentation.",
    },
  ],
};

// QFAI:EX-0001-0214-03
it("An answer-question run whose answer shows the documentation lacks the option", async () => {
  const { running, workOrder } = issued(await readyOn("answer-question", 0));
  const result = resultFor(running, workOrder, { closure: CLOSURE });
  const decision = decide(running, { operation: "accept", result }, {});

  expect({
    state: decision.verdict.run?.state,
    closure: decision.events[0]?.closure,
    steps: decision.events.map((event) => event.type),
    unclosed: accepted(running, workOrder, {}),
  }).toEqual({
    state: "ready",
    closure: CLOSURE,
    steps: ["accept-nonfinal-result"],
    unclosed: [{ reason: "schema", subject: "closure" }],
  });
});

// QFAI:AC-0001-0214-07
// QFAI:EX-0001-0214-09
it("A question's one work order runs every step of its route and names no reviewer", async () => {
  const HEAVY = ["completion-reviewer", "architecture-reviewer", "requirements-reviewer"];
  const facts: Facts = {
    reviewerRoles: {
      "triage-answer": ["completion-reviewer"],
      "triage-close": ["completion-reviewer"],
    },
    heavyReviewerRoles: [...HEAVY, "implementation-reviewer"],
  };
  const order = async (route: string, modifiers: Snapshot["modifiers"] = []) => {
    const snapshot = { ...(await readyOn(route, 0)), modifiers };
    const decision = decide(snapshot, { operation: "next" }, facts);
    return decision.verdict.workOrder;
  };
  const heavy: Snapshot["modifiers"] = [{ modifier: "review:heavy", source: "extraction" }];

  const answer = await order("answer-question");
  const investigate = await order("investigate-question");
  const heavyAnswer = await order("answer-question", heavy);

  expect({
    answer: answer?.steps?.map((step) => step.name),
    investigate: investigate?.steps?.map((step) => step.name),
    answerReviewers: answer?.requiredReviewerRoles,
    investigateReviewers: investigate?.requiredReviewerRoles,
    heavyReviewers: heavyAnswer?.requiredReviewerRoles,
  }).toEqual({
    answer: ["triage-answer", "triage-close"],
    investigate: ["triage-investigate", "triage-answer", "triage-close"],
    answerReviewers: undefined,
    investigateReviewers: undefined,
    heavyReviewers: [...HEAVY, "implementation-reviewer"],
  });
});

// QFAI:EX-0001-0214-01
it("finish on an answer-question run that ran no verify stage", async () => {
  const snapshot: Snapshot = {
    ...(await readyOn("answer-question", 1)),
    completionTarget: "qfai_done",
    baseline: { findings: [], toolVersion: "2.0.0", cliEntryDigest: "d", policyDigests: {} },
  };
  const completion: NonNullable<Facts["completion"]> = {
    validate: { failOn: "error", findings: [] },
    toolVersion: "2.0.0",
    cliEntryDigest: "d",
    policyDigests: {},
    changedPaths: [],
    uncommittedPaths: [],
  };
  const decision = decide(snapshot, { operation: "finish" }, { completion });

  expect({ state: decision.verdict.run?.state, unmet: decision.verdict.unmet }).toEqual({
    state: "completed",
    unmet: [],
  });
});

const CHANGE_NOTE_PASS = {
  passes: [
    {
      step: "verify-change-note",
      reason: "Nothing a user sees changed.",
      evidenceRef: ".qfai/evidence/verify-change-note.md",
    },
  ],
};

// QFAI:EX-0001-0216-06
it("A change-compatibility verify passing the change note, and an edit-text one", async () => {
  const compatibility = issued(
    await readyOn("change-compatibility", 3, { flowBinding: { flowId: "BF-0001" } }),
  );
  const editText = issued(await readyOn("edit-text", 1));

  expect({
    compatibility: accepted(compatibility.running, compatibility.workOrder, CHANGE_NOTE_PASS),
    editText: accepted(editText.running, editText.workOrder, CHANGE_NOTE_PASS),
  }).toEqual({
    compatibility: [{ reason: "pass-obligation-open", subject: "verify-change-note" }],
    editText: "accepted",
  });
});
