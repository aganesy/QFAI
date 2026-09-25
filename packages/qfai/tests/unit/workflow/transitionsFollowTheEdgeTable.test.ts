// QFAI:SPEC-0018:TC-0018-0141
// QFAI:SPEC-0018:TC-0018-0142
// QFAI:SPEC-0018:TC-0018-0143
// QFAI:SPEC-0018:TC-0018-0144
// QFAI:SPEC-0018:TC-0018-0145
// QFAI:SPEC-0018:TC-0018-0146
// QFAI:SPEC-0018:TC-0018-0147
// QFAI:SPEC-0018:TC-0018-0148

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowDecision } from "../../../src/core/workflow/decide.js";
import { finishPlan, metFacts, readySnapshot } from "./finishFixture.js";

type Snapshot = Parameters<typeof decide>[0];
type Facts = Parameters<typeof decide>[2];

const specBinding = { specId: "spec-0007" };

const harness = {
  host: "claude-code",
  capabilities: {
    fetchSkillBody: true,
    invokeStage: true,
    delegateSubAgent: true,
    relayQuestion: true,
    runShellAndTests: true,
    writeProjectRoot: true,
    keepRunRecord: true,
    resume: true,
  },
};

const startFacts: Facts = {
  start: {
    runId: "run-20260925000000001",
    qfaiVersion: "2.0.0",
    digestKey: "b".repeat(64),
    policyDigests: {},
    manifestDigests: {},
    planDigests: {},
  },
};

const routingWorkOrder = {
  workOrderId: "routing-1",
  stageInstanceId: "routing-stage-1",
  attempt: 1,
  stageKind: "routing",
};

const routingFacts: Facts = {
  plans: { "bounded-change": { route: "bounded-change", stages: finishPlan.stages } },
};

function routingProposal(
  newCapabilities: {
    goal: string;
    covers: string[];
    excludes: string[];
    evidence: string[];
  }[] = [],
) {
  return {
    requestKind: "change",
    candidateRoute: "bounded-change",
    goal: "Return 404 for a missing export.",
    expectedBehaviorRefs: [{ kind: "request" as const, ref: "request" }],
    observedRefs: [],
    affectedSpecIds: [],
    riskSignals: [],
    unresolvedQuestions: [],
    newCapabilities,
    proposedWriteScope: ["src/notify/**"],
    protectedTargets: [],
    requiredStages: ["sdd_delta", "implement", "verify"],
  };
}

function acceptRouting(outcome: string, proposal?: ReturnType<typeof routingProposal>) {
  return decide(
    {
      run: { id: "run-routing", state: "routing", sequence: 2 },
      outstandingWorkOrder: routingWorkOrder,
    },
    {
      operation: "accept",
      result: {
        resultId: `routing-result-${outcome}`,
        workOrderId: routingWorkOrder.workOrderId,
        stageInstanceId: routingWorkOrder.stageInstanceId,
        attempt: routingWorkOrder.attempt,
        expectedSequence: 2,
        outcome,
        ...(proposal ? { proposal } : {}),
      },
    },
    routingFacts,
  );
}

function readyRun(sequence = 4): Snapshot {
  return { run: { id: "run-edge", state: "ready", sequence }, plan: finishPlan, specBinding };
}

