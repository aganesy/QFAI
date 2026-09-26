// QFAI:EX-0001-0192-05
// Fault seeds: FAULT-007

import { createHash } from "node:crypto";

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

type Snapshot = Parameters<typeof decide>[0];

const approvedWriteAreas = ["src/notify/**"];
const scopeDigestOf = (writeAreas: string[]) =>
  createHash("sha256").update(JSON.stringify({ writeAreas })).digest("hex");

const story = {
  goal: "Customer notification email registration",
  covers: ["Up to five unique emails per customer"],
  excludes: ["Notification delivery"],
  flowId: "BF-0001",
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
          operation: "new-story",
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
    stories: [{ ...story, slotId: "slot-3-1" }],
    approval: {
      authorizationId: "authorization-4",
      kind: "human_decision",
      operation: "CREATE",
      effect: "proceed",
      scopeDigest: scopeDigestOf(approvedWriteAreas),
      target: { kind: "new_story", slotId: "slot-3-1", story },
    },
  };
}

function observe(decision: ReturnType<typeof decide>) {
  return {
    state: decision.verdict.run?.state,
    workOrder: decision.verdict.workOrder ?? null,
    questions: (decision.verdict.questions ?? []).map((question) => ({
      kind: question.kind,
      slotId: question.story?.slotId,
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
          bindings: [{ slotId: "slot-3-1", flowId: "BF-0001", storyIds: ["US-0001-0001"] }],
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

it("scope-digest-at-issue", () => {
  expect(atIssue(changedDigest)).toEqual(reasked);
});

it("scope-digest-at-accept", () => {
  expect(atAccept(changedDigest)).toEqual(reasked);
});

const changedStoryText = (snapshot: Snapshot): Snapshot => ({
  ...snapshot,
  stories: [{ ...story, covers: ["Up to ten emails per customer"], slotId: "slot-3-1" }],
});

it("story-text-at-issue", () => {
  expect(atIssue(changedStoryText)).toEqual(reasked);
});

it("story-text-at-accept", () => {
  expect(atAccept(changedStoryText)).toEqual(reasked);
});

const wideningReplan = (snapshot: Snapshot): Snapshot => ({
  ...snapshot,
  scopeDigest: scopeDigestOf([...approvedWriteAreas, "src/billing/**"]),
});

it("widening-replan-at-issue", () => {
  expect(atIssue(wideningReplan)).toEqual(reasked);
});

it("widening-replan-at-accept", () => {
  expect(atAccept(wideningReplan)).toEqual(reasked);
});

it("Bind the created flow, then issue the next flow-bound work order", () => {
  const fresh = freshSnapshot();
  const [sdd, verify] = fresh?.plan?.stages ?? [];
  const implement = {
    stageInstanceId: "feature-implement",
    stageKind: "implement",
    skill: "qfai-implement",
    operation: "implement",
  };
  const bound: Snapshot = {
    ...fresh,
    run: { id: "run-feature", state: "ready", sequence: 9 },
    plan: { route: "feature", stages: [sdd, implement, verify].flatMap((stage) => stage ?? []) },
    flowBinding: { flowId: "BF-0007" },
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
    target: { kind: "flow", flowId: "BF-0007" },
    questions: [],
    questionEvents: 0,
  });
});
