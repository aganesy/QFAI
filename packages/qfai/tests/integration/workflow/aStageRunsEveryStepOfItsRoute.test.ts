// QFAI:AC-0001-0216-01
// QFAI:AC-0001-0216-02
// QFAI:AC-0001-0216-03
// QFAI:AC-0001-0216-04
// QFAI:AC-0001-0216-05
// QFAI:AC-0001-0216-06

import { describe, expect, it } from "vitest";

import { decide } from "../../../src/core/workflow/decide.js";
import { planFacts } from "../../../src/core/workflow/observe.js";
import { stageResultRefusals } from "../../../src/core/workflow/parse.js";
import { extractionFor } from "../../helpers/workflowExtraction.js";

type Snapshot = NonNullable<Parameters<typeof decide>[0]>;
type Facts = Parameters<typeof decide>[2];
type Plan = NonNullable<Snapshot["plan"]>;
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

const DIAGNOSIS = {
  verdict: "missing-test",
  reproductionRef: "tests/export.test.ts",
  matchedIds: ["AC-0001-0001-01"],
};

// The shipped plan of `route`, as a checked plan carries it.
async function shippedPlan(route: string, riskSignals: string[] = []): Promise<Plan> {
  const stages = (await planFacts())[route]?.stages;
  if (!stages) throw new Error(`no shipped plan for ${route}`);
  return {
    route,
    writeScope: ["src/**"],
    stages,
    ...(riskSignals.length > 0 ? { riskSignals } : {}),
  };
}

const facts: Facts = { reviewerRoles: REVIEWERS };