// The bounded plan's first work order, issued, and the run that holds it.
function runningRun(): Snapshot & {
  outstandingWorkOrder: NonNullable<WorkflowDecision["verdict"]["workOrder"]>;
} {
  const issued = decide(readyRun(), { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the ready run issues its first work order");
  return { ...readyRun(), run, outstandingWorkOrder: workOrder };
}

function acceptStage(outcome: string, extra: Record<string, unknown> = {}) {
  const snapshot = runningRun();
  const workOrder = snapshot.outstandingWorkOrder;
  return decide(
    snapshot,
    {
      operation: "accept",
      result: {
        resultId: `result-${outcome}`,
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: snapshot.run.sequence,
        outcome,
        ...extra,
      },
    },
    {},
  );
}

const proceedOrReplan = {
  questionId: "question-5-1",
  kind: "decision" as const,
  text: "Keep the retry policy?",
  options: [
    {
      optionId: "keep",
      label: "Keep it",
      description: "The plan runs as is.",
      effect: "proceed" as const,
    },
    {
      optionId: "narrow",
      label: "Narrow it",
      description: "The run plans again.",
      effect: "replan" as const,
    },
  ],
  selection: { min: 1, max: 1 },
};

function answer(optionId: string) {
  return decide(
    {
      run: { id: "run-answer", state: "awaiting_input", sequence: 5 },
      plan: finishPlan,
      specBinding,
      scopeDigest: "d".repeat(64),
      openQuestions: [proceedOrReplan],
    },
    {
      operation: "decision",
      questionId: proceedOrReplan.questionId,
      answer: { optionIds: [optionId] },
      answeredBy: "operator",
      expectedSequence: 5,
    },
    { now: "2026-09-25T00:00:00.000Z" },
  );
}

function edge(decision: WorkflowDecision) {
  return { state: decision.verdict.run?.state, events: decision.events.map((event) => event.type) };
}

it("TC-0018-0141 (TDD-0163): capture-request", () => {
  const started = decide(
    null,
    { operation: "start", request: { text: "Fix it." }, harness },
    startFacts,
  );
  const resumed = decide(
    { run: { id: "run-crashed", state: "created", sequence: 1 } },
    { operation: "resume" },
    {},
  );

  expect([edge(started), edge(resumed)]).toEqual([
    { state: "routing", events: ["run-created", "capture-request"] },
    { state: "routing", events: ["capture-request"] },
  ]);
});

it("TC-0018-0141 (TDD-0164): plan-accepted", () => {
  expect(edge(acceptRouting("accepted", routingProposal()))).toEqual({
    state: "ready",
    events: ["plan-accepted"],
  });
});

it("TC-0018-0141 (TDD-0165): unsettled-material-input", () => {
  const capability = {
    goal: "Export retries",
    covers: ["Retry a failed export"],
    excludes: [],
    evidence: ["request"],
  };

  expect(edge(acceptRouting("accepted", routingProposal([capability])))).toEqual({
    state: "awaiting_input",
    events: ["question-opened", "unsettled-material-input"],
  });
});

it("TC-0018-0141 (TDD-0166): missing-capability", () => {
  expect(edge(acceptRouting("blocked"))).toEqual({
    state: "blocked",
    events: ["missing-capability"],
  });
});

it("TC-0018-0141 (TDD-0167): dispatch-work-order", () => {
  const issued = ["work-order-issued", "dispatch-work-order"];

  expect([
    edge(decide(readyRun(), { operation: "next" }, {})),
    edge(decide(readyRun(), { operation: "resume" }, {})),
  ]).toEqual([
    { state: "running", events: issued },
    { state: "running", events: issued },
  ]);
});

it("TC-0018-0141 (TDD-0168): required-plan-revision", () => {
  const snapshot = { ...readyRun(), routingReceiptRef: "receipts/routing-1.json" };
  const facts: Facts = { receiptValidity: { "receipts/routing-1.json": "stale" } };
  const revised = { state: "routing", events: ["required-plan-revision"] };

  expect([
    edge(decide(snapshot, { operation: "next" }, facts)),
    edge(decide(snapshot, { operation: "resume" }, facts)),
  ]).toEqual([revised, revised]);
});

it("TC-0018-0141 (TDD-0169): validated-final-result-and-target", () => {
  expect(edge(decide(readySnapshot(), { operation: "finish" }, metFacts()))).toEqual({
    state: "completed",
    events: ["validated-final-result-and-target"],
  });
});

it("TC-0018-0141 (TDD-0170): accept-nonfinal-result", () => {
  expect(edge(acceptStage("accepted"))).toEqual({
    state: "ready",
    events: ["accept-nonfinal-result"],
  });
});

it("TC-0018-0141 (TDD-0171): material-decision", () => {
  const featurePlan = {
    route: "feature",
    stages: [
      { stageInstanceId: "feature-sdd", stageKind: "sdd" },
      { stageInstanceId: "feature-verify", stageKind: "verify" },
    ],
  };
  const unrecordedApproval = {
    kind: "human_decision",
    operation: "CREATE",
    effect: "proceed",
    target: {
      kind: "new_capability",
      slotId: "slot-3-1",
      capability: { goal: "Export retries", covers: ["Retry a failed export"], excludes: [] },
    },
  };
  const atIssue = decide(
    {
      run: { id: "run-feature", state: "ready", sequence: 4 },
      plan: featurePlan,
      approval: unrecordedApproval,
    },
    { operation: "next" },
    {},
  );
  const { questionId: _opened, ...questionInput } = proceedOrReplan;
  const atAccept = acceptStage("awaiting_input", { questions: [questionInput] });
  const waiting = { state: "awaiting_input", events: ["question-opened", "material-decision"] };

  expect([edge(atIssue), edge(atAccept)]).toEqual([waiting, waiting]);
});

it("TC-0018-0141 (TDD-0172): unrun-or-unresolved-dependency", () => {
  const blocked = { state: "blocked", events: ["unrun-or-unresolved-dependency"] };

  expect([edge(acceptStage("unrun")), edge(acceptStage("blocked"))]).toEqual([blocked, blocked]);
});

it("TC-0018-0141 (TDD-0173): observed-session-interruption", () => {
  expect(edge(decide(runningRun(), { operation: "resume" }, {}))).toEqual({
    state: "running",
    events: ["observed-session-interruption", "reconciled-resume", "dispatch-work-order"],
  });
});

it("TC-0018-0141 (TDD-0174): scope-or-obligation-revision", () => {
  const bugfixPlan = {
    route: "bugfix",
    stages: [
      ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only"],
      ["bugfix-implement", "implement", "qfai-implement", "implement"],
      ["bugfix-verify", "verify", "qfai-verify", "verify-full"],
    ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
      stageInstanceId,
      stageKind,
      skill,
      operation,
      when: "always",
    })),
  };
  const ready = {
    run: { id: "run-bugfix", state: "ready", sequence: 4 },
    plan: bugfixPlan,
    specBinding,
  };
  const issued = decide(ready, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const running = issued.verdict.run;
  if (!workOrder || !running) throw new Error("the bugfix run issues its diagnose work order");
  const accepted = decide(
    { ...ready, run: running, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-diagnose",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: running.sequence,
        outcome: "accepted",
        diagnosis: {
          verdict: "expectation-differs",
          reproductionRef: "evidence/reproduction.json",
          matchedRowIds: ["TDD-0004"],
        },
      },
    },
    {},
  );

  expect(edge(accepted)).toEqual({ state: "routing", events: ["scope-or-obligation-revision"] });
});

