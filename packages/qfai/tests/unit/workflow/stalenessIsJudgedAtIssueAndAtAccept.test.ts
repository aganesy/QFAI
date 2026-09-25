// QFAI:SPEC-0018:TC-0018-0006

import { createHash } from "node:crypto";

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];

const approvedWriteAreas = ["src/notify/**"];
const scopeDigestOf = (writeAreas: string[]) =>
  createHash("sha256").update(JSON.stringify({ writeAreas })).digest("hex");

const capability = {
  goal: "Customer notification email registration",
  covers: ["Up to five unique emails per customer"],
  excludes: ["Notification delivery"],
};

function freshSnapshot(): Snapshot {
  return {
    run: { id: "run-feature", state: "ready", sequence: 5 },
    plan: {
      route: "feature",
      stages: [
        {
          stageInstanceId: "feature-sdd",
          stageKind: "sdd",
          skill: "qfai-sdd",
          operation: "new-capability",
        },
        {
          stageInstanceId: "feature-verify",
          stageKind: "verify",
          skill: "qfai-verify",
          operation: "verify-full",
        },
      ],
    },
    scopeDigest: scopeDigestOf(approvedWriteAreas),
    capabilities: [{ ...capability, slotId: "slot-3-1" }],
    approval: {
      authorizationId: "authorization-4",
      kind: "human_decision",
      operation: "CREATE",
      effect: "proceed",
      scopeDigest: scopeDigestOf(approvedWriteAreas),
      target: { kind: "new_capability", slotId: "slot-3-1", capability },
    },
  };
}

function observe(decision: ReturnType<typeof decide>) {
  return {
    state: decision.verdict.run?.state,
    workOrder: decision.verdict.workOrder ?? null,
    questions: (decision.verdict.questions ?? []).map((question) => ({
      kind: question.kind,
      slotId: question.capability.slotId,
    })),
    eventTypes: decision.events.map((event) => event.type),
  };
}

const reasked = {
  state: "awaiting_input",
  workOrder: null,
  questions: [{ kind: "create", slotId: "slot-3-1" }],
  eventTypes: ["question-opened", "material-decision"],
};

function atIssue(change: (snapshot: Snapshot) => Snapshot) {
  return observe(decide(change(freshSnapshot()), { operation: "next" }, {}));
}

function atAccept(change: (snapshot: Snapshot) => Snapshot) {
  const fresh = freshSnapshot();
  const issued = decide(fresh, { operation: "next" }, {});
  const workOrder = issued.verdict.workOrder;
  const run = issued.verdict.run;
  if (!workOrder || !run) return observe(issued);
  const running = change({ ...fresh, run, outstandingWorkOrder: workOrder });
  return observe(
    decide(
      running,
      {
        operation: "accept",
        result: {
          resultId: "result-feature-sdd",
          workOrderId: workOrder.workOrderId,
          stageInstanceId: workOrder.stageInstanceId,
          attempt: workOrder.attempt,
          expectedSequence: run.sequence,
          outcome: "accepted",
          bindings: [{ slotId: "slot-3-1", capabilityId: "CAP-0001", specId: "spec-0007" }],
        },
      },
      {},
    ),
  );
}

const changedDigest = (snapshot: Snapshot): Snapshot => ({
  ...snapshot,
  scopeDigest: "b".repeat(64),
});

it("TC-0018-0006 (TDD-0006): scope-digest-at-issue", () => {
  expect(atIssue(changedDigest)).toEqual(reasked);
});

it("TC-0018-0006 (TDD-0007): scope-digest-at-accept", () => {
  expect(atAccept(changedDigest)).toEqual(reasked);
});

const changedCapabilityText = (snapshot: Snapshot): Snapshot => ({
  ...snapshot,
  capabilities: [{ ...capability, covers: ["Up to ten emails per customer"], slotId: "slot-3-1" }],
});

it("TC-0018-0006 (TDD-0008): capability-text-at-issue", () => {
  expect(atIssue(changedCapabilityText)).toEqual(reasked);
});

it("TC-0018-0006 (TDD-0009): capability-text-at-accept", () => {
  expect(atAccept(changedCapabilityText)).toEqual(reasked);
});

const wideningReplan = (snapshot: Snapshot): Snapshot => ({
  ...snapshot,
  scopeDigest: scopeDigestOf([...approvedWriteAreas, "src/billing/**"]),
});

it("TC-0018-0006 (TDD-0010): widening-replan-at-issue", () => {
  expect(atIssue(wideningReplan)).toEqual(reasked);
});

it("TC-0018-0006 (TDD-0011): widening-replan-at-accept", () => {
  expect(atAccept(wideningReplan)).toEqual(reasked);
});

// QFAI:SPEC-0018:TC-0018-0007
it("TC-0018-0007 (TDD-0012): Bind the created spec ID, then issue the next SDD-bound work order", () => {
  const bound: Snapshot = {
    ...freshSnapshot(),
    run: { id: "run-feature", state: "ready", sequence: 9 },
    specBinding: { specId: "spec-0007" },
    acceptedStages: [{ stageInstanceId: "feature-sdd", stageKind: "sdd", outcome: "accepted" }],
  };

  const next = decide(bound, { operation: "next" }, {});

  expect({
    state: next.verdict.run?.state,
    target: next.verdict.workOrder?.target,
    questions: next.verdict.questions ?? [],
    questionEvents: next.events.filter((event) => event.type === "question-opened").length,
  }).toEqual({
    state: "running",
    target: { kind: "spec", specId: "spec-0007" },
    questions: [],
    questionEvents: 0,
  });
});
