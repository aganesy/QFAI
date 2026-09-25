// QFAI:SPEC-0018:TC-0018-0031
// Fault seeds: FAULT-008

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finish, finishPlan, metFacts, readySnapshot } from "./finishFixture.js";

const specBinding = { specId: "spec-0007" };

function acceptImplementClaimingValidatePass() {
  const issued = decide(
    {
      run: { id: "run-20260925000000001", state: "ready", sequence: 8 },
      plan: finishPlan,
      specBinding,
      acceptedStages: [
        { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
      ],
    },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return null;
  return decide(
    {
      run,
      plan: finishPlan,
      specBinding,
      outstandingWorkOrder: workOrder,
      acceptedStages: [
        { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
      ],
    },
    {
      operation: "accept",
      result: {
        resultId: "result-implement",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        gateResults: [{ gateId: "validate", verdict: "PASS" }],
      },
    },
    {},
  );
}

it("TC-0018-0031 (TDD-0035): A result whose gateResults claims a PASS for a gate", () => {
  const accepted = acceptImplementClaimingValidatePass();
  const claims = accepted?.events[0]?.gateResults;
  expect(claims).toEqual([{ gateId: "validate", verdict: "PASS", trustLevel: "agent_reported" }]);

  const snapshot = readySnapshot();
  const stages = (snapshot.acceptedStages ?? []).map((stage) =>
    stage.stageInstanceId === "bounded-implement" ? { ...stage, gateResults: claims ?? [] } : stage,
  );
  const facts = metFacts();
  const completion = facts.completion;
  if (!completion) throw new Error("the fixture carries completion facts");
  completion.validate.findings = [
    { code: "QFAI-TRACE-002", severity: "error", file: "src/notify/email.ts", refs: [] },
  ];
  const decision = finish({ ...snapshot, acceptedStages: stages }, facts);

  expect(decision.verdict.run).toEqual(snapshot.run);
  expect(decision.verdict.unmet).toEqual([
    {
      condition: "gate-failed",
      subject: "validate",
      owner: "operator",
      findings: [
        { code: "QFAI-TRACE-002", file: "src/notify/email.ts", refs: [], baseline: "new" },
      ],
    },
  ]);
  expect(decision.verdict.receipts).toEqual([
    { gateId: "validate", verdict: "FAIL", trustLevel: "cli_observed" },
  ]);
  expect(decision.events).toEqual([]);
});