it("TC-0018-0141 (TDD-0175): valid-answer-no-replan", () => {
  expect(edge(answer("keep"))).toEqual({
    state: "ready",
    events: ["authorization-recorded", "valid-answer-no-replan"],
  });
});

it("TC-0018-0141 (TDD-0176): answer-changes-scope", () => {
  expect(edge(answer("narrow"))).toEqual({
    state: "routing",
    events: ["authorization-recorded", "answer-changes-scope"],
  });
});

it("TC-0018-0141 (TDD-0177): blocker-cleared-and-revalidated", () => {
  const blocked = {
    ...readyRun(),
    run: { id: "run-edge", state: "blocked", sequence: 7 },
    attempts: { "bounded-sdd-delta": 1 },
  };
  const resumed = decide(blocked, { operation: "resume" }, {});

  expect({ ...edge(resumed), attempt: resumed.verdict.workOrder?.attempt }).toEqual({
    state: "running",
    events: ["blocker-cleared-and-revalidated", "work-order-issued", "dispatch-work-order"],
    attempt: 2,
  });
});

it("TC-0018-0141 (TDD-0178): reconciled-resume", () => {
  const resumed = decide(runningRun(), { operation: "resume" }, {});

  expect(edge(resumed).events.slice(0, 2)).toEqual([
    "observed-session-interruption",
    "reconciled-resume",
  ]);
});

it("TC-0018-0141 (TDD-0179): reconciled-with-blocker", () => {
  const resumed = decide(runningRun(), { operation: "resume" }, { cause: "policy-drift" });

  expect({ ...edge(resumed), workOrder: resumed.verdict.workOrder }).toEqual({
    state: "blocked",
    events: ["observed-session-interruption", "reconciled-with-blocker"],
    workOrder: undefined,
  });
});

// The refusal code and reasons, or the unmet conditions `finish` lists.
function refusalOrUnmet(decision: WorkflowDecision) {
  const { run, error, unmet } = decision.verdict;
  const reasons = error && "reasons" in error ? (error.reasons ?? []).map((r) => r.reason) : [];
  return {
    state: run?.state,
    events: decision.events,
    named: error ? [error.code, ...reasons] : (unmet ?? []).map((entry) => entry.condition),
  };
}

