// QFAI:EX-0001-0193-05
// QFAI:EX-0001-0193-06
// QFAI:EX-0001-0193-12

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];
type Facts = Parameters<typeof decide>[2];

const flowBinding = { flowId: "BF-0001" };
const EXAMPLES = ["EX-0001-0001-01", "EX-0001-0001-02"];

// A bounded-change plan whose middle stage is the kind under test.
function plan(stageKind: string, skill: string, operation: string) {
  const stage = (id: string, kind: string, by: string, op: string) => ({
    stageInstanceId: id,
    stageKind: kind,
    skill: by,
    operation: op,
    when: "always",
  });
  return {
    route: "bounded-change",
    writeScope: ["src/**", "tests/**", ".qfai/spec/02_business-flow/**"],
    stages: [
      stage("sdd-delta", "sdd_delta", "qfai-sdd", "update-or-applicability-check"),
      stage("middle", stageKind, skill, operation),
      stage("verify", "verify", "qfai-verify", "verify-full"),
    ],
  };
}

// The bound flow's obligations: every example, and the ones a test annotates.
function obligations(exampleIds: string[], annotated: string[]): NonNullable<Facts["obligations"]> {
  return {
    flowId: "BF-0001",
    ids: ["AC-0001-0001-01", "BF-0001", ...exampleIds],
    exampleIds,
    annotated,
    digest: "1".repeat(64),
  };
}

// Issues the middle stage against the obligations at issue, then accepts its result against the
// obligations after it.
function acceptAgainst(
  stage: [string, string, string],
  atIssue: NonNullable<Facts["obligations"]>,
  after: NonNullable<Facts["obligations"]>,
) {
  const ready: NonNullable<Snapshot> = {
    run: { id: "run-obligations", state: "ready", sequence: 8 },
    plan: plan(...stage),
    flowBinding,
    acceptedStages: [{ stageInstanceId: "sdd-delta", stageKind: "sdd_delta", outcome: "accepted" }],
  };
  const issued = decide(ready, { operation: "next" }, { obligations: atIssue });
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  const obligationSet = issued.events.find((event) => event.obligationSet)?.obligationSet;
  if (!workOrder || !run || !obligationSet) throw new Error("next issues the middle stage");
  const decision = decide(
    { ...ready, run, outstandingWorkOrder: workOrder, issuedObligations: obligationSet },
    {
      operation: "accept",
      result: {
        resultId: "result-middle",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
      },
    },
    { obligations: after },
  );
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    reasons: error && "reasons" in error ? error.reasons : undefined,
    events: decision.events.length,
  };
}

const implement: [string, string, string] = ["implement", "qfai-implement", "implement"];
const sddDelta: [string, string, string] = [
  "sdd_delta",
  "qfai-sdd",
  "update-or-applicability-check",
];

it("A result after which an annotated example has no annotating test", () => {
  expect(
    acceptAgainst(
      implement,
      obligations(EXAMPLES, EXAMPLES),
      obligations(EXAMPLES, [EXAMPLES[0] ?? ""]),
    ),
  ).toEqual({
    state: "running",
    reasons: [{ reason: "example-uncovered", subject: "EX-0001-0001-02" }],
    events: 0,
  });
});

it("An implement result that adds an example to a story of the bound flow", () => {
  const added = [...EXAMPLES, "EX-0001-0001-03"];

  expect(acceptAgainst(implement, obligations(EXAMPLES, []), obligations(added, []))).toEqual({
    state: "running",
    reasons: [{ reason: "example-added", subject: "EX-0001-0001-03" }],
    events: 0,
  });
});

it("An implement result that annotates one more example", () => {
  expect(
    acceptAgainst(implement, obligations(EXAMPLES, []), obligations(EXAMPLES, [EXAMPLES[1] ?? ""])),
  ).toEqual({ state: "ready", reasons: undefined, events: 1 });
});

it("An sdd_delta result that adds one example and removes another a test annotated", () => {
  const after = ["EX-0001-0001-01", "EX-0001-0001-03"];

  expect(
    acceptAgainst(
      sddDelta,
      obligations(EXAMPLES, EXAMPLES),
      obligations(after, ["EX-0001-0001-01"]),
    ),
  ).toEqual({ state: "ready", reasons: undefined, events: 1 });
});
