// QFAI:SPEC-0018:TC-0018-0066

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const plan = {
  route: "bugfix",
  stages: [
    ["bugfix-diagnose", "diagnose", "qfai-implement", "diagnose-only", "always"],
    [
      "bugfix-sdd-append",
      "sdd_append",
      "qfai-sdd",
      "defect-row-seeding",
      "missing_test_row_needed",
    ],
    ["bugfix-implement", "implement", "qfai-implement", "implement", "missing_test_row_needed"],
    ["bugfix-verify", "verify", "qfai-verify", "verify-full", "always"],
  ].map(([stageInstanceId = "", stageKind = "", skill = "", operation = "", when = ""]) => ({
    stageInstanceId,
    stageKind,
    skill,
    operation,
    when,
  })),
  writeScope: ["src/forms/**"],
};
const reproductionRef = "evidence/empty-value-reproduction.json";
const reproductionDigest = "a".repeat(64);

it("TC-0018-0066 (TDD-0083): Issue the sdd_append work order after a missing-test diagnosis", () => {
  const decision = decide(
    {
      run: { id: "run-append", state: "ready", sequence: 7 },
      plan,
      specBinding: { specId: "spec-0007" },
      diagnosis: { verdict: "missing-test", reproductionRef, matchedRowIds: [] },
      acceptedStages: [
        { stageInstanceId: "bugfix-diagnose", stageKind: "diagnose", outcome: "accepted" },
      ],
    },
    { operation: "next" },
    { fileDigests: { [reproductionRef]: reproductionDigest } },
  );
  const workOrder = decision.verdict.workOrder;
  const writable = [...(workOrder?.scope?.writeAreas ?? []), ...(workOrder?.recordAreas ?? [])];

  expect({
    stageKind: workOrder?.stageKind,
    inputs: workOrder?.inputs,
    changeRequestWritable: writable.some(
      (area) => area.startsWith(".qfai/decisions") || area.includes("change-request"),
    ),
    stageKindsWritingChangeRequests: plan.stages.filter((stage) =>
      /change[-_]?request/i.test(`${stage.stageKind} ${stage.operation}`),
    ),
  }).toEqual({
    stageKind: "sdd_append",
    inputs: [{ path: reproductionRef, digest: reproductionDigest }],
    changeRequestWritable: false,
    stageKindsWritingChangeRequests: [],
  });
});
