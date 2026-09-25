// QFAI:SPEC-0018:TC-0018-0012

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type {
  NormativeReferenceKind,
  ObservedReferenceKind,
  RouteReference,
} from "../../../src/core/workflow/parse.js";

it("TC-0018-0012 (TDD-0015): unknown-path", () => {
  const missingPath = "packages/qfai/src/core/workflow/missing-observed-reference.ts";
  const missingRootFile = "Dockerfile";
  const missingNormativePath = ".qfai/specs/missing/01_Spec.md";
  const missingDotFile = ".missing-observed-file";
  const snapshot = {
    run: { id: "run-unknown-path", state: "routing", sequence: 2 },
    outstandingWorkOrder: {
      workOrderId: "routing-1",
      stageInstanceId: "routing-stage-1",
      attempt: 1,
      stageKind: "routing",
    },
  };
  const input = {
    operation: "accept",
    result: {
      resultId: "routing-result-1",
      workOrderId: "routing-1",
      stageInstanceId: "routing-stage-1",
      attempt: 1,
      expectedSequence: 2,
      outcome: "accepted",
      testObservation: "not_applicable",
      changedFiles: [],
      artifactRefs: [],
      gateResults: [],
      reviewResults: [],
      debts: [],
      proposal: {
        requestKind: "change",
        candidateRoute: "feature",
        goal: "Let each customer register a notification email.",
        expectedBehaviorRefs: [
          { kind: "request", ref: "request" },
          { kind: "path", ref: missingNormativePath },
        ] satisfies RouteReference<NormativeReferenceKind>[],
        observedRefs: [
          { kind: "path", ref: missingPath },
          { kind: "path", ref: missingRootFile },
          { kind: "evidence", ref: missingDotFile },
        ] satisfies RouteReference<ObservedReferenceKind>[],
        affectedSpecIds: [],
        riskSignals: [],
        unresolvedQuestions: [],
        newCapabilities: [
          {
            goal: "Customer notification email registration",
            covers: ["One notification email per customer"],
            excludes: ["Notification delivery"],
            evidence: ["request"],
          },
        ],
        proposedWriteScope: [".qfai/specs/spec-0018/**"],
        protectedTargets: [],
        requiredStages: ["sdd", "verify"],
        rationale: "The requested capability is not yet specified.",
      },
    },
  };
  const facts = {
    now: "2026-09-25T00:00:00.000Z",
    pathExistence: {
      [missingPath]: false,
      [missingNormativePath]: false,
    },
  };

  const decision = decide(snapshot, input, facts);
  const refusalReasons =
    decision.verdict.error && "reasons" in decision.verdict.error
      ? decision.verdict.error.reasons
      : undefined;
  const actual = {
    ok: decision.verdict.ok,
    code: decision.verdict.error?.code,
    reasons: Array.isArray(refusalReasons)
      ? refusalReasons
          .map((item: { reason: string; subject: string }) => ({
            reason: item.reason,
            subject: item.subject,
          }))
          .sort((left, right) => left.subject.localeCompare(right.subject))
      : [],
    run: {
      state: decision.verdict.run?.state,
      sequence: decision.verdict.run?.sequence,
    },
    events: decision.events,
  };
  const expected = {
    ok: false,
    code: "proposal-refused",
    reasons: [missingPath, missingRootFile, missingNormativePath, missingDotFile]
      .map((subject) => ({ reason: "unknown-path", subject }))
      .sort((left, right) => left.subject.localeCompare(right.subject)),
    run: { state: "routing", sequence: 2 },
    events: [],
  };
  expect(actual).toEqual(expected);
});

type AcceptInput = Parameters<typeof decide>[1];
type Proposal = NonNullable<NonNullable<AcceptInput["result"]>["proposal"]>;

function checkedProposal(): Proposal {
  return {
    requestKind: "change",
    candidateRoute: "feature",
    goal: "Let each customer register a notification email.",
    expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
    observedRefs: [],
    affectedSpecIds: [],
    riskSignals: [],
    unresolvedQuestions: [],
    newCapabilities: [
      {
        goal: "Customer notification email registration",
        covers: ["One notification email per customer"],
        excludes: ["Notification delivery"],
        evidence: ["request"],
      },
    ],
    proposedWriteScope: ["src/notify/**"],
    protectedTargets: [],
    requiredStages: ["sdd", "verify"],
  };
}

function acceptRouting(proposal: Proposal, facts: Parameters<typeof decide>[2] = {}) {
  const decision = decide(
    {
      run: { id: "run-checks", state: "routing", sequence: 2 },
      outstandingWorkOrder: {
        workOrderId: "routing-1",
        stageInstanceId: "routing-stage-1",
        attempt: 1,
        stageKind: "routing",
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
        proposal,
      },
    },
    facts,
  );
  const error = decision.verdict.error;
  return {
    code: error?.code,
    reasons: error && "reasons" in error ? error.reasons : [],
    run: decision.verdict.run,
    events: decision.events,
  };
}

function refused(...reasons: { reason: string; subject: string }[]) {
  return {
    code: "proposal-refused",
    reasons,
    run: { id: "run-checks", state: "routing", sequence: 2 },
    events: [],
  };
}

