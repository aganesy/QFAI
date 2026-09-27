// QFAI:SPEC-0018:TC-0018-0154

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finishPlan } from "./finishFixture.js";

const source = "src/notify/email.ts";
const staleDigest = "1".repeat(64);
const freshDigest = "2".repeat(64);

it("TC-0018-0154 (TDD-0208): A result whose submitted digest of an input differs from the digest in the facts", () => {
  const run = { id: "run-stale-input", state: "running", sequence: 8 };
  const implementOrder = {
    workOrderId: "work-order-bounded-implement-1",
    stageInstanceId: "bounded-implement",
    attempt: 1,
    stageKind: "implement",
    target: { kind: "spec" as const, specId: "spec-0007" },
    executor: { skill: "qfai-implement" },
    operation: "implement",
    scope: { writeAreas: ["src/notify"] },
    inputs: [{ path: source, digest: staleDigest }],
  };
  const snapshot = {
    run,
    plan: finishPlan,
    specBinding: { specId: "spec-0007" },
    acceptedStages: [
      { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
    ],
    outstandingWorkOrder: implementOrder,
  };
  const facts = { fileDigests: { [source]: freshDigest } };
  const refused = decide(
    snapshot,
    {
      operation: "accept",
      result: {
        resultId: "result-stale-input",
        workOrderId: implementOrder.workOrderId,
        stageInstanceId: implementOrder.stageInstanceId,
        attempt: 1,
        expectedSequence: run.sequence,
        outcome: "accepted",
        changedFiles: [{ path: source, digest: staleDigest }],
      },
    },
    facts,
  );
  const next = decide(snapshot, { operation: "next" }, facts);
  const error = refused.verdict.error;

  expect({
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : undefined,
    events: refused.events,
    inputs: next.verdict.workOrder?.inputs,
  }).toEqual({
    code: "invalid-input",
    reasons: [{ reason: "digest-mismatch", subject: source }],
    events: [],
    inputs: [{ path: source, digest: freshDigest }],
  });
});
