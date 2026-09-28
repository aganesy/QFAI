// QFAI:EX-0001-0222-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { stageResultRefusals } from "../../../src/core/workflow/parse.js";
import { planStage } from "./kindSteps.js";

const flowBinding = { flowId: "BF-0007" };
const plan = {
  route: "bugfix",
  stages: [
    planStage("bugfix-diagnose", "diagnose", "always"),
    planStage("bugfix-implement", "implement", "always"),
    planStage("bugfix-verify", "verify", "always"),
  ],
};

const ELEVEN = [
  "missing-test",
  "defective-test",
  "regression",
  "expectation-differs",
  "as-specified",
  "not-ours",
  "duplicate",
  "needs-info",
  "surface-conflict",
  "check-gap",
  "product-race",
];

// Issues the diagnose work order of a ready run.
function issueDiagnose() {
  const issued = decide(
    { run: { id: "run-verdicts", state: "ready", sequence: 4 }, plan, flowBinding },
    { operation: "next" },
    {},
  );
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the ready run issues its diagnose work order");
  return { workOrder, run };
}

// A complete diagnose result for the issued work order, carrying the given verdict.
function resultWith(verdict: string) {
  const { workOrder, run } = issueDiagnose();
  return {
    resultId: `result-${verdict}`,
    workOrderId: workOrder.workOrderId,
    stageInstanceId: workOrder.stageInstanceId,
    attempt: workOrder.attempt,
    expectedSequence: run.sequence,
    outcome: "accepted",
    testObservation: "not_applicable",
    actor: { agentInstance: "diagnose-1" },
    diagnosis: {
      verdict,
      reproductionRef: "evidence/reproduction.json",
      matchedIds: ["EX-0007-0002-01"],
    },
  };
}

// Whether the payload parser takes the result and the core accepts it.
function taken(verdict: string): boolean {
  const { workOrder, run } = issueDiagnose();
  const result = resultWith(verdict);
  const accepted = decide(
    { run, plan, flowBinding, outstandingWorkOrder: workOrder },
    { operation: "accept", result },
    {},
  );
  return stageResultRefusals({ ...result }).length === 0 && accepted.verdict.ok;
}

it("Diagnose results carrying each of the eleven verdicts, and one carrying wont-fix", () => {
  expect({
    accepted: ELEVEN.filter(taken),
    wontFix: stageResultRefusals({ ...resultWith("wont-fix") }),
  }).toEqual({
    accepted: ELEVEN,
    wontFix: [{ reason: "schema", subject: "diagnosis.verdict" }],
  });
});
