// QFAI:SPEC-0018:TC-0018-0044

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;

const plan = {
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
const specBinding = { specId: "spec-0007" };

function acceptWithDebts(debts: NonNullable<AcceptResult["debts"]>) {
  const issued = decide(
    { run: { id: "run-debt", state: "ready", sequence: 4 }, plan, specBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return null;
  const decision = decide(
    { run, plan, specBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-direct-edit",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted_with_debt",
        debts,
      },
    },
    {},
  );
  const error = decision.verdict.error;
  return {
    ok: decision.verdict.ok,
    run: decision.verdict.run,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  };
}

it("TC-0018-0044 (TDD-0056): A result with a debt that has no resolvingOwner", () => {
  const actual = acceptWithDebts([
    {
      findingCode: "QFAI-TRACE-002",
      path: "src/notify/email.ts",
      cause: "The function has no spec annotation.",
      owningSpec: "spec-0007",
      detectingCommand: "qfai validate",
      blockingExtent: "completion",
    },
  ]);
  expect(actual).toEqual({
    ok: false,
    run: { id: "run-debt", state: "running", sequence: 6 },
    code: "invalid-input",
    reasons: [{ reason: "debt-owner-missing", subject: "debts[0]" }],
    events: [],
  });
});
