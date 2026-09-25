// QFAI:EX-0001-0193-10

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const boundedPlan = {
  route: "bounded-change",
  stages: [
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"],
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
const redReceipt = "results/result-bugfix-implement-red.json";
const diagnoseReceipt = "results/result-bugfix-diagnose.json";

it("A RED receipt accepted for an example no test annotates, then a reclassification from bugfix to bounded-change, then next", () => {
  const decision = decide(
    {
      run: { id: "run-reclassified", state: "ready", sequence: 14 },
      plan: boundedPlan,
      flowBinding: { flowId: "BF-0007" },
      acceptedStages: [],
      receiptRefs: [diagnoseReceipt, redReceipt],
    },
    { operation: "next" },
    {
      obligations: {
        flowId: "BF-0007",
        ids: ["AC-0007-0001-01", "BF-0007", "EX-0007-0001-01", "EX-0007-0001-02"],
        exampleIds: ["EX-0007-0001-01", "EX-0007-0001-02"],
        annotated: ["EX-0007-0001-01"],
        digest: "7".repeat(64),
      },
      receiptValidity: { [diagnoseReceipt]: "stale", [redReceipt]: "valid" },
    },
  );
  const workOrder = decision.verdict.workOrder;

  expect({
    stageKind: workOrder?.stageKind,
    obligationIds: workOrder?.obligations?.ids,
    priorStageReceiptRefs: workOrder?.priorStageReceiptRefs,
  }).toEqual({
    stageKind: "sdd_delta",
    obligationIds: ["AC-0007-0001-01", "BF-0007", "EX-0007-0001-01", "EX-0007-0001-02"],
    priorStageReceiptRefs: [
      { ref: diagnoseReceipt, validity: "stale" },
      { ref: redReceipt, validity: "valid" },
    ],
  });
});
