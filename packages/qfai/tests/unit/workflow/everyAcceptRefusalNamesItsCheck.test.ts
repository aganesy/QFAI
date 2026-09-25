import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];
type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;
type Plan = NonNullable<NonNullable<Snapshot>["plan"]>;

const specBinding = { specId: "spec-0007" };
const directPlan: Plan = {
  route: "direct",
  stages: [
    {
      stageInstanceId: "direct-edit",
      stageKind: "maintenance",
      skill: "qfai-maintain",
      operation: "non-normative-edit",
    },
    {
      stageInstanceId: "direct-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
    },
  ],
};
const bugfixPlan: Plan = {
  route: "bugfix",
  stages: [
    {
      stageInstanceId: "bugfix-diagnose",
      stageKind: "diagnose",
      skill: "qfai-implement",
      operation: "diagnose-only",
      when: "always",
    },
    {
      stageInstanceId: "bugfix-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
      when: "always",
    },
  ],
};

// Issues the plan's first work order, then accepts a result for it.
function acceptFirst(plan: Plan, change: Partial<AcceptResult>) {
  const issued = decide(
    { run: { id: "run-named", state: "ready", sequence: 4 }, plan, specBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("no work order was issued");
  return decide(
    { run, plan, specBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-named",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        ...change,
      },
    },
    {},
  );
}

function refusalOf(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  return {
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : undefined,
    events: decision.events,
  };
}

function refused(subject: string, reason = "schema") {
  return { code: "invalid-input", reasons: [{ reason, subject }], events: [] };
}

it("an awaiting_input result with no question is refused naming its outcome", () => {
  const decision = acceptFirst(directPlan, { outcome: "awaiting_input" });

  expect(refusalOf(decision)).toEqual(refused("outcome"));
});

it("a stage result carrying a route proposal is refused naming the proposal", () => {
  const decision = acceptFirst(directPlan, {
    proposal: {
      requestKind: "change",
      candidateRoute: "direct",
      expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
      observedRefs: [],
      newCapabilities: [],
      requiredStages: [],
    },
  });

  expect(refusalOf(decision)).toEqual(refused("proposal"));
});

it("a diagnose result without its diagnosis is refused naming the diagnosis", () => {
  const decision = acceptFirst(bugfixPlan, {});

  expect(refusalOf(decision)).toEqual(refused("diagnosis"));
});

it("every failed field check is named in one refusal", () => {
  const decision = acceptFirst(bugfixPlan, { outcome: "needs_repair" });

  expect(refusalOf(decision).reasons).toEqual([
    { reason: "schema", subject: "diagnosis" },
    { reason: "schema", subject: "outcome" },
  ]);
});

it("an outstanding work order the plan does not issue next is refused as work-order", () => {
  const run = { id: "run-named", state: "running", sequence: 5 };
  const workOrder = {
    workOrderId: "work-order-direct-verify-1",
    stageInstanceId: "direct-verify",
    attempt: 1,
    stageKind: "verify",
  };
  const decision = decide(
    { run, plan: directPlan, specBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-named",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
      },
    },
    {},
  );

  expect(refusalOf(decision)).toEqual(refused("workOrderId", "work-order"));
});
