// QFAI:EX-0001-0201-07

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { finishPlan } from "./finishFixture.js";

const UNMEASURED = {
  inputTokens: null,
  outputTokens: null,
  cachedTokens: null,
  subAgentTokens: null,
  toolDefinitionBytes: null,
  referenceBytesRead: null,
  wallClockMs: null,
  questionsPut: null,
  reworkCount: null,
};

// Issues the first work order of a ready run and accepts a result carrying `measurement`.
function acceptMeasured(measurement: unknown) {
  const ready = {
    run: { id: "run-measured", state: "ready", sequence: 4 },
    plan: finishPlan,
    flowBinding: { flowId: "BF-0007" },
  };
  const issued = decide(ready, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) throw new Error("the ready run issues its first work order");
  return decide(
    { ...ready, run, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-measured",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        measurement,
      },
    },
    {},
  );
}

it("A stage result whose measurement sets every field null, and one submitting 0 for a field", () => {
  const counted = { ...UNMEASURED, reworkCount: 0 };
  const recorded = [UNMEASURED, counted].map((measurement) => {
    const accepted = acceptMeasured(measurement);
    return { ok: accepted.verdict.ok, measurement: accepted.events[0]?.measurement };
  });

  expect(recorded).toEqual([
    { ok: true, measurement: UNMEASURED },
    { ok: true, measurement: counted },
  ]);
});

it("A stage result whose measurement omits a field", () => {
  const { reworkCount: _omitted, ...partial } = UNMEASURED;
  const refused = acceptMeasured(partial);

  const error = refused.verdict.error;
  const reasons = error && "reasons" in error ? error.reasons : undefined;

  expect({ code: error?.code, reasons }).toEqual({
    code: "invalid-input",
    reasons: [{ reason: "schema", subject: "measurement.reworkCount" }],
  });
});
