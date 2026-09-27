// QFAI:SPEC-0018:TC-0018-0079
// QFAI:SPEC-0018:TC-0018-0080

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const plan = {
  route: "bounded-change",
  stages: [
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
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
const specBinding = { specId: "spec-0007" };
const actorHistory = [
  { role: "author", agentInstance: "agent-atdd-1", stageInstanceId: "bounded-acceptance" },
  { role: "recommender", agentInstance: "agent-run-1", stageInstanceId: "routing" },
  { role: "reviewer", agentInstance: "agent-review-1", stageInstanceId: "bounded-sdd-delta" },
];
const firstAccepted = [
  { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
];

it("TC-0018-0079 (TDD-0098): Issue work orders across a run with an author, a recommender and a reviewer recorded", () => {
  const first = decide(
    {
      run: { id: "run-actors", state: "ready", sequence: 6 },
      plan,
      specBinding,
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
            specBinding,
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
          specBinding,
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

it("TC-0018-0080 (TDD-0099): A review result whose reviewer instance the actor history shows as the author", () => {
  const run = { id: "run-actors", state: "running", sequence: 9 };
  const workOrder = {
    workOrderId: "work-order-bounded-implement-1",
    stageInstanceId: "bounded-implement",
    attempt: 1,
    stageKind: "implement",
    target: { kind: "spec" as const, specId: "spec-0007" },
    executor: { skill: "qfai-implement" },
    operation: "implement",
  };
  const decision = decide(
    {
      run,
      plan,
      specBinding,
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
