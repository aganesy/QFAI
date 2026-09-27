// QFAI:AC-0001-0216-01
// QFAI:AC-0001-0216-02
// QFAI:AC-0001-0216-03
// QFAI:AC-0001-0216-04
// QFAI:AC-0001-0216-05
// QFAI:AC-0001-0216-06

import { describe, expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import type { WorkflowProposal } from "../../../src/core/workflow/types.js";
import { issuedSteps, planStage } from "../../unit/workflow/kindSteps.js";

type Snapshot = NonNullable<Parameters<typeof decide>[0]>;
type Facts = Parameters<typeof decide>[2];
type WorkOrder = NonNullable<Snapshot["outstandingWorkOrder"]>;

const FLOW = { flowId: "BF-0001" };

const REVIEWERS: NonNullable<Facts["reviewerRoles"]> = {
  "sdd-triage": ["completion-reviewer"],
  "sdd-flow": ["completion-reviewer"],
  "sdd-story": ["completion-reviewer"],
  "sdd-contract": ["completion-reviewer", "architecture-reviewer"],
  "common-design-md": ["completion-reviewer", "product-surface-reviewer"],
  "sdd-gate": ["completion-reviewer"],
  "atdd-author": ["completion-reviewer", "qa-gatekeeper"],
  "atdd-credentials": ["completion-reviewer"],
  "implement-tdd": ["completion-reviewer", "qa-gatekeeper", "implementation-reviewer"],
  "implement-checkpoint": ["completion-reviewer", "qa-gatekeeper"],
};

function boundedPlan(optionalSteps: string[] = [], riskSignals: string[] = []) {
  return {
    route: "bounded-change",
    writeScope: ["src/**"],
    ...(optionalSteps.length > 0 ? { optionalSteps } : {}),
    ...(riskSignals.length > 0 ? { riskSignals } : {}),
    stages: [
      planStage("sdd-delta", "sdd_delta", "always"),
      planStage("acceptance", "acceptance", "acceptance_obligations_unmet"),
      planStage("implement", "implement", "always"),
      planStage("verify", "verify", "always"),
    ],
  };
}

const facts: Facts = { acceptanceObligationsUnmet: true, reviewerRoles: REVIEWERS };

// The work order `next` issues on a ready run of the plan, after the stages already accepted.
function issued(
  plan: NonNullable<Snapshot["plan"]>,
  accepted: string[] = [],
  extra: Partial<Snapshot> = {},
) {
  const kinds: Record<string, string> = { "sdd-delta": "sdd_delta", acceptance: "acceptance" };
  const acceptedStages = accepted.map((id) => ({
    stageInstanceId: id,
    stageKind: kinds[id] ?? id.replace("-", "_"),
    outcome: "accepted",
  }));
  const snapshot = {
    run: { id: "run-steps", state: "ready", sequence: 5 },
    plan,
    flowBinding: FLOW,
    acceptedStages,
    ...extra,
  };
  const decision = decide(snapshot, { operation: "next" }, facts);
  const workOrder = decision.verdict.workOrder;
  if (!workOrder) throw new Error("next issues a work order");
  return { snapshot, decision, workOrder };
}

function names(workOrder: WorkOrder): string[] {
  return (workOrder.steps ?? []).map((step) => step.name);
}

describe("a stage runs its steps and the proposed ones the request needs", () => {
  // QFAI:EX-0001-0216-01
  // QFAI:EX-0001-0216-05
  it("names the proposed contract step between the story and the gate, with each path", () => {
    const { workOrder } = issued(boundedPlan(["sdd-contract"]));

    expect({
      steps: workOrder.steps,
      executor: "executor" in workOrder,
      operation: "operation" in workOrder,
    }).toEqual({
      steps: issuedSteps("sdd-triage", "sdd-story", "sdd-contract", "sdd-gate"),
      executor: false,
      operation: false,
    });
  });

  // QFAI:EX-0001-0216-02
  it("leaves every proposed step out when none is proposed, and runs a proposed one", () => {
    const sdd = issued(boundedPlan()).workOrder;
    const bugfix = {
      route: "bugfix",
      writeScope: ["src/**"],
      optionalSteps: ["atdd-credentials"],
      stages: [
        planStage("diagnose", "diagnose", "always"),
        planStage("sdd-append", "sdd_append", "missing_example_needed"),
        planStage("acceptance", "acceptance", "acceptance_obligations_unmet"),
        planStage("implement", "implement", "diagnosis_missing_test"),
        planStage("verify", "verify", "always"),
      ],
    };
    const diagnosis = {
      verdict: "missing-test",
      reproductionRef: "tests/export.test.ts",
      matchedIds: ["AC-0001-0001-01"],
    };
    const acceptance = issued(bugfix, ["diagnose", "sdd-append"], { diagnosis }).workOrder;

    expect([names(sdd), names(acceptance)]).toEqual([
      ["sdd-triage", "sdd-story", "sdd-gate"],
      ["atdd-scaffold", "atdd-credentials", "atdd-author"],
    ]);
  });

  // QFAI:EX-0001-0216-06
  it("requires the union of the active steps' reviewers, each once", () => {
    const withContract = issued(boundedPlan(["sdd-contract"])).workOrder;
    const without = issued(boundedPlan()).workOrder;
    const acceptance = issued(boundedPlan(), ["sdd-delta"]).workOrder;

    expect([
      withContract.requiredReviewerRoles,
      without.requiredReviewerRoles,
      names(acceptance),
      acceptance.requiredReviewerRoles,
    ]).toEqual([
      ["completion-reviewer", "architecture-reviewer"],
      ["completion-reviewer"],
      ["atdd-scaffold", "atdd-author"],
      ["completion-reviewer", "qa-gatekeeper"],
    ]);
  });

  // QFAI:EX-0001-0216-08
  it("raises only the implementation steps' review in a run restoring an authorization", () => {
    const plan = boundedPlan(["sdd-contract"], ["authorization-restored"]);
    const heavy = ["completion-reviewer", "qa-gatekeeper", "implementation-reviewer"];

    expect([
      issued(plan).workOrder.requiredReviewerRoles,
      issued(plan, ["sdd-delta"]).workOrder.requiredReviewerRoles,
      issued(plan, ["sdd-delta", "acceptance"]).workOrder.requiredReviewerRoles,
    ]).toEqual([["completion-reviewer", "architecture-reviewer"], heavy, heavy]);
  });

  // QFAI:EX-0001-0216-07
  it("accepts one result for the whole work order, with one verdict per required role", () => {
    const { decision, snapshot, workOrder } = issued(boundedPlan(), ["sdd-delta"]);
    const run = decision.verdict.run;
    if (!run) throw new Error("next moved the run");
    const accepted = decide(
      { ...snapshot, run, outstandingWorkOrder: workOrder },
      {
        operation: "accept",
        result: {
          resultId: "acceptance-1",
          workOrderId: workOrder.workOrderId,
          stageInstanceId: workOrder.stageInstanceId,
          attempt: workOrder.attempt,
          expectedSequence: run.sequence,
          outcome: "accepted",
          actor: { agentInstance: "author-1" },
          reviewResults: [
            { role: "completion-reviewer", agentInstance: "cr-1", verdict: "PASS", reportRef: "a" },
            { role: "qa-gatekeeper", agentInstance: "qa-1", verdict: "PASS", reportRef: "b" },
          ],
        },
      },
      facts,
    );

    expect([accepted.verdict.ok, accepted.verdict.run?.state]).toEqual([true, "ready"]);
  });

  // QFAI:EX-0001-0216-04
  it("returns the run to routing when the stage finds it needs an unproposed step", () => {
    const { decision, snapshot, workOrder } = issued(boundedPlan());
    const run = decision.verdict.run;
    if (!run) throw new Error("next moved the run");
    const result = {
      resultId: "sdd-delta-1",
      workOrderId: workOrder.workOrderId,
      stageInstanceId: workOrder.stageInstanceId,
      attempt: workOrder.attempt,
      expectedSequence: run.sequence,
      outcome: "needs_repair",
      actor: { agentInstance: "author-1" },
      debts: [
        {
          findingCode: "rule-needed",
          path: ".qfai/spec/03_contract/api/orders.md",
          cause: "The change needs a new business rule.",
          owningFlow: "BF-0001",
          detectingCommand: "sdd-story review",
          resolvingOwner: "sdd-contract",
          blockingExtent: "stage",
        },
      ],
    };
    const repaired = decide(
      { ...snapshot, run, outstandingWorkOrder: workOrder },
      { operation: "accept", result },
      facts,
    );
    const reissued = issued(boundedPlan(["sdd-contract"])).workOrder;

    expect({
      state: repaired.verdict.run?.state,
      events: repaired.events.map((event) => event.type),
      first: names(workOrder),
      after: names(reissued),
    }).toEqual({
      state: "routing",
      events: ["scope-or-obligation-revision"],
      first: ["sdd-triage", "sdd-story", "sdd-gate"],
      after: ["sdd-triage", "sdd-story", "sdd-contract", "sdd-gate"],
    });
  });
});

describe("a route proposal lists only steps the plan runs when proposed", () => {
  const plan = {
    route: "bounded-change",
    stages: boundedPlan().stages,
  };
  const proposal = (optionalSteps: string[]): WorkflowProposal => ({
    requestKind: "change",
    candidateRoute: "bounded-change",
    goal: "Export an order as CSV.",
    expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
    observedRefs: [],
    affectedFlowIds: ["BF-0001"],
    riskSignals: [],
    unresolvedQuestions: [],
    newStories: [],
    proposedWriteScope: ["src/**"],
    protectedTargets: [],
    requiredStages: ["sdd_delta", "implement", "verify"],
    optionalSteps,
    rationale: "The export needs a new rule.",
  });

  function route(optionalSteps: string[]) {
    const snapshot = {
      run: { id: "run-route", state: "routing", sequence: 2 },
      outstandingWorkOrder: {
        workOrderId: "work-order-route-1",
        stageInstanceId: "route",
        attempt: 1,
        stageKind: "route",
        executor: { skill: "qfai-run" },
        operation: "route",
      },
    };
    return decide(
      snapshot,
      {
        operation: "accept",
        result: {
          resultId: `route-${optionalSteps.join("-") || "none"}`,
          workOrderId: "work-order-route-1",
          stageInstanceId: "route",
          attempt: 1,
          expectedSequence: 2,
          outcome: "accepted",
          actor: { agentInstance: "router-1" },
          proposal: proposal(optionalSteps),
        },
      },
      { plans: { "bounded-change": plan }, flows: ["BF-0001"] },
    );
  }

  // QFAI:EX-0001-0216-03
  it("refuses a step the plan does not list or runs without a proposal, and checks the rest", () => {
    const unlisted = route(["sdd-cycle"]);
    const unconditional = route(["sdd-triage"]);
    const checked = route(["sdd-contract", "common-design-md"]);
    const reasons = (decision: ReturnType<typeof decide>) => {
      const error = decision.verdict.error;
      return error?.code === "proposal-refused" ? error.reasons : [];
    };

    expect({
      unlisted: [reasons(unlisted), unlisted.verdict.run?.state, unlisted.events.length],
      unconditional: [reasons(unconditional), unconditional.events.length],
      checked: [checked.verdict.ok, checked.verdict.plan?.optionalSteps],
    }).toEqual({
      unlisted: [[{ reason: "stage-set", subject: "sdd-cycle" }], "routing", 0],
      unconditional: [[{ reason: "stage-set", subject: "sdd-triage" }], 0],
      checked: [true, ["sdd-contract", "common-design-md"]],
    });
  });
});
