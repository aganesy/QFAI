// QFAI:EX-0001-0193-10

import { expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { answerOpen } from "../../integration/workflow/decisionRuns.js";
import { extractionFor } from "../../helpers/workflowExtraction.js";
import { JournalRun, planOf, readyWith } from "./journalRun.js";

type Facts = NonNullable<Parameters<JournalRun["apply"]>[1]>;

const FLOW = "BF-0007";
const SCOPE = ["src/notify/**", ".qfai/spec/02_business-flow/business-flow-0007/**"];
// EX-0007-0001-02 is an example no test annotates yet.
const obligations = {
  flowId: FLOW,
  ids: ["AC-0007-0001-01", FLOW, "EX-0007-0001-01", "EX-0007-0001-02"],
  exampleIds: ["EX-0007-0001-01", "EX-0007-0001-02"],
  annotated: ["EX-0007-0001-01"],
  digest: "7".repeat(64),
};

// The routing result each re-route asks for.
function proposalFor(route: string, proposedWriteScope: string[]) {
  return {
    requestKind: "routed",
    extraction: extractionFor(route),
    goal: "Send one notification per address.",
    expectedBehaviorRefs: [{ kind: "flow-id", ref: FLOW }],
    observedRefs: [],
    affectedFlowIds: [FLOW],
    riskSignals: [],
    unresolvedQuestions: [],
    newStories: [],
    proposedWriteScope,
    protectedTargets: [],
    rationale: "The route the branch point fixed.",
  };
}

// Accepts the routing result of a re-route, and confirms the plan where `gate:user` asks.
function routeAgain(run: JournalRun, facts: () => Facts, route: string, scope: string[]) {
  run.next(facts());
  const routed = run.accept({ proposal: proposalFor(route, scope) }, facts());
  if (routed.verdict.questions?.some((question) => question.purpose === "plan")) {
    answerOpen(run, "plan", "proceed");
  }
}

// A fix-defect run bound to BF-0007 whose diagnosis found the story expects something else, so it
// re-routed to decide-acceptance, whose `triage-close` adopted the change toward add-feature.
// Returns the run in `ready` on the add-feature plan.
async function reclassified() {
  const plans = await planFacts();
  const run = new JournalRun(
    readyWith(planOf("fix-defect", plans["fix-defect"]?.stages ?? [], SCOPE), FLOW),
  );
  const facts = (): Facts => {
    const routing = run.snapshot.routingReceiptRef;
    const receiptValidity = routing ? { [routing]: "valid" as const } : {};
    return { plans, flows: [FLOW], obligations, receiptValidity };
  };
  const diagnosis = {
    verdict: "expectation-differs",
    reproductionRef: ".qfai/evidence/repro.md",
    matchedIds: ["EX-0007-0001-02"],
  };
  run.next(facts());
  run.accept({ diagnosis }, facts());
  routeAgain(run, facts, "decide-acceptance", []);
  for (const stage of ["clarify", "record"]) {
    expect(run.next(facts()).stageInstanceId).toBe(stage);
    run.accept({}, facts());
  }
  run.next(facts());
  run.accept({ branch: { outcome: "adopted", route: "add-feature" } }, facts());
  routeAgain(run, facts, "add-feature", SCOPE);
  return { run, receipts: run.snapshot.receiptRefs ?? [] };
}

it("A run re-routed from fix-defect to decide-acceptance and then to add-feature, then next", async () => {
  const { run, receipts } = await reclassified();
  const routing = run.snapshot.routingReceiptRef ?? "";
  const [diagnose = ""] = receipts;
  const receiptValidity = Object.fromEntries([
    [routing, "valid" as const],
    ...receipts.map((ref) => [ref, ref === diagnose ? ("stale" as const) : ("valid" as const)]),
  ]);

  const workOrder = run.next({ flows: [FLOW], obligations, receiptValidity });

  expect({
    route: run.snapshot.plan?.route,
    receipts: receipts.length,
    reroutes: run.snapshot.reroutes?.map((each) => each.to),
    stageKind: workOrder.stageKind,
    obligationIds: workOrder.obligations?.ids,
    priorStageReceiptRefs: workOrder.priorStageReceiptRefs,
    prior: run.snapshot.priorStages?.map((stage) => stage.stageInstanceId),
  }).toEqual({
    route: "add-feature",
    receipts: 4,
    reroutes: ["decide-acceptance", "add-feature"],
    stageKind: "sdd",
    obligationIds: obligations.ids,
    priorStageReceiptRefs: receipts.map((ref) => ({
      ref,
      validity: ref === diagnose ? "stale" : "valid",
    })),
    prior: ["diagnose", "clarify", "record", "close"],
  });
});

it("next after the re-routes, once the routing receipt went stale", async () => {
  const { run, receipts } = await reclassified();
  const routing = run.snapshot.routingReceiptRef ?? "";
  const receiptValidity = Object.fromEntries(
    [routing, ...receipts].map((ref) => [ref, ref === routing ? "stale" : "valid"] as const),
  );

  const decision = run.apply(
    { operation: "next" },
    { flows: [FLOW], obligations, receiptValidity },
  );

  expect({
    state: decision.verdict.run?.state,
    events: decision.events.map((event) => event.type),
    replans: run.snapshot.replans,
    reroutes: run.snapshot.reroutes?.length,
  }).toEqual({ state: "routing", events: ["required-plan-revision"], replans: 1, reroutes: 2 });
});
