// QFAI:SPEC-0018:TC-0018-0076

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const boundedPlan = {
  route: "bounded-change",
  stages: [
    ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
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

it("TC-0018-0076 (TDD-0090): A RED receipt accepted for an unfinished row, then a reclassification from bugfix to bounded-change, then next", () => {
  const decision = decide(
    {
      run: { id: "run-reclassified", state: "ready", sequence: 14 },
      plan: boundedPlan,
      specBinding: { specId: "spec-0007" },
      acceptedStages: [],
      receiptRefs: [diagnoseReceipt, redReceipt],
    },
    { operation: "next" },
    {
      ledger: {
        specId: "spec-0007",
        rows: [
          { rowId: "TDD-0003", status: "done", digest: "3".repeat(64) },
          { rowId: "TDD-0004", status: "red", digest: "4".repeat(64) },
        ],
      },
      receiptValidity: { [diagnoseReceipt]: "stale", [redReceipt]: "valid" },
    },
  );
  const workOrder = decision.verdict.workOrder;

  expect({
    stageKind: workOrder?.stageKind,
    rowIds: workOrder?.ledger?.rowIds,
    priorStageReceiptRefs: workOrder?.priorStageReceiptRefs,
  }).toEqual({
    stageKind: "sdd_delta",
    rowIds: ["TDD-0004"],
    priorStageReceiptRefs: [
      { ref: diagnoseReceipt, validity: "stale" },
      { ref: redReceipt, validity: "valid" },
    ],
  });
});
