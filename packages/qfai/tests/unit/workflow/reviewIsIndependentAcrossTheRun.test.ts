// QFAI:AC-0001-0194-04
// QFAI:EX-0001-0194-03
// QFAI:EX-0001-0194-08

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { JournalRun, planOf, readyWith, stage } from "./journalRun.js";

const plan = {
  route: "bounded-change",
  stages: [
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"],
    ["bounded-acceptance", "acceptance", "qfai-atdd", "author-acceptance-tests"],
    ["bounded-implement", "implement", "qfai-implement", "implement"],
    ["bounded-verify", "verify", "qfai-verify", "verify-full"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when: "always",
  })),
};
const flowBinding = { flowId: "BF-0007" };
const actorHistory = [
  { role: "author", agentInstance: "agent-atdd-1", stageInstanceId: "bounded-acceptance" },
  { role: "recommender", agentInstance: "agent-run-1", stageInstanceId: "routing" },
  { role: "reviewer", agentInstance: "agent-review-1", stageInstanceId: "bounded-sdd-delta" },
];
const firstAccepted = [
  { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
];

it("Issue work orders across a run with an author, a recommender and a reviewer recorded", () => {
  const first = decide(
    {
      run: { id: "run-actors", state: "ready", sequence: 6 },
      plan,
      flowBinding,
      acceptedStages: firstAccepted,
      actorHistory,
    },
    { operation: "next" },
    {},
  );
  const firstOrder = first.verdict.workOrder;
  const running = first.verdict.run;
  const accepted =
    firstOrder && running
      ? decide(
          {
            run: running,
            plan,
            flowBinding,
            acceptedStages: firstAccepted,
            actorHistory,
            outstandingWorkOrder: firstOrder,
          },
          {
            operation: "accept",
            result: {
              resultId: "result-acceptance",
              workOrderId: firstOrder.workOrderId,
              stageInstanceId: firstOrder.stageInstanceId,
              attempt: firstOrder.attempt,
              expectedSequence: running.sequence,
              outcome: "accepted",
            },
          },
          {},
        )
      : first;
  const second = accepted.verdict.run
    ? decide(
        {
          run: accepted.verdict.run,
          plan,
          flowBinding,
          acceptedStages: [
            ...firstAccepted,
            { stageInstanceId: "bounded-acceptance", stageKind: "acceptance", outcome: "accepted" },
          ],
          actorHistory,
        },
        { operation: "next" },
        {},
      )
    : accepted;

  expect(
    [first.verdict.workOrder, second.verdict.workOrder].map((order) => order?.actorHistory),
  ).toEqual([actorHistory, actorHistory]);
});

it("A review result whose reviewer instance the actor history shows as the author", () => {
  const run = { id: "run-actors", state: "running", sequence: 9 };
  const workOrder = {
    workOrderId: "work-order-bounded-implement-1",
    stageInstanceId: "bounded-implement",
    attempt: 1,
    stageKind: "implement",
    target: { kind: "flow" as const, flowId: "BF-0007" },
    executor: { skill: "qfai-implement" },
    operation: "implement",
  };
  const decision = decide(
    {
      run,
      plan,
      flowBinding,
      acceptedStages: [
        ...firstAccepted,
        { stageInstanceId: "bounded-acceptance", stageKind: "acceptance", outcome: "accepted" },
      ],
      actorHistory,
      outstandingWorkOrder: workOrder,
    },
    {
      operation: "accept",
      result: {
        resultId: "result-implement",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "accepted",
        reviewResults: [
          {
            role: "qa-gatekeeper",
            agentInstance: "agent-atdd-1",
            verdict: "PASS",
            reportRef: "evidence/review.json",
          },
        ],
      },
    },
    {},
  );
  const error = decision.verdict.error;

  expect({
    run: decision.verdict.run,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  }).toEqual({
    run,
    code: "invalid-input",
    reasons: [{ reason: "reviewer-not-independent", subject: "reviewResults[0]" }],
    events: [],
  });
});

// A bounded run driven through the journal, each result naming the agent that produced it, and
// its accepted routing result naming `recommender` when one is given.
function actorsRun(recommender?: string) {
  const flow = "BF-0007";
  const facts = {
    flows: [flow],
    obligations: {
      flowId: flow,
      ids: [flow],
      exampleIds: [],
      annotated: [],
      digest: "1".repeat(64),
    },
  };
  const plan = planOf("bounded-change", [
    stage("bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"),
    stage("bounded-implement", "implement", "qfai-implement", "implement"),
    stage("bounded-verify", "verify", "qfai-verify", "verify-full"),
  ]);
  const actor = recommender
    ? { actor: { role: "recommender" as const, agentInstance: recommender, stageInstanceId: "routing" } }
    : {};
  const seed = readyWith(plan, flow).map((record) =>
    record.event === "plan-accepted" ? { ...record, ...actor } : record,
  );
  const run = new JournalRun(seed);
  run.next(facts);
  run.accept({ actor: { agentInstance: "sdd-1" } }, facts);
  run.next(facts);
  run.accept({ actor: { agentInstance: "implement-1" } }, facts);
  return { run, workOrder: run.next(facts), facts };
}

const review = (agentInstance: string) => ({
  role: "qa-gatekeeper",
  agentInstance,
  verdict: "PASS",
  reportRef: "qa.md",
});

function reasonsOf(decision: ReturnType<JournalRun["accept"]>) {
  const error = decision.verdict.error;
  return error && "reasons" in error ? error.reasons : undefined;
}

it("The verify work order after two results that each named their actor", () => {
  const { workOrder } = actorsRun();

  expect(workOrder.actorHistory).toEqual([
    { role: "author", agentInstance: "sdd-1", stageInstanceId: "bounded-sdd-delta" },
    { role: "author", agentInstance: "implement-1", stageInstanceId: "bounded-implement" },
  ]);
});

it("A verify result reviewed by the instance that authored the implement stage", () => {
  const { run, facts } = actorsRun();

  expect(
    reasonsOf(
      run.accept(
        { actor: { agentInstance: "verify-1" }, reviewResults: [review("implement-1")] },
        facts,
      ),
    ),
  ).toEqual([{ reason: "reviewer-not-independent", subject: "reviewResults[0]" }]);
});

it("A verify result reviewed by the instance that produced the routing result", () => {
  const { run, facts } = actorsRun("run-1");

  expect(
    reasonsOf(
      run.accept({ actor: { agentInstance: "verify-1" }, reviewResults: [review("run-1")] }, facts),
    ),
  ).toEqual([{ reason: "reviewer-not-independent", subject: "reviewResults[0]" }]);
});

it("A verify result whose qa-gatekeeper review names the result's own actor", () => {
  const { run, facts } = actorsRun();

  expect(
    reasonsOf(
      run.accept(
        { actor: { agentInstance: "verify-1" }, reviewResults: [review("verify-1")] },
        facts,
      ),
    ),
  ).toEqual([{ reason: "reviewer-not-independent", subject: "reviewResults[0]" }]);
});

it("A verify result reviewed by an independent instance", () => {
  const { run, facts } = actorsRun();
  run.accept({ actor: { agentInstance: "verify-1" }, reviewResults: [review("qa-1")] }, facts);

  expect(run.snapshot.actorHistory?.slice(2)).toEqual([
    { role: "author", agentInstance: "verify-1", stageInstanceId: "bounded-verify" },
    { role: "reviewer", agentInstance: "qa-1", stageInstanceId: "bounded-verify" },
  ]);
});