it("TC-0018-0012 (TDD-0016): unknown-id", () => {
  const actual = acceptRouting(
    {
      ...checkedProposal(),
      expectedBehaviorRefs: [
        { kind: "request", ref: "request" },
        { kind: "spec-id", ref: "spec-9999" },
        { kind: "contract-id", ref: "CLI-MISSING" },
      ],
    },
    { specs: { "spec-0007": { lifecycle: "active" } }, contractIds: ["CLI-WF"] },
  );
  expect(actual).toEqual(
    refused(
      { reason: "unknown-id", subject: "spec-9999" },
      { reason: "unknown-id", subject: "CLI-MISSING" },
    ),
  );
});

it("TC-0018-0012 (TDD-0017): inactive-spec", () => {
  const actual = acceptRouting(
    { ...checkedProposal(), affectedSpecIds: ["spec-0007", "spec-0008"] },
    {
      specs: { "spec-0007": { lifecycle: "active" }, "spec-0008": { lifecycle: "retired" } },
    },
  );
  expect(actual).toEqual(refused({ reason: "inactive-spec", subject: "spec-0008" }));
});

it("TC-0018-0012 (TDD-0018): broken-reference", () => {
  const actual = acceptRouting(
    { ...checkedProposal(), affectedSpecIds: ["spec-0007"] },
    {
      specs: { "spec-0007": { lifecycle: "active" } },
      itemReferences: {
        "spec-0007#AC-0007-0003": "resolved",
        "spec-0007#BR-0007-0099": "unresolved",
      },
    },
  );
  expect(actual).toEqual(
    refused({ reason: "broken-reference", subject: "spec-0007#BR-0007-0099" }),
  );
});

it("TC-0018-0012 (TDD-0019): protected-surface", () => {
  const actual = acceptRouting({
    ...checkedProposal(),
    proposedWriteScope: [
      "tests/notify/**",
      ".qfai/runs/**",
      ".qfai/evidence/change-request-20260925.md",
      "src/notify/**",
    ],
    protectedTargets: ["src/notify/keys.ts"],
  });
  expect(actual).toEqual(
    refused(
      { reason: "protected-surface", subject: ".qfai/runs/**" },
      { reason: "protected-surface", subject: ".qfai/evidence/change-request-20260925.md" },
      { reason: "protected-surface", subject: "src/notify/**" },
    ),
  );
});

it("TC-0018-0012 (TDD-0020): scope-escape", () => {
  const actual = acceptRouting({
    ...checkedProposal(),
    proposedWriteScope: [
      "src/notify/**",
      "../sibling-project/**",
      "src/../../outside.ts",
      "/etc/hosts",
    ],
  });
  expect(actual).toEqual(
    refused(
      { reason: "scope-escape", subject: "../sibling-project/**" },
      { reason: "scope-escape", subject: "src/../../outside.ts" },
      { reason: "scope-escape", subject: "/etc/hosts" },
    ),
  );
});

it("TC-0018-0012 (TDD-0021): unresolved-approval", () => {
  const actual = acceptRouting({
    ...checkedProposal(),
    riskSignals: ["authorization-restored", "data-loss"],
    unresolvedQuestions: [],
  });
  expect(actual).toEqual(refused({ reason: "unresolved-approval", subject: "data-loss" }));
});

const featurePlan = {
  route: "feature",
  stages: [
    { stageInstanceId: "sdd", stageKind: "sdd", when: "always" },
    {
      stageInstanceId: "acceptance",
      stageKind: "acceptance",
      when: "acceptance_obligations_unmet",
    },
    { stageInstanceId: "implement", stageKind: "implement", when: "always" },
    { stageInstanceId: "verify", stageKind: "verify", when: "always" },
  ],
};

it("TC-0018-0012 (TDD-0022): stage-set", () => {
  const actual = acceptRouting(
    { ...checkedProposal(), requiredStages: ["sdd", "deploy"] },
    { plans: { feature: featurePlan } },
  );
  expect(actual).toEqual(
    refused(
      { reason: "stage-set", subject: "implement" },
      { reason: "stage-set", subject: "verify" },
      { reason: "stage-set", subject: "deploy" },
    ),
  );
});

const missingSpecReference: Proposal["expectedBehaviorRefs"] = [
  { kind: "request", ref: "request" },
  { kind: "spec-id", ref: "spec-9999" },
];

// QFAI:SPEC-0018:TC-0018-0013
it("TC-0018-0013 (TDD-0023): A proposal failing unknown-id and stage-set at once", () => {
  const actual = acceptRouting(
    { ...checkedProposal(), expectedBehaviorRefs: missingSpecReference, requiredStages: ["sdd"] },
    { specs: {}, plans: { feature: featurePlan } },
  );
  expect(actual).toEqual(
    refused(
      { reason: "unknown-id", subject: "spec-9999" },
      { reason: "stage-set", subject: "implement" },
      { reason: "stage-set", subject: "verify" },
    ),
  );
});

// QFAI:SPEC-0018:TC-0018-0014
it("TC-0018-0014 (TDD-0024): A proposal failing unknown-id with confidence", () => {
  const proposal = { ...checkedProposal(), expectedBehaviorRefs: missingSpecReference };
  const facts = { specs: {} };
  const withConfidence = acceptRouting({ ...proposal, confidence: 1 }, facts);
  expect(withConfidence).toEqual(acceptRouting(proposal, facts));
  expect(withConfidence).toEqual(refused({ reason: "unknown-id", subject: "spec-9999" }));
});
