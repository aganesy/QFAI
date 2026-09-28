// QFAI:EX-0001-0192-22

import { expect, it } from "vitest";

import { RUN_ID, finish, metFacts, readySnapshot } from "./finishFixture.js";

type Snapshot = ReturnType<typeof readySnapshot>;
type Facts = ReturnType<typeof metFacts>;
type Completion = NonNullable<Facts["completion"]>;

function withCompletion(facts: Facts, change: Partial<Completion>): Facts {
  const completion = facts.completion;
  if (!completion) throw new Error("the fixture carries completion facts");
  return { ...facts, completion: { ...completion, ...change } };
}

function withoutStage(snapshot: Snapshot, stageInstanceId: string): Snapshot {
  const acceptedStages = (snapshot.acceptedStages ?? []).filter(
    (stage) => stage.stageInstanceId !== stageInstanceId,
  );
  return { ...snapshot, acceptedStages };
}

const debt = {
  findingCode: "QFAI-TRACE-002",
  path: "src/notify/email.ts",
  cause: "The function has no spec annotation.",
  owningFlow: "BF-0007",
  detectingCommand: "qfai validate",
  resolvingOwner: "qfai-implement",
  blockingExtent: "completion",
};

const matrix: {
  title: string;
  plant: (snapshot: Snapshot, facts: Facts) => [Snapshot, Facts];
  expected: { condition: string; subject: string; owner: string };
}[] = [
  {
    title: "obligation-unprocessed",
    plant: (snapshot, facts) => [
      snapshot,
      {
        ...facts,
        obligations: {
          flowId: "BF-0007",
          ids: ["AC-0007-0001-01", "BF-0007", "EX-0007-0001-01"],
          exampleIds: ["EX-0007-0001-01"],
          annotated: [],
          digest: "c".repeat(64),
        },
      },
    ],
    expected: {
      condition: "obligation-unprocessed",
      subject: "EX-0007-0001-01",
      owner: "operator",
    },
  },
  {
    title: "stage-unaccepted",
    plant: (snapshot, facts) => [withoutStage(snapshot, "bounded-implement"), facts],
    expected: {
      condition: "stage-unaccepted",
      subject: "bounded-implement",
      owner: "qfai-implement",
    },
  },
  {
    title: "review-missing",
    plant: (snapshot, facts) => [
      {
        ...snapshot,
        acceptedStages: (snapshot.acceptedStages ?? []).map((stage) => ({
          ...stage,
          reviewResults: (stage.reviewResults ?? []).map((review) => ({
            ...review,
            verdict: "FAIL",
          })),
        })),
      },
      facts,
    ],
    expected: { condition: "review-missing", subject: "qa-gatekeeper", owner: "operator" },
  },
  {
    title: "verify-missing",
    plant: (snapshot, facts) => [withoutStage(snapshot, "bounded-verify"), facts],
    expected: { condition: "verify-missing", subject: "bounded-verify", owner: "qfai-verify" },
  },
  {
    title: "verify-foreign",
    plant: (snapshot, facts) => [
      snapshot,
      withCompletion(facts, {
        verifyReport: {
          runId: "run-20260924000000009",
          stageInstanceId: "bounded-verify",
          status: "PASS",
          scope: "full",
        },
      }),
    ],
    expected: { condition: "verify-foreign", subject: "verify.json", owner: "qfai-verify" },
  },
  {
    title: "gate-failed",
    plant: (snapshot, facts) => [
      snapshot,
      withCompletion(facts, {
        verifyReport: {
          runId: RUN_ID,
          stageInstanceId: "bounded-verify",
          status: "FAIL",
          scope: "full",
        },
      }),
    ],
    expected: { condition: "gate-failed", subject: "verify", owner: "operator" },
  },
  {
    title: "diff-out-of-scope",
    plant: (snapshot, facts) => [
      snapshot,
      withCompletion(facts, { changedPaths: ["src/notify/email.ts", "docs/notes.md"] }),
    ],
    expected: { condition: "diff-out-of-scope", subject: "docs/notes.md", owner: "operator" },
  },
  {
    title: "approval-unanswered",
    plant: (snapshot, facts) => [
      {
        ...snapshot,
        approval: {
          kind: "human_decision",
          operation: "CREATE",
          effect: "proceed",
          target: { kind: "new_story", slotId: "slot-3-1" },
        },
      },
      facts,
    ],
    expected: { condition: "approval-unanswered", subject: "slot-3-1", owner: "operator" },
  },
  {
    title: "debt-open",
    plant: (snapshot, facts) => [
      {
        ...snapshot,
        acceptedStages: (snapshot.acceptedStages ?? []).map((stage) =>
          stage.stageKind === "implement"
            ? { ...stage, outcome: "accepted_with_debt", debts: [debt] }
            : stage,
        ),
      },
      withCompletion(facts, {
        validate: {
          failOn: "error",
          findings: [{ code: debt.findingCode, severity: "warning", file: debt.path, refs: [] }],
        },
      }),
    ],
    expected: { condition: "debt-open", subject: "BF-0007", owner: "qfai-implement" },
  },
  {
    title: "tool-drift",
    plant: (snapshot, facts) => [snapshot, withCompletion(facts, { toolVersion: "2.0.1" })],
    expected: { condition: "tool-drift", subject: "tool-version", owner: "operator" },
  },
  {
    title: "policy-drift",
    plant: (snapshot, facts) => [
      snapshot,
      withCompletion(facts, { policyDigests: { "qfai.config.yaml": "e".repeat(64) } }),
    ],
    expected: { condition: "policy-drift", subject: "qfai.config.yaml", owner: "operator" },
  },
  {
    title: "run-waiting",
    plant: (snapshot, facts) => [
      {
        ...snapshot,
        run: { ...snapshot.run, state: "awaiting_input" },
        openQuestions: [
          {
            questionId: "question-9-1",
            kind: "decision",
            text: "Which retry policy applies?",
            options: [],
            selection: { min: 1, max: 1 },
          },
        ],
      },
      facts,
    ],
    expected: { condition: "run-waiting", subject: "question-9-1", owner: "operator" },
  },
];

for (const { title, plant, expected } of matrix) {
  it(title, () => {
    const [snapshot, facts] = plant(readySnapshot(), metFacts());
    const decision = finish(snapshot, facts);

    expect(decision.verdict.run).toEqual(snapshot.run);
    expect(decision.verdict.target).toBeUndefined();
    expect(decision.verdict.unmet).toEqual([expected]);
    expect(decision.events).toEqual([]);
  });
}

it("Decide finish on a run in ready whose facts meet every condition", () => {
  const snapshot = readySnapshot();
  const decision = finish(snapshot, metFacts());

  expect(decision.verdict).toEqual({
    ok: true,
    run: { ...snapshot.run, state: "completed", sequence: snapshot.run.sequence + 1 },
    target: "qfai_done",
    unmet: [],
    receipts: [{ gateId: "validate", verdict: "PASS", trustLevel: "cli_observed" }],
  });
  expect(decision.events).toEqual([
    {
      type: "validated-final-result-and-target",
      validate: { verdict: "PASS", findings: [], trustLevel: "cli_observed" },
    },
  ]);
});
