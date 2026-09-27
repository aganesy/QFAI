// QFAI:EX-0001-0192-10

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { kindSteps, planStage } from "./kindSteps.js";

type Steps = ReturnType<typeof kindSteps>;

it("direct", () => {
  const flowBinding = { flowId: "BF-0018" };
  const plan = {
    route: "direct",
    stages: [planStage("direct-edit", "maintenance"), planStage("direct-verify", "verify")],
  };
  let run = { id: "run-direct", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  const events: ReturnType<typeof decide>["events"] = [];
  const issued: {
    stageInstanceId: string;
    stageKind: string;
    steps: unknown;
    target: unknown;
  }[] = [];
  const resultDocuments = new Map<string, { stageInstanceId: string; outcome: string }>();
  let replayFailure: string | null = null;

  for (const stage of plan.stages) {
    const next = decide({ run, plan, flowBinding, acceptedStages }, { operation: "next" }, {});
    events.push(...next.events);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;

    issued.push({
      stageInstanceId: workOrder.stageInstanceId,
      stageKind: workOrder.stageKind,
      steps: workOrder.steps,
      target: workOrder.target,
    });

    const resultId = `result-${stage.stageInstanceId}`;
    const result = {
      resultId,
      workOrderId: workOrder.workOrderId,
      stageInstanceId: workOrder.stageInstanceId,
      attempt: workOrder.attempt,
      expectedSequence: next.verdict.run.sequence,
      outcome: "accepted",
    };
    resultDocuments.set(`results/${resultId}.json`, result);
    const accepted = decide(
      {
        run: next.verdict.run,
        plan,
        flowBinding,
        acceptedStages,
        outstandingWorkOrder: workOrder,
      },
      { operation: "accept", result },
      {},
    );
    events.push(...accepted.events);
    if (!accepted.verdict.ok || !accepted.verdict.run) break;

    const issuedByStage = new Map<
      string,
      NonNullable<ReturnType<typeof decide>["events"][number]["workOrder"]>
    >();
    for (const event of events) {
      if (event.type === "work-order-issued" && event.workOrder) {
        issuedByStage.set(event.workOrder.stageInstanceId, event.workOrder);
      }
    }
    const replayed: typeof acceptedStages = [];
    for (const event of events.filter((entry) => entry.type === "accept-nonfinal-result")) {
      const document = event.resultRef ? resultDocuments.get(event.resultRef) : undefined;
      const original = event.stageInstanceId ? issuedByStage.get(event.stageInstanceId) : undefined;
      if (
        !document ||
        !original ||
        document.stageInstanceId !== event.stageInstanceId ||
        document.outcome !== event.outcome
      ) {
        replayFailure = "accepted event lacks its result reference or stage identity";
        break;
      }
      replayed.push({
        stageInstanceId: document.stageInstanceId,
        stageKind: original.stageKind,
        outcome: document.outcome,
      });
    }
    if (replayFailure) break;
    acceptedStages = replayed;
    run = accepted.verdict.run;
  }

  const finalNext = decide({ run, plan, flowBinding, acceptedStages }, { operation: "next" }, {});
  const actual = {
    issued,
    acceptedStages,
    replayFailure,
    finalNextOk: finalNext.verdict.ok,
    finalRunState: finalNext.verdict.run?.state,
    finalWorkOrder: finalNext.verdict.workOrder,
    finalEvents: finalNext.events,
  };
  const expected = {
    issued: [
      {
        stageInstanceId: "direct-edit",
        stageKind: "maintenance",
        steps: kindSteps("maintenance"),
        target: undefined,
      },
      {
        stageInstanceId: "direct-verify",
        stageKind: "verify",
        steps: kindSteps("verify"),
        target: undefined,
      },
    ],
    acceptedStages: [
      { stageInstanceId: "direct-edit", stageKind: "maintenance", outcome: "accepted" },
      { stageInstanceId: "direct-verify", stageKind: "verify", outcome: "accepted" },
    ],
    replayFailure: null,
    finalNextOk: true,
    finalRunState: "ready",
    finalWorkOrder: null,
    finalEvents: [],
  };
  expect(actual).toEqual(expected);
});

it("bounded-change", () => {
  const flowBinding = { flowId: "BF-0018" };
  const plan = {
    route: "bounded-change",
    stages: [
      planStage("bounded-sdd-delta", "sdd_delta", "always"),
      planStage("bounded-acceptance", "acceptance", "acceptance_obligations_unmet"),
      planStage("bounded-implement", "implement", "always"),
      planStage("bounded-verify", "verify", "always"),
    ],
  };
  const facts = { acceptanceObligationsUnmet: true };
  let run = { id: "run-bounded", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  const events: ReturnType<typeof decide>["events"] = [];
  const issued: {
    stageInstanceId: string;
    stageKind: string;
    steps: Steps | undefined;
    target: unknown;
  }[] = [];
  const resultDocuments = new Map<string, { stageInstanceId: string; outcome: string }>();
  let replayFailure: string | null = null;

  for (const stage of plan.stages) {
    const next = decide({ run, plan, flowBinding, acceptedStages }, { operation: "next" }, facts);
    events.push(...next.events);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;
    issued.push({
      stageInstanceId: workOrder.stageInstanceId,
      stageKind: workOrder.stageKind,
      steps: workOrder.steps,
      target: workOrder.target,
    });

    const resultId = `result-${stage.stageInstanceId}`;
    const result = {
      resultId,
      workOrderId: workOrder.workOrderId,
      stageInstanceId: workOrder.stageInstanceId,
      attempt: workOrder.attempt,
      expectedSequence: next.verdict.run.sequence,
      outcome: "accepted",
    };
    resultDocuments.set(`results/${resultId}.json`, result);
    const accepted = decide(
      { run: next.verdict.run, plan, flowBinding, acceptedStages, outstandingWorkOrder: workOrder },
      { operation: "accept", result },
      facts,
    );
    events.push(...accepted.events);
    if (!accepted.verdict.ok || !accepted.verdict.run) break;

    const issuedByStage = new Map<
      string,
      NonNullable<ReturnType<typeof decide>["events"][number]["workOrder"]>
    >();
    for (const event of events) {
      if (event.type === "work-order-issued" && event.workOrder) {
        issuedByStage.set(event.workOrder.stageInstanceId, event.workOrder);
      }
    }
    const replayed: typeof acceptedStages = [];
    for (const event of events.filter((entry) => entry.type === "accept-nonfinal-result")) {
      const document = event.resultRef ? resultDocuments.get(event.resultRef) : undefined;
      const original = event.stageInstanceId ? issuedByStage.get(event.stageInstanceId) : undefined;
      if (
        !document ||
        !original ||
        document.stageInstanceId !== event.stageInstanceId ||
        document.outcome !== event.outcome
      ) {
        replayFailure = "accepted event lacks its result reference or stage identity";
        break;
      }
      replayed.push({
        stageInstanceId: document.stageInstanceId,
        stageKind: original.stageKind,
        outcome: document.outcome,
      });
    }
    if (replayFailure) break;
    acceptedStages = replayed;
    run = accepted.verdict.run;
  }

  const finalNext = decide(
    { run, plan, flowBinding, acceptedStages },
    { operation: "next" },
    facts,
  );
  const actual = {
    issued,
    acceptedStages,
    replayFailure,
    finalNextOk: finalNext.verdict.ok,
    finalRunState: finalNext.verdict.run?.state,
    finalWorkOrder: finalNext.verdict.workOrder,
    finalEvents: finalNext.events,
  };
  const expected = {
    issued: [
      {
        stageInstanceId: "bounded-sdd-delta",
        stageKind: "sdd_delta",
        steps: kindSteps("sdd_delta"),
        target: { kind: "flow", flowId: "BF-0018" },
      },
      {
        stageInstanceId: "bounded-acceptance",
        stageKind: "acceptance",
        steps: kindSteps("acceptance"),
        target: { kind: "flow", flowId: "BF-0018" },
      },
      {
        stageInstanceId: "bounded-implement",
        stageKind: "implement",
        steps: kindSteps("implement"),
        target: { kind: "flow", flowId: "BF-0018" },
      },
      {
        stageInstanceId: "bounded-verify",
        stageKind: "verify",
        steps: kindSteps("verify"),
        target: undefined,
      },
    ],
    acceptedStages: [
      { stageInstanceId: "bounded-sdd-delta", stageKind: "sdd_delta", outcome: "accepted" },
      { stageInstanceId: "bounded-acceptance", stageKind: "acceptance", outcome: "accepted" },
      { stageInstanceId: "bounded-implement", stageKind: "implement", outcome: "accepted" },
      { stageInstanceId: "bounded-verify", stageKind: "verify", outcome: "accepted" },
    ],
    replayFailure: null,
    finalNextOk: true,
    finalRunState: "ready",
    finalWorkOrder: null,
    finalEvents: [],
  };
  expect(actual).toEqual(expected);
});

it("bugfix", () => {
  const flowBinding = { flowId: "BF-0018" };
  const plan = {
    route: "bugfix",
    stages: [
      planStage("bugfix-diagnose", "diagnose", "always"),
      planStage("bugfix-sdd-append", "sdd_append", "missing_example_needed"),
      planStage("bugfix-acceptance", "acceptance", "acceptance_obligations_unmet"),
      planStage("bugfix-implement", "implement", "missing_example_needed"),
      planStage("bugfix-regression-fix", "regression_fix", "regression_found"),
      planStage("bugfix-test-fix", "test_fix", "test_defect_found"),
      planStage("bugfix-verify", "verify", "always"),
    ],
  };
  const missingTestDiagnosis = {
    verdict: "missing-test",
    reproductionRef: "evidence/empty-value-reproduction.json",
    matchedIds: [],
  };
  const appendedRow = { rowId: "TDD-NEW", layer: "Integration" } as const;
  let run = { id: "run-bugfix", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  let replayedDiagnosis: typeof missingTestDiagnosis | null = null;
  let acceptanceObligationsUnmet = false;
  let replayFailure: string | null = null;
  const issued: {
    stageInstanceId: string;
    stageKind: string;
    steps: Steps | undefined;
    target: unknown;
  }[] = [];
  const events: ReturnType<typeof decide>["events"] = [];
  const resultDocuments = new Map<
    string,
    { stageInstanceId: string; outcome: string; diagnosis?: typeof missingTestDiagnosis }
  >();

  for (let index = 0; index < 5; index++) {
    const readySnapshot = { run, plan, flowBinding, acceptedStages, diagnosis: replayedDiagnosis };
    const facts = { acceptanceObligationsUnmet };
    const next = decide(readySnapshot, { operation: "next" }, facts);
    events.push(...next.events);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;

    issued.push({
      stageInstanceId: workOrder.stageInstanceId,
      stageKind: workOrder.stageKind,
      steps: workOrder.steps,
      target: workOrder.target,
    });

    const resultId = `result-${workOrder.stageInstanceId}`;
    const result = {
      resultId,
      workOrderId: workOrder.workOrderId,
      stageInstanceId: workOrder.stageInstanceId,
      attempt: workOrder.attempt,
      expectedSequence: next.verdict.run.sequence,
      outcome: "accepted",
      ...(workOrder.stageKind === "diagnose" ? { diagnosis: missingTestDiagnosis } : {}),
    };
    resultDocuments.set(`results/${resultId}.json`, result);
    const runningSnapshot = {
      run: next.verdict.run,
      plan,
      flowBinding,
      acceptedStages,
      diagnosis: replayedDiagnosis,
      outstandingWorkOrder: workOrder,
    };
    const accepted = decide(runningSnapshot, { operation: "accept", result }, facts);
    events.push(...accepted.events);
    if (!accepted.verdict.ok || !accepted.verdict.run) break;

    const issuedByStage = new Map<
      string,
      NonNullable<ReturnType<typeof decide>["events"][number]["workOrder"]>
    >();
    for (const event of events) {
      if (event.type === "work-order-issued" && event.workOrder) {
        issuedByStage.set(event.workOrder.stageInstanceId, event.workOrder);
      }
    }
    const replayed: typeof acceptedStages = [];
    for (const event of events.filter((entry) => entry.type === "accept-nonfinal-result")) {
      const document = event.resultRef ? resultDocuments.get(event.resultRef) : undefined;
      const original = event.stageInstanceId ? issuedByStage.get(event.stageInstanceId) : undefined;
      if (
        !document ||
        !original ||
        document.stageInstanceId !== event.stageInstanceId ||
        document.outcome !== event.outcome
      ) {
        replayFailure = "accepted event lacks its result reference or stage identity";
        break;
      }
      replayed.push({
        stageInstanceId: document.stageInstanceId,
        stageKind: original.stageKind,
        outcome: document.outcome,
      });
      if (document.diagnosis) replayedDiagnosis = document.diagnosis;
    }
    if (replayFailure) break;
    acceptedStages = replayed;
    run = accepted.verdict.run;
    if (workOrder.stageKind === "sdd_append") {
      acceptanceObligationsUnmet = appendedRow.layer === "Integration";
    }
  }

  const finalSnapshot = { run, plan, flowBinding, acceptedStages, diagnosis: replayedDiagnosis };
  const finalNext = decide(finalSnapshot, { operation: "next" }, { acceptanceObligationsUnmet });
  const actual = {
    issued,
    acceptedStages,
    replayedDiagnosis,
    replayFailure,
    finalNextOk: finalNext.verdict.ok,
    finalRunState: finalNext.verdict.run?.state,
    finalWorkOrder: finalNext.verdict.workOrder,
    finalEvents: finalNext.events,
  };
  const expected = {
    issued: [
      {
        stageInstanceId: "bugfix-diagnose",
        stageKind: "diagnose",
        steps: kindSteps("diagnose"),
        target: { kind: "flow", flowId: "BF-0018" },
      },
      {
        stageInstanceId: "bugfix-sdd-append",
        stageKind: "sdd_append",
        steps: kindSteps("sdd_append"),
        target: { kind: "flow", flowId: "BF-0018" },
      },
      {
        stageInstanceId: "bugfix-acceptance",
        stageKind: "acceptance",
        steps: kindSteps("acceptance"),
        target: { kind: "flow", flowId: "BF-0018" },
      },
      {
        stageInstanceId: "bugfix-implement",
        stageKind: "implement",
        steps: kindSteps("implement"),
        target: { kind: "flow", flowId: "BF-0018" },
      },
      {
        stageInstanceId: "bugfix-verify",
        stageKind: "verify",
        steps: kindSteps("verify"),
        target: undefined,
      },
    ],
    acceptedStages: [
      { stageInstanceId: "bugfix-diagnose", stageKind: "diagnose", outcome: "accepted" },
      { stageInstanceId: "bugfix-sdd-append", stageKind: "sdd_append", outcome: "accepted" },
      { stageInstanceId: "bugfix-acceptance", stageKind: "acceptance", outcome: "accepted" },
      { stageInstanceId: "bugfix-implement", stageKind: "implement", outcome: "accepted" },
      { stageInstanceId: "bugfix-verify", stageKind: "verify", outcome: "accepted" },
    ],
    replayedDiagnosis: missingTestDiagnosis,
    replayFailure: null,
    finalNextOk: true,
    finalRunState: "ready",
    finalWorkOrder: null,
    finalEvents: [],
  };
  expect(actual).toEqual(expected);
});

type DecideSnapshot = Parameters<typeof decide>[0];

function driveWithCannedResults(
  context: Omit<DecideSnapshot, "run" | "acceptedStages" | "outstandingWorkOrder">,
  start: DecideSnapshot["run"],
  facts: Parameters<typeof decide>[2],
) {
  let run = start;
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  const issued: { stageKind: string; steps: Steps | undefined }[] = [];
  const acceptEvents: string[] = [];
  // The flow a story-authoring stage binds, which every later stage targets.
  let bound = {};
  for (let index = 0; index < 10 && run.state === "ready"; index++) {
    const next = decide(
      { ...context, ...bound, run, acceptedStages },
      { operation: "next" },
      facts,
    );
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;
    issued.push({
      stageKind: workOrder.stageKind,
      steps: workOrder.steps,
    });
    const accepted = decide(
      {
        ...context,
        ...bound,
        run: next.verdict.run,
        acceptedStages,
        outstandingWorkOrder: workOrder,
      },
      {
        operation: "accept",
        result: {
          resultId: `result-${workOrder.stageInstanceId}`,
          workOrderId: workOrder.workOrderId,
          stageInstanceId: workOrder.stageInstanceId,
          attempt: workOrder.attempt,
          expectedSequence: next.verdict.run.sequence,
          outcome: "accepted",
          ...(workOrder.target?.kind === "new_story"
            ? {
                bindings: [
                  {
                    slotId: workOrder.target.slotId,
                    flowId: "BF-0001",
                    storyIds: ["US-0001-0001"],
                  },
                ],
              }
            : {}),
        },
      },
      facts,
    );
    if (!accepted.verdict.ok || !accepted.verdict.run) break;
    acceptEvents.push(...accepted.events.map((event) => event.type));
    const binding = accepted.events.find((event) => event.binding)?.binding;
    if (binding) bound = { flowBinding: { flowId: binding.flowId } };
    acceptedStages = [
      ...acceptedStages,
      {
        stageInstanceId: workOrder.stageInstanceId,
        stageKind: workOrder.stageKind,
        outcome: "accepted",
      },
    ];
    run = accepted.verdict.run;
  }
  const finalNext =
    run.state === "ready"
      ? decide({ ...context, ...bound, run, acceptedStages }, { operation: "next" }, facts)
      : null;
  return {
    issued,
    acceptEvents,
    finalState: run.state,
    finalWorkOrder: finalNext?.verdict.ok ? finalNext.verdict.workOrder : "not-issued",
  };
}

it("feature", () => {
  const plan = {
    route: "feature",
    stages: [
      planStage("feature-sdd", "sdd", "always"),
      planStage("feature-acceptance", "acceptance", "acceptance_obligations_unmet"),
      planStage("feature-implement", "implement", "always"),
      planStage("feature-verify", "verify", "always"),
    ],
  };
  const approval = {
    authorizationId: "authorization-4",
    kind: "human_decision",
    operation: "CREATE",
    effect: "proceed",
    target: { kind: "new_story", slotId: "slot-3-1" },
  };

  const actual = driveWithCannedResults(
    { plan, approval },
    { id: "run-feature", state: "ready", sequence: 5 },
    { acceptanceObligationsUnmet: true },
  );
  const expected = {
    issued: plan.stages.map(({ stageKind }) => ({ stageKind, steps: kindSteps(stageKind) })),
    acceptEvents: plan.stages.flatMap(({ stageKind }) =>
      stageKind === "sdd"
        ? ["accept-nonfinal-result", "binding-recorded"]
        : ["accept-nonfinal-result"],
    ),
    finalState: "ready",
    finalWorkOrder: null,
  };
  expect(actual).toEqual(expected);
});

it("discovery", () => {
  const plan = {
    route: "discovery",
    stages: [planStage("discovery-discussion", "discussion", "full_discussion_needed")],
  };

  const actual = driveWithCannedResults(
    { plan },
    { id: "run-discovery", state: "ready", sequence: 5 },
    {},
  );
  const expected = {
    issued: [
      {
        stageKind: "discussion",
        steps: kindSteps("discussion"),
      },
    ],
    acceptEvents: ["scope-or-obligation-revision"],
    finalState: "routing",
    finalWorkOrder: "not-issued",
  };
  expect(actual).toEqual(expected);
});
