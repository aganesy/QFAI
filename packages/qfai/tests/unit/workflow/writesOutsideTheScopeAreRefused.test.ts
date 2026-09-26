// QFAI:EX-0001-0192-33

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];
type AcceptResult = NonNullable<Parameters<typeof decide>[1]["result"]>;
type WorkOrder = NonNullable<ReturnType<typeof decide>["verdict"]["workOrder"]>;

const flowBinding = { flowId: "BF-0007" };
const directPlan = {
  route: "direct",
  stages: [
    {
      stageInstanceId: "direct-edit",
      stageKind: "maintenance",
      skill: "qfai-maintain",
      operation: "non-normative-edit",
    },
    {
      stageInstanceId: "direct-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
    },
  ],
};
const bugfixPlan = {
  route: "bugfix",
  stages: [
    {
      stageInstanceId: "bugfix-diagnose",
      stageKind: "diagnose",
      skill: "qfai-implement",
      operation: "diagnose-only",
      when: "always",
    },
    {
      stageInstanceId: "bugfix-verify",
      stageKind: "verify",
      skill: "qfai-verify",
      operation: "verify-full",
      when: "always",
    },
  ],
};

function acceptChangedFiles(
  plan: NonNullable<Snapshot["plan"]>,
  changedFiles: NonNullable<AcceptResult["changedFiles"]>,
  widen: (workOrder: WorkOrder) => WorkOrder,
  extra: Partial<AcceptResult> = {},
) {
  const issued = decide(
    { run: { id: "run-write-scope", state: "ready", sequence: 4 }, plan, flowBinding },
    { operation: "next" },
    {},
  );
  const issuedOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!issuedOrder || !run) return issued;
  const workOrder = widen(issuedOrder);
  return decide(
    { run, plan, flowBinding, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: "result-write-scope",
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        changedFiles,
        ...extra,
      },
    },
    {},
  );
}

function refusal(decision: ReturnType<typeof decide>) {
  const error = decision.verdict.error;
  return {
    state: decision.verdict.run?.state,
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    events: decision.events,
  };
}

const digest = "0".repeat(64);

it("outside-write-areas", () => {
  const decision = acceptChangedFiles(
    directPlan,
    [
      { path: "src/notify/email.ts", digest },
      { path: ".qfai/evidence/implement-BF-0007.md", digest },
      { path: "src/billing/invoice.ts", digest },
    ],
    (workOrder) => ({
      ...workOrder,
      scope: { writeAreas: ["src/notify/**"] },
      recordAreas: [".qfai/evidence/implement-BF-0007.md"],
    }),
  );
  expect(refusal(decision)).toEqual({
    state: "running",
    code: "invalid-input",
    reasons: [{ reason: "write-scope", subject: "src/billing/invoice.ts" }],
    events: [],
  });
});

it("diagnose-only", () => {
  const decision = acceptChangedFiles(
    bugfixPlan,
    [{ path: "src/notify/email.ts", digest }],
    (workOrder) => workOrder,
    {
      diagnosis: {
        verdict: "regression",
        reproductionRef: "reports/bugfix-diagnose/reproduction.md",
        matchedIds: [],
      },
    },
  );
  expect(refusal(decision)).toEqual({
    state: "running",
    code: "invalid-input",
    reasons: [{ reason: "write-scope", subject: "src/notify/email.ts" }],
    events: [],
  });
});
