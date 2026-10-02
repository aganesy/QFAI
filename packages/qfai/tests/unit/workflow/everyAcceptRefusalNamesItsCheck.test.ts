import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { extractionFor } from "../../helpers/workflowExtraction.js";
import { planStage } from "./kindSteps.js";

type Snapshot = NonNullable<Parameters<typeof decide>[0]>;
type Result = NonNullable<Parameters<typeof decide>[1]["result"]>;

const flowBinding = { flowId: "BF-0007" };
const plan = {
  route: "fix-defect",
  stages: [planStage("bugfix-diagnose", "diagnose"), planStage("bugfix-verify", "verify")],
};
const diagnosis = {
  verdict: "missing-test",
  reproductionRef: "evidence/reproduction.json",
  matchedIds: ["EX-0007-0002-01"],
};

// Issues the plan's first work order, then accepts a result for it.
function acceptDiagnose(change: Partial<Result>, withDiagnosis = true) {
  const ready: Snapshot = {
    run: { id: "run-named", state: "ready", sequence: 4 },
    plan,
    flowBinding,
  };
  const issued = decide(ready, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the ready run issues its diagnose work order");
  return decide(
    { run, plan, flowBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-named",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        testObservation: "not_applicable",
        actor: { agentInstance: "diagnose-1" },
        ...(withDiagnosis ? { diagnosis } : {}),
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
  const decision = acceptDiagnose({ outcome: "awaiting_input" });

  expect(refusalOf(decision)).toEqual(refused("outcome"));
});

it("a stage result carrying a route proposal is refused naming the proposal", () => {
  const decision = acceptDiagnose({
    proposal: {
      requestKind: "change",
      extraction: extractionFor("answer-question"),
      expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
      observedRefs: [],
      newStories: [],
    },
  });

  expect(refusalOf(decision)).toEqual(refused("proposal"));
});

it("a diagnose result without its diagnosis is refused naming the diagnosis", () => {
  const decision = acceptDiagnose({}, false);

  expect(refusalOf(decision)).toEqual(refused("diagnosis"));
});

it("every failed field check is named in one refusal", () => {
  const decision = acceptDiagnose({ outcome: "awaiting_input" }, false);

  expect(refusalOf(decision).reasons).toEqual([
    { reason: "schema", subject: "diagnosis" },
    { reason: "schema", subject: "outcome" },
  ]);
});

it("an outstanding work order the plan does not issue next is refused as work-order", () => {
  const run = { id: "run-named", state: "running", sequence: 5 };
  const workOrder = {
    workOrderId: "work-order-bugfix-verify-1",
    stageInstanceId: "bugfix-verify",
    attempt: 1,
    stageKind: "verify",
  };
  const decision = decide(
    { run, plan, flowBinding, outstandingWorkOrder: workOrder },
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
