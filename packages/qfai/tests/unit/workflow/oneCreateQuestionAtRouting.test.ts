// QFAI:EX-0001-0192-01

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type {
  NormativeReferenceKind,
  ObservedReferenceKind,
  RouteReference,
} from "../../../src/core/workflow/parse.js";

it("Decide accept of a routing result whose checked proposal names one new story", () => {
  const snapshot = {
    run: { id: "run-routing", state: "routing", sequence: 2 },
    outstandingWorkOrder: {
      workOrderId: "routing-1",
      stageInstanceId: "routing-stage-1",
      attempt: 1,
      stageKind: "route",
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
        goal: "Let each customer register up to five unique notification emails.",
        expectedBehaviorRefs: [
          { kind: "request", ref: "request" },
        ] satisfies RouteReference<NormativeReferenceKind>[],
        observedRefs: [] satisfies RouteReference<ObservedReferenceKind>[],
        affectedFlowIds: [],
        riskSignals: [],
        unresolvedQuestions: [],
        newStories: [
          {
            goal: "Customer notification email registration",
            covers: ["Up to five unique emails per customer"],
            excludes: ["Notification delivery"],
            evidence: ["request"],
            flowId: "BF-0001",
          },
        ],
        proposedWriteScope: [".qfai/specs/BF-0018/**"],
        protectedTargets: [],
        requiredStages: ["sdd", "verify"],
        rationale: "No existing story owns notification email registration.",
      },
    },
  };

  const decision = decide(snapshot, input, {});
  const questions = decision.events
    .filter((event) => event.type === "question-opened")
    .map((event) => {
      const question = event.question;
      return {
        kind: question?.kind,
        effects: question?.options.map((option) => option.effect).sort(),
        recommendationIsOffered: question?.options.some(
          (option) => option.optionId === question.recommendation,
        ),
        slotId: question?.story?.slotId,
      };
    });

  const actual = {
    state: decision.verdict.run?.state,
    questions,
    workOrders: decision.events.filter((event) => event.type === "work-order-issued"),
  };
  const expected = {
    state: "awaiting_input",
    questions: [
      {
        kind: "create",
        effects: ["proceed", "stop"],
        recommendationIsOffered: true,
        slotId: expect.any(String),
      },
    ],
    workOrders: [],
  };
  expect(actual).toEqual(expected);
});

