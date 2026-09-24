// QFAI:SPEC-0018:TC-0018-0012

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

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
        expectedBehaviorRefs: ["request", missingNormativePath],
        observedRefs: [missingPath, missingRootFile, missingDotFile],
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
      [missingRootFile]: false,
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
