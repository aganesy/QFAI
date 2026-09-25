// QFAI:SPEC-0018:TC-0018-0016

import { expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";

it("TC-0018-0016 (TDD-0026): direct", () => {
  const specBinding = { specId: "spec-0018" };
  const plan = {
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
  let run = { id: "run-direct", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  const events: ReturnType<typeof decide>["events"] = [];
  const issued: {
    stageInstanceId: string;
    stageKind: string;
    skill: unknown;
    operation: unknown;
    target: unknown;
  }[] = [];
  const resultDocuments = new Map<string, { stageInstanceId: string; outcome: string }>();
  let replayFailure: string | null = null;

  for (const stage of plan.stages) {
    const next = decide({ run, plan, specBinding, acceptedStages }, { operation: "next" }, {});
    events.push(...next.events);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;

    issued.push({
      stageInstanceId: workOrder.stageInstanceId,
      stageKind: workOrder.stageKind,
      skill:
        "executor" in workOrder &&
        workOrder.executor &&
        typeof workOrder.executor === "object" &&
        "skill" in workOrder.executor
          ? workOrder.executor.skill
          : undefined,
      operation: "operation" in workOrder ? workOrder.operation : undefined,
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
        specBinding,
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

  const finalNext = decide({ run, plan, specBinding, acceptedStages }, { operation: "next" }, {});
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
        skill: "qfai-maintain",
        operation: "non-normative-edit",
        target: { kind: "spec", specId: "spec-0018" },
      },
      {
        stageInstanceId: "direct-verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
        target: { kind: "spec", specId: "spec-0018" },
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

it("TC-0018-0016 (TDD-0028): bounded-change", () => {
  const specBinding = { specId: "spec-0018" };
  const plan = {
    route: "bounded-change",
    stages: [
      {
        stageInstanceId: "bounded-sdd-delta",
        stageKind: "sdd_delta",
        skill: "qfai-sdd",
        operation: "delta-or-applicability-check",
        when: "always",
      },
      {
        stageInstanceId: "bounded-acceptance",
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        when: "acceptance_obligations_unmet",
      },
      {
        stageInstanceId: "bounded-implement",
        stageKind: "implement",
        skill: "qfai-implement",
        operation: "implement",
        when: "always",
      },
      {
        stageInstanceId: "bounded-verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
        when: "always",
      },
    ],
  };
  const facts = { acceptanceObligationsUnmet: true };
  let run = { id: "run-bounded", state: "ready", sequence: 4 };
  let acceptedStages: { stageInstanceId: string; stageKind: string; outcome: string }[] = [];
  const events: ReturnType<typeof decide>["events"] = [];
  const issued: {
    stageInstanceId: string;
    stageKind: string;
    skill: string | undefined;
    operation: string | undefined;
    target: unknown;
  }[] = [];
  const resultDocuments = new Map<string, { stageInstanceId: string; outcome: string }>();
  let replayFailure: string | null = null;

  for (const stage of plan.stages) {
    const next = decide({ run, plan, specBinding, acceptedStages }, { operation: "next" }, facts);
    events.push(...next.events);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;
    issued.push({
      stageInstanceId: workOrder.stageInstanceId,
      stageKind: workOrder.stageKind,
      skill: workOrder.executor?.skill,
      operation: workOrder.operation,
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
      { run: next.verdict.run, plan, specBinding, acceptedStages, outstandingWorkOrder: workOrder },
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
    { run, plan, specBinding, acceptedStages },
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
        skill: "qfai-sdd",
        operation: "delta-or-applicability-check",
        target: { kind: "spec", specId: "spec-0018" },
      },
      {
        stageInstanceId: "bounded-acceptance",
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        target: { kind: "spec", specId: "spec-0018" },
      },
      {
        stageInstanceId: "bounded-implement",
        stageKind: "implement",
        skill: "qfai-implement",
        operation: "implement",
        target: { kind: "spec", specId: "spec-0018" },
      },
      {
        stageInstanceId: "bounded-verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
        target: { kind: "spec", specId: "spec-0018" },
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

it("TC-0018-0016 (TDD-0027): bugfix", () => {
  const specBinding = { specId: "spec-0018" };
  const plan = {
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
        stageInstanceId: "bugfix-sdd-append",
        stageKind: "sdd_append",
        skill: "qfai-sdd",
        operation: "defect-row-seeding",
        when: "missing_test_row_needed",
      },
      {
        stageInstanceId: "bugfix-acceptance",
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        when: "acceptance_obligations_unmet",
      },
      {
        stageInstanceId: "bugfix-implement",
        stageKind: "implement",
        skill: "qfai-implement",
        operation: "implement",
        when: "missing_test_row_needed",
      },
      {
        stageInstanceId: "bugfix-regression-fix",
        stageKind: "regression_fix",
        skill: "qfai-implement",
        operation: "regression-fix",
        when: "regression_found",
      },
      {
        stageInstanceId: "bugfix-test-fix",
        stageKind: "test_fix",
        skill: "qfai-atdd",
        operation: "test-fix",
        when: "test_defect_found",
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
  const missingTestDiagnosis = {
    verdict: "missing-test",
    reproductionRef: "evidence/empty-value-reproduction.json",
    matchedRowIds: [],
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
    skill: string | undefined;
    operation: string | undefined;
    target: unknown;
  }[] = [];
  const events: ReturnType<typeof decide>["events"] = [];
  const resultDocuments = new Map<
    string,
    { stageInstanceId: string; outcome: string; diagnosis?: typeof missingTestDiagnosis }
  >();

  for (let index = 0; index < 5; index++) {
    const readySnapshot = { run, plan, specBinding, acceptedStages, diagnosis: replayedDiagnosis };
    const facts = { acceptanceObligationsUnmet };
    const next = decide(readySnapshot, { operation: "next" }, facts);
    events.push(...next.events);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;

    issued.push({
      stageInstanceId: workOrder.stageInstanceId,
      stageKind: workOrder.stageKind,
      skill: workOrder.executor?.skill,
      operation: workOrder.operation,
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
      specBinding,
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

  const finalSnapshot = { run, plan, specBinding, acceptedStages, diagnosis: replayedDiagnosis };
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
        skill: "qfai-implement",
        operation: "diagnose-only",
        target: { kind: "spec", specId: "spec-0018" },
      },
      {
        stageInstanceId: "bugfix-sdd-append",
        stageKind: "sdd_append",
        skill: "qfai-sdd",
        operation: "defect-row-seeding",
        target: { kind: "spec", specId: "spec-0018" },
      },
      {
        stageInstanceId: "bugfix-acceptance",
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        target: { kind: "spec", specId: "spec-0018" },
      },
      {
        stageInstanceId: "bugfix-implement",
        stageKind: "implement",
        skill: "qfai-implement",
        operation: "implement",
        target: { kind: "spec", specId: "spec-0018" },
      },
      {
        stageInstanceId: "bugfix-verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
        target: { kind: "spec", specId: "spec-0018" },
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
  const issued: { stageKind: string; skill: string | undefined; operation: string | undefined }[] =
    [];
  const acceptEvents: string[] = [];
  for (let index = 0; index < 10 && run.state === "ready"; index++) {
    const next = decide({ ...context, run, acceptedStages }, { operation: "next" }, facts);
    const workOrder = next.verdict.workOrder;
    if (!next.verdict.ok || !next.verdict.run || !workOrder) break;
    issued.push({
      stageKind: workOrder.stageKind,
      skill: workOrder.executor?.skill,
      operation: workOrder.operation,
    });
    const accepted = decide(
      { ...context, run: next.verdict.run, acceptedStages, outstandingWorkOrder: workOrder },
      {
        operation: "accept",
        result: {
          resultId: `result-${workOrder.stageInstanceId}`,
          workOrderId: workOrder.workOrderId,
          stageInstanceId: workOrder.stageInstanceId,
          attempt: workOrder.attempt,
          expectedSequence: next.verdict.run.sequence,
          outcome: "accepted",
        },
      },
      facts,
    );
    if (!accepted.verdict.ok || !accepted.verdict.run) break;
    acceptEvents.push(...accepted.events.map((event) => event.type));
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
      ? decide({ ...context, run, acceptedStages }, { operation: "next" }, facts)
      : null;
  return {
    issued,
    acceptEvents,
    finalState: run.state,
    finalWorkOrder: finalNext?.verdict.ok ? finalNext.verdict.workOrder : "not-issued",
  };
}

it("TC-0018-0016 (TDD-0029): feature", () => {
  const plan = {
    route: "feature",
    stages: [
      {
        stageInstanceId: "feature-sdd",
        stageKind: "sdd",
        skill: "qfai-sdd",
        operation: "new-capability",
        when: "always",
      },
      {
        stageInstanceId: "feature-acceptance",
        stageKind: "acceptance",
        skill: "qfai-atdd",
        operation: "author-acceptance-tests",
        when: "acceptance_obligations_unmet",
      },
      {
        stageInstanceId: "feature-implement",
        stageKind: "implement",
        skill: "qfai-implement",
        operation: "implement",
        when: "always",
      },
      {
        stageInstanceId: "feature-verify",
        stageKind: "verify",
        skill: "qfai-verify",
        operation: "verify-full",
        when: "always",
      },
    ],
  };
  const approval = {
    authorizationId: "authorization-4",
    kind: "human_decision",
    operation: "CREATE",
    effect: "proceed",
    target: { kind: "new_capability", slotId: "slot-3-1" },
  };

  const actual = driveWithCannedResults(
    { plan, approval },
    { id: "run-feature", state: "ready", sequence: 5 },
    { acceptanceObligationsUnmet: true },
  );
  const expected = {
    issued: plan.stages.map(({ stageKind, skill, operation }) => ({ stageKind, skill, operation })),
    acceptEvents: plan.stages.map(() => "accept-nonfinal-result"),
    finalState: "ready",
    finalWorkOrder: null,
  };
  expect(actual).toEqual(expected);
});

it("TC-0018-0016 (TDD-0030): discovery", () => {
  const plan = {
    route: "discovery",
    stages: [
      {
        stageInstanceId: "discovery-discussion",
        stageKind: "discussion",
        skill: "qfai-discussion",
        operation: "resolve-unsettled-product-scope",
        when: "full_discussion_needed",
      },
    ],
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
        skill: "qfai-discussion",
        operation: "resolve-unsettled-product-scope",
      },
    ],
    acceptEvents: ["scope-or-obligation-revision"],
    finalState: "routing",
    finalWorkOrder: "not-issued",
  };
  expect(actual).toEqual(expected);
});
