// QFAI:SPEC-0018:TC-0018-0084

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

const boundedStages = [
  ["bounded-sdd-delta", "sdd_delta", "qfai-sdd", "delta-or-applicability-check"],
  ["bounded-implement", "implement", "qfai-implement", "implement"],
  ["bounded-verify", "verify", "qfai-verify", "verify-full"],
].map(([stageInstanceId = "", stageKind = "", skill = "", operation = ""]) => ({
  stageInstanceId,
  stageKind,
  skill,
  operation,
  when: "always",
}));
const facts = {
  plans: { "bounded-change": { route: "bounded-change", stages: boundedStages } },
  specs: { "spec-0007": { lifecycle: "active" } },
};

function routeWithRisk(signal: string) {
  const question = {
    kind: "decision",
    text: `This change carries the risk ${signal}. Go ahead with it?`,
    options: [
      {
        optionId: "go-ahead",
        label: "Go ahead",
        description: "The run continues with the change as proposed.",
        effect: "proceed",
      },
      {
        optionId: "stop",
        label: "Stop",
        description: "The run ends and nothing more is written.",
        effect: "stop",
      },
    ],
    selection: { min: 1, max: 1 },
    recommendation: "stop",
  };
  const decision = decide(
    {
      run: { id: "run-risk", state: "routing", sequence: 2 },
      outstandingWorkOrder: {
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        stageKind: "route",
      },
    },
    {
      operation: "accept",
      result: {
        resultId: "routing-result-1",
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        expectedSequence: 2,
        outcome: "accepted",
        proposal: {
          requestKind: "change",
          candidateRoute: "bounded-change",
          goal: "Change how user records are stored.",
          expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
          observedRefs: [],
          affectedSpecIds: ["spec-0007"],
          riskSignals: [signal],
          unresolvedQuestions: [question],
          newCapabilities: [],
          proposedWriteScope: ["src/users/**"],
          protectedTargets: [],
          requiredStages: ["sdd_delta", "implement", "verify"],
        },
      },
    },
    facts,
  );
  const open = decision.verdict.questions ?? [];
  return {
    state: decision.verdict.run?.state,
    questions: open.map(({ kind, text }) => ({ kind, text })),
    events: decision.events.map((event) => event.type),
    expectedText: question.text,
  };
}

const signals: [string, string][] = [
  ["TC-0018-0084 (TDD-0104): data-loss", "data-loss"],
  ["TC-0018-0084 (TDD-0105): breaking-public-contract", "breaking-public-contract"],
  ["TC-0018-0084 (TDD-0106): authorization-loosened", "authorization-loosened"],
  ["TC-0018-0084 (TDD-0107): secret-egress", "secret-egress"],
  ["TC-0018-0084 (TDD-0108): production-effect", "production-effect"],
  ["TC-0018-0084 (TDD-0109): requirement-dropped", "requirement-dropped"],
  ["TC-0018-0084 (TDD-0110): out-of-scope-work", "out-of-scope-work"],
];

for (const [title, signal] of signals) {
  it(title, () => {
    const { expectedText, ...actual } = routeWithRisk(signal);

    expect(actual).toEqual({
      state: "awaiting_input",
      questions: [{ kind: "decision", text: expectedText }],
      events: ["question-opened", "unsettled-material-input"],
    });
  });
}
