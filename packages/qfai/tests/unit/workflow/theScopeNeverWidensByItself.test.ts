// QFAI:EX-0001-0192-34

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;

const plan = {
  route: "feature",
  stages: [
    {
      stageInstanceId: "feature-sdd",
      stageKind: "sdd",
      skill: "qfai-sdd",
      operation: "new-story",
    },
    {
      stageInstanceId: "feature-implement",
      stageKind: "implement",
      skill: "qfai-implement",
      operation: "implement",
    },
    {
      stageInstanceId: "feature-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
    },
  ],
};
const approval = {
  authorizationId: "authorization-4",
  kind: "human_decision",
  operation: "CREATE",
  effect: "proceed",
  target: { kind: "new_story", slotId: "slot-3-1" },
};

function acceptSddBindings(bindings: NonNullable<AcceptResult["bindings"]>) {
  const issued = decide(
    { run: { id: "run-bind", state: "ready", sequence: 5 }, plan, approval },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return issued;
  return decide(
    { run, plan, approval, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-feature-sdd",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        bindings,
      },
    },
    {},
  );
}

it("An SDD result binding the spec it created to the goal's slot", () => {
  const binding = { slotId: "slot-3-1", flowId: "BF-0007", storyIds: ["US-0007-0001"] };
  const decision = acceptSddBindings([binding]);
  expect({
    state: decision.verdict.run?.state,
    bindings: decision.events.filter((event) => event.type === "binding-recorded"),
  }).toEqual({ state: "ready", bindings: [{ type: "binding-recorded", binding }] });
});

it("An SDD result creating a capability no approved slot is bound to", () => {
  const decision = acceptSddBindings([
    { slotId: "slot-3-1", flowId: "BF-0007", storyIds: ["US-0007-0001"] },
    { slotId: "slot-9-9", flowId: "BF-0008", storyIds: ["US-0008-0001"] },
  ]);
  const error = decision.verdict.error;
  expect({
    state: decision.verdict.run?.state,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  }).toEqual({
    state: "running",
    code: "invalid-input",
    reasons: [{ reason: "unbound-story", subject: "bindings[1]" }],
    events: [],
  });
});

it("Issue a work order whose inputs include paths outside the plan's write scope", () => {
  const checkedPlan = {
    ...plan,
    writeScope: ["src/notify/**", "tests/notify/**"],
    observedRefs: [{ kind: "path", ref: "src/billing/invoice.ts" }],
  };
  const issued = decide(
    { run: { id: "run-scope", state: "ready", sequence: 5 }, plan: checkedPlan, approval },
    { operation: "next" },
    {},
  );
  expect(issued.verdict.workOrder?.scope?.writeAreas).toEqual(["src/notify/**", "tests/notify/**"]);
});