// The work order `next` issues on a ready run of the plan, after the stages already accepted.
function issued(plan: Plan, accepted: string[] = [], extra: Partial<Snapshot> = {}) {
  const acceptedStages = accepted.map((id) => ({
    stageInstanceId: id,
    stageKind: plan.stages.find((stage) => stage.stageInstanceId === id)?.stageKind ?? id,
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

// `accept` of a result for the work order `issued` returned, carrying `fields`.
function acceptOn(issuedOrder: ReturnType<typeof issued>, fields: Record<string, unknown>) {
  const { decision, snapshot, workOrder } = issuedOrder;
  const run = decision.verdict.run;
  if (!run) throw new Error("next moved the run");
  return decide(
    { ...snapshot, run, outstandingWorkOrder: workOrder },
    {
      operation: "accept",
      result: {
        resultId: `${workOrder.stageInstanceId}-1`,
        workOrderId: workOrder.workOrderId,
        stageInstanceId: workOrder.stageInstanceId,
        attempt: workOrder.attempt,
        expectedSequence: run.sequence,
        outcome: "accepted",
        actor: { agentInstance: "author-1" },
        ...fields,
      },
    },
    facts,
  );
}

function names(workOrder: WorkOrder): string[] {
  return (workOrder.steps ?? []).map((step) => step.name);
}

// The work-order entry of a step no route marks as a branch point.
function stepEntry(name: string, passThrough: boolean, decisionPoint: "user" | null = null) {
  const path = `.qfai/assistant/step/${name}/STEP.md`;
  return { name, path, mode: null, passThrough, decisionPoint, branchPoint: false };
}

describe("a stage runs every step its route names", () => {
  // QFAI:EX-0001-0216-01
  it("names every step of the add-feature sdd stage in plan order, each with its pass-through mark", async () => {
    const { workOrder } = issued(await shippedPlan("add-feature"));
    const steps = workOrder.steps ?? [];

    expect({
      names: names(workOrder),
      passThrough: steps.filter((step) => step.passThrough).map((step) => step.name),
    }).toEqual({
      names: [
        "sdd-triage",
        "sdd-flow",
        "sdd-story",
        "sdd-contract",
        "common-design-md",
        "sdd-cycle",
        "sdd-gate",
      ],
      passThrough: ["sdd-flow", "sdd-contract", "common-design-md", "sdd-cycle"],
    });
  });

  // QFAI:EX-0001-0216-05
  it("names each step of the restate-records spec stage with its marks, and no executor or operation", async () => {
    const plan = await shippedPlan("restate-records");
    const { workOrder } = issued(plan, ["diagnose"], { diagnosis: DIAGNOSIS });

    expect({
      stage: workOrder.stageInstanceId,
      steps: workOrder.steps,
      executor: "executor" in workOrder,
      operation: "operation" in workOrder,
    }).toEqual({
      stage: "spec",
      steps: [
        stepEntry("sdd-triage", false, "user"),
        stepEntry("sdd-story", false),
        stepEntry("sdd-contract", true),
        stepEntry("sdd-gate", false),
      ],
      executor: false,
      operation: false,
    });
  });

  // QFAI:EX-0001-0216-02
  it("keeps a pass-through step in the work order and records its pass in the result", async () => {
    const plan = await shippedPlan("fix-defect");
    const acceptance = issued(plan, ["diagnose", "spec"], { diagnosis: DIAGNOSIS });
    const credentials = {
      step: "atdd-credentials",
      reason: "No acceptance test of the change signs in.",
      evidenceRef: ".qfai/report/atdd-credentials.md",
    };
    const accepted = acceptOn(acceptance, { passes: [credentials] });
    const recorded = accepted.events.find((event) => event.type === "accept-nonfinal-result");

    expect({
      steps: names(acceptance.workOrder),
      state: accepted.verdict.run?.state,
      passes: recorded?.passes,
      notRun: recorded?.notRun,
    }).toEqual({
      steps: ["atdd-scaffold", "atdd-credentials", "atdd-author"],
      state: "ready",
      passes: [credentials],
      notRun: undefined,
    });
  });

  // QFAI:EX-0001-0216-06
  it("requires the union of every step's reviewers, each once", async () => {
    const restate = await shippedPlan("restate-records");
    const build = await shippedPlan("apply-settled-build");
    const acceptance = issued(build, ["spec"]).workOrder;

    expect([
      issued(restate, ["diagnose"], { diagnosis: DIAGNOSIS }).workOrder.requiredReviewerRoles,
      issued(build).workOrder.requiredReviewerRoles,
      names(acceptance),
      acceptance.requiredReviewerRoles,
    ]).toEqual([
      ["completion-reviewer", "architecture-reviewer"],
      ["completion-reviewer"],
      ["atdd-scaffold", "atdd-credentials", "atdd-author"],
      ["completion-reviewer", "qa-gatekeeper"],
    ]);
  });

  // QFAI:EX-0001-0216-08
  it("raises only the implementation steps' review in a run restoring an authorization", async () => {
    const plan = await shippedPlan("apply-settled-build", ["authorization-restored"]);
    const heavy = ["completion-reviewer", "qa-gatekeeper", "implementation-reviewer"];

    expect([
      issued(plan).workOrder.requiredReviewerRoles,
      issued(plan, ["spec"]).workOrder.requiredReviewerRoles,
      issued(plan, ["spec", "acceptance"]).workOrder.requiredReviewerRoles,
    ]).toEqual([["completion-reviewer"], heavy, heavy]);
  });

  // QFAI:EX-0001-0216-07
  it("accepts one result for the whole work order, with one verdict per required role", async () => {
    const accepted = acceptOn(issued(await shippedPlan("apply-settled-build"), ["spec"]), {
      reviewResults: [
        { role: "completion-reviewer", agentInstance: "cr-1", verdict: "PASS", reportRef: "a" },
        { role: "qa-gatekeeper", agentInstance: "qa-1", verdict: "PASS", reportRef: "b" },
      ],
    });

    expect([accepted.verdict.ok, accepted.verdict.run?.state]).toEqual([true, "ready"]);
  });

  // QFAI:EX-0001-0216-04
  it("returns the run to routing when the stage finds work no step of its route does", async () => {
    const first = issued(await shippedPlan("apply-settled-spec"));
    const returned = acceptOn(first, {
      outcome: "needs_repair",
      debts: [
        {
          findingCode: "flow-unsettled",
          path: ".qfai/spec/02_business-flow/business-flows.md",
          cause: "The change needs a business flow the cited record never settled.",
          owningFlow: "BF-0001",
          detectingCommand: "sdd-triage review",
          resolvingOwner: "sdd-flow",
          blockingExtent: "stage",
        },
      ],
    });

    expect({
      state: returned.verdict.run?.state,
      events: returned.events.map((event) => event.type),
      steps: names(first.workOrder),
    }).toEqual({
      state: "routing",
      events: ["scope-or-obligation-revision"],
      steps: ["sdd-triage", "sdd-story", "sdd-contract", "sdd-gate"],
    });
  });
});

describe("a route proposal names no stage and no step", () => {
  const routingResult = (proposalFields: Record<string, unknown>) => ({
    resultId: "route-1",
    workOrderId: "work-order-route-1",
    stageInstanceId: "route",
    attempt: 1,
    expectedSequence: 2,
    outcome: "accepted",
    testObservation: "not_applicable",
    actor: { agentInstance: "router-1" },
    proposal: {
      requestKind: "routed",
      extraction: extractionFor("add-feature"),
      goal: "Export an order as CSV.",
      expectedBehaviorRefs: [{ kind: "request", ref: "request" }],
      observedRefs: [],
      affectedFlowIds: ["BF-0001"],
      riskSignals: [],
      unresolvedQuestions: [],
      newStories: [],
      proposedWriteScope: ["src/**"],
      protectedTargets: [],
      rationale: "The export needs a new rule.",
      ...proposalFields,
    },
  });

  // QFAI:EX-0001-0216-03
  it("refuses optional steps and required stages as unknown keys before the proposal is read", () => {
    expect([
      stageResultRefusals(routingResult({ optionalSteps: ["sdd-contract"] })),
      stageResultRefusals(routingResult({ requiredStages: ["sdd", "verify"] })),
      stageResultRefusals(routingResult({})),
    ]).toEqual([
      [{ reason: "schema", subject: "proposal.optionalSteps" }],
      [{ reason: "schema", subject: "proposal.requiredStages" }],
      [],
    ]);
  });
});