it("After a proceed answer, drive the feature plan to its last stage with canned accepted results", () => {
  const plan = {
    route: "feature",
    stages: [
      { stageInstanceId: "feature-sdd", stageKind: "sdd" },
      { stageInstanceId: "feature-acceptance", stageKind: "acceptance" },
      { stageInstanceId: "feature-implement", stageKind: "implement" },
      { stageInstanceId: "feature-verify", stageKind: "verify" },
    ],
  };
  const approval = {
    authorizationId: "authorization-4",
    kind: "human_decision",
    operation: "CREATE",
    effect: "proceed",
    target: { kind: "new_story", slotId: "slot-3-1" },
  };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  const postRoutingEvents: ReturnType<typeof decide>["events"] = [];
  const issuedStageKinds: string[] = [];
  let replayedResults: {
    resultId: string;
    stageInstanceId: string;
    stageKind: string;
    outcome: string;
  }[] = [];
  const resultDocuments = new Map<
    string,
    { resultId: string; stageInstanceId: string; outcome: string }
  >();
  let replayFailure: string | null = null;
  let run = { id: "run-feature", state: "ready", sequence: 5 };
  // The story-authoring stage binds the flow its new story joins; every later stage targets it.
  const bound = () => (acceptedStages.length > 0 ? { flowBinding: { flowId: "BF-0001" } } : {});

  for (const stage of plan.stages) {
    const readySnapshot = { run, plan, approval, acceptedStages, ...bound() };
    const next = decide(readySnapshot, { operation: "next" }, {});
    postRoutingEvents.push(...next.events);
    const candidate = "workOrder" in next.verdict ? next.verdict.workOrder : null;
    if (
      !next.verdict.ok ||
      !next.verdict.run ||
      !candidate ||
      typeof candidate !== "object" ||
      !("stageKind" in candidate) ||
      typeof candidate.stageKind !== "string" ||
      !("workOrderId" in candidate) ||
      typeof candidate.workOrderId !== "string" ||
      !("stageInstanceId" in candidate) ||
      typeof candidate.stageInstanceId !== "string" ||
      !("attempt" in candidate) ||
      typeof candidate.attempt !== "number"
    ) {
      break;
    }

    issuedStageKinds.push(candidate.stageKind);
    if (candidate.stageKind === "verify") break;

    const runningSnapshot = {
      run: next.verdict.run,
      plan,
      approval,
      acceptedStages,
      ...bound(),
      outstandingWorkOrder: {
        workOrderId: candidate.workOrderId,
        stageInstanceId: candidate.stageInstanceId,
        attempt: candidate.attempt,
        stageKind: candidate.stageKind,
      },
    };
    const resultId = `result-${stage.stageInstanceId}`;
    const cannedResult = {
      resultId,
      workOrderId: candidate.workOrderId,
      stageInstanceId: candidate.stageInstanceId,
      attempt: candidate.attempt,
      expectedSequence: next.verdict.run.sequence,
      outcome: "accepted",
    };
    resultDocuments.set(`results/${resultId}.json`, cannedResult);
    const accepted = decide(
      runningSnapshot,
      {
        operation: "accept",
        result: cannedResult,
      },
      {},
    );
    postRoutingEvents.push(...accepted.events);
    if (!accepted.verdict.ok || !accepted.verdict.run) break;

    const issuedWorkOrders = new Map<
      string,
      NonNullable<ReturnType<typeof decide>["events"][number]["workOrder"]>
    >();
    const replayed: typeof replayedResults = [];
    for (const event of postRoutingEvents) {
      if (event.type === "work-order-issued" && event.workOrder) {
        issuedWorkOrders.set(event.workOrder.stageInstanceId, event.workOrder);
      }
      if (event.type !== "accept-nonfinal-result") continue;

      const resultRef = "resultRef" in event ? event.resultRef : null;
      const stageInstanceId = "stageInstanceId" in event ? event.stageInstanceId : null;
      const outcome = "outcome" in event ? event.outcome : null;
      const document = typeof resultRef === "string" ? resultDocuments.get(resultRef) : undefined;
      const issued =
        typeof stageInstanceId === "string" ? issuedWorkOrders.get(stageInstanceId) : undefined;
      if (
        !document ||
        !issued ||
        document.stageInstanceId !== stageInstanceId ||
        document.outcome !== outcome
      ) {
        replayFailure = "accepted event lacks its result reference or stage identity";
        break;
      }
      replayed.push({
        resultId: document.resultId,
        stageInstanceId: document.stageInstanceId,
        stageKind: issued.stageKind,
        outcome: document.outcome,
      });
    }
    if (replayFailure) break;
    replayedResults = replayed;
    acceptedStages = replayedResults.map(({ stageInstanceId, stageKind, outcome }) => ({
      stageInstanceId,
      stageKind,
      outcome,
    }));
    run = accepted.verdict.run;
  }

  expect({
    issuedStageKinds,
    replayedResults,
    replayFailure,
    laterCreateQuestions: postRoutingEvents.filter(
      (event) => event.type === "question-opened" && event.question?.kind === "create",
    ).length,
  }).toEqual({
    issuedStageKinds: ["sdd", "acceptance", "implement", "verify"],
    replayedResults: [
      {
        resultId: "result-feature-sdd",
        stageInstanceId: "feature-sdd",
        stageKind: "sdd",
        outcome: "accepted",
      },
      {
        resultId: "result-feature-acceptance",
        stageInstanceId: "feature-acceptance",
        stageKind: "acceptance",
        outcome: "accepted",
      },
      {
        resultId: "result-feature-implement",
        stageInstanceId: "feature-implement",
        stageKind: "implement",
        outcome: "accepted",
      },
    ],
    replayFailure: null,
    laterCreateQuestions: 0,
  });
});