function inState(state: string): Snapshot {
  const completionTarget = "qfai_done" as const;
  switch (state) {
    case "created":
      return { run: { id: "run-edge", state, sequence: 1 }, completionTarget };
    case "routing":
      return {
        run: { id: "run-edge", state, sequence: 2 },
        outstandingWorkOrder: routingWorkOrder,
        completionTarget,
      };
    case "running":
    case "interrupted": {
      const running = runningRun();
      return { ...running, run: { ...running.run, state }, completionTarget };
    }
    case "awaiting_input":
      return {
        ...readyRun(5),
        run: { id: "run-edge", state, sequence: 5 },
        scopeDigest: "d".repeat(64),
        openQuestions: [proceedOrReplan],
        completionTarget,
      };
    default:
      return { ...readyRun(7), run: { id: "run-edge", state, sequence: 7 }, completionTarget };
  }
}

function operate(snapshot: Snapshot, operation: string) {
  const workOrder = snapshot.outstandingWorkOrder ?? {
    workOrderId: "work-order-unknown",
    stageInstanceId: "unknown",
    attempt: 1,
  };
  const inputs: Record<string, Parameters<typeof decide>[1]> = {
    next: { operation },
    resume: { operation },
    finish: { operation },
    decision: {
      operation,
      questionId: "question-9-9",
      answer: { optionIds: ["keep"] },
      answeredBy: "operator",
      expectedSequence: snapshot.run.sequence,
    },
    accept: {
      operation,
      result: {
        resultId: "result-no-edge",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: snapshot.run.sequence,
        outcome: "accepted",
      },
    },
  };
  const input = inputs[operation];
  if (!input) throw new Error(`no input for ${operation}`);
  return decide(snapshot, input, metFacts());
}

const noEdge: [string, string, string, string[]][] = [
  ["TC-0018-0142 (TDD-0180): next", "created", "next", ["invalid-input"]],
  ["TC-0018-0142 (TDD-0181): accept", "created", "accept", ["invalid-input", "work-order"]],
  ["TC-0018-0142 (TDD-0182): decision-answer", "created", "decision", ["no-open-question"]],
  ["TC-0018-0142 (TDD-0183): finish", "created", "finish", ["verify-missing"]],
  ["TC-0018-0143 (TDD-0184): decision-answer", "routing", "decision", ["no-open-question"]],
  ["TC-0018-0143 (TDD-0185): resume", "routing", "resume", ["invalid-input"]],
  ["TC-0018-0143 (TDD-0186): finish", "routing", "finish", ["verify-missing"]],
  ["TC-0018-0144 (TDD-0187): accept", "ready", "accept", ["invalid-input", "work-order"]],
  ["TC-0018-0144 (TDD-0188): decision-answer", "ready", "decision", ["no-open-question"]],
  ["TC-0018-0145 (TDD-0189): decision-answer", "running", "decision", ["no-open-question"]],
  ["TC-0018-0145 (TDD-0190): finish", "running", "finish", ["work-order-outstanding"]],
  ["TC-0018-0146 (TDD-0191): accept", "awaiting_input", "accept", ["invalid-input", "work-order"]],
  ["TC-0018-0146 (TDD-0192): resume", "awaiting_input", "resume", ["invalid-input"]],
  ["TC-0018-0146 (TDD-0193): finish", "awaiting_input", "finish", ["run-waiting"]],
  ["TC-0018-0147 (TDD-0194): accept", "blocked", "accept", ["invalid-input", "work-order"]],
  ["TC-0018-0147 (TDD-0195): decision-answer", "blocked", "decision", ["no-open-question"]],
  ["TC-0018-0147 (TDD-0196): finish", "blocked", "finish", ["run-waiting"]],
  ["TC-0018-0148 (TDD-0197): next", "interrupted", "next", ["invalid-input"]],
  ["TC-0018-0148 (TDD-0198): accept", "interrupted", "accept", ["invalid-input"]],
  ["TC-0018-0148 (TDD-0199): decision-answer", "interrupted", "decision", ["no-open-question"]],
  ["TC-0018-0148 (TDD-0200): finish", "interrupted", "finish", ["stage-unaccepted"]],
];

for (const [title, state, operation, named] of noEdge) {
  it(title, () => {
    const snapshot = inState(state);
    const outcome = refusalOrUnmet(operate(snapshot, operation));

    expect(outcome).toEqual({
      state,
      events: [],
      named: operation === "finish" ? expect.arrayContaining(named) : named,
    });
  });
}
