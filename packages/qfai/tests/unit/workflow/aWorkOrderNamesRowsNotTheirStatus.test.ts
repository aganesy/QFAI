// QFAI:SPEC-0018:TC-0018-0073

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const plan = {
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
const ledger = {
  specId: "spec-0007",
  rows: [
    { rowId: "TDD-0001", status: "done", digest: "1".repeat(64) },
    { rowId: "TDD-0002", status: "todo", digest: "2".repeat(64) },
  ],
};

it("TC-0018-0073 (TDD-0088): Issue an implement work order bound to a spec", () => {
  const decision = decide(
    {
      run: { id: "run-ledger", state: "ready", sequence: 6 },
      plan,
      specBinding: { specId: "spec-0007" },
      acceptedStages: [
        { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
      ],
    },
    { operation: "next" },
    { ledger },
  );
  const workOrder = decision.verdict.workOrder;
  const issuedLedger = workOrder?.ledger;

  expect({
    stageKind: workOrder?.stageKind,
    keys: issuedLedger ? Object.keys(issuedLedger).sort() : [],
    specId: issuedLedger?.specId,
    rowIds: issuedLedger?.rowIds,
    digestShape: /^[a-f0-9]{64}$/.test(issuedLedger?.rowSetDigest ?? ""),
    carriesStatus: JSON.stringify(workOrder ?? {}).includes('"status"'),
  }).toEqual({
    stageKind: "implement",
    keys: ["rowIds", "rowSetDigest", "specId"],
    specId: "spec-0007",
    rowIds: ["TDD-0002"],
    digestShape: true,
    carriesStatus: false,
  });
});
