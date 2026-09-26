// QFAI:EX-0001-0193-02

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
      "defect-example-seeding",
      "missing_example_needed",
    ],
    ["bugfix-implement", "implement", "qfai-implement", "implement", "diagnosis_missing_test"],
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

it("Issue the sdd_append work order after a missing-test diagnosis", () => {
  const decision = decide(
    {
      run: { id: "run-append", state: "ready", sequence: 7 },
      plan,
      flowBinding: { flowId: "BF-0007" },
      diagnosis: { verdict: "missing-test", reproductionRef, matchedIds: [] },
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
    statementWritable: writable.some((area) =>
      /(?:01_User-story|02_Acceptance-Criteria).md$/.test(area),
    ),
  }).toEqual({
    stageKind: "sdd_append",
    inputs: [{ path: reproductionRef, digest: reproductionDigest }],
    statementWritable: false,
  });
});
