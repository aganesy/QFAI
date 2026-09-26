// QFAI:EX-0001-0193-10

import { expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { JournalRun, planOf, readyWith } from "./journalRun.js";

const FLOW = "BF-0007";
const obligations = {
  flowId: FLOW,
  ids: ["AC-0007-0001-01", FLOW, "EX-0007-0001-01", "EX-0007-0001-02"],
  exampleIds: ["EX-0007-0001-01", "EX-0007-0001-02"],
  annotated: ["EX-0007-0001-01"],
  digest: "7".repeat(64),
};

// A bugfix run bound to BF-0007 whose RED receipt was accepted for EX-0007-0001-02, then
// reclassified: its verify stage found a story defect only story authoring can repair, and
// routing settled bounded-change. Returns the run in `ready` under the new plan.
async function reclassified() {
  // The package's plans, as the command observes them.
  const plans = await planFacts();
  const plan = (route: "bugfix" | "bounded-change") =>
    planOf(route, plans[route]?.stages ?? [], ["src/notify/**"]);
  const facts = { flows: [FLOW], obligations };
  const run = new JournalRun(readyWith(plan("bugfix"), FLOW));
  run.next(facts);
  const diagnosis = {
    verdict: "missing-test",
    reproductionRef: ".qfai/evidence/repro.md",
    matchedIds: ["EX-0007-0001-02"],
  };
  run.accept({ diagnosis }, facts);
  expect(run.next(facts).stageKind).toBe("implement");
  run.accept({ testObservation: "expected_red", red: { testId: "t", failureKind: "assertion" } });
  expect(run.next(facts).stageKind).toBe("verify");
  const storyDefect = {
    findingCode: "QFAI-TRACE-002",
    path: ".qfai/spec/02_business-flow/business-flow-0007/user-story-0007-0001/03_Example.md",
    cause: "The example contradicts its criterion",
    owningFlow: FLOW,
    detectingCommand: "qfai validate",
    resolvingOwner: "qfai-sdd",
    blockingExtent: "run",
  };
  const replanned = run.accept({ outcome: "needs_repair", debts: [storyDefect] }, facts);
  expect(replanned.verdict.run?.state).toBe("routing");
  const receipts = run.snapshot.receiptRefs ?? [];
  expect(run.next(facts).stageKind).toBe("route");
  const proposal = {
    requestKind: "change",
    candidateRoute: "bounded-change",
    goal: "Fix the notification the example describes.",
    expectedBehaviorRefs: [{ kind: "flow-id", ref: FLOW }],
    observedRefs: [],
    affectedFlowIds: [FLOW],
    newStories: [],
    proposedWriteScope: ["src/notify/**"],
    protectedTargets: [],
    requiredStages: ["sdd_delta", "implement", "verify"],
  };
  const routingFacts = {
    flows: [FLOW],
    plans: { "bounded-change": { route: "bounded-change", stages: plan("bounded-change").stages } },
  };
  expect(run.accept({ proposal }, routingFacts).verdict.run?.state).toBe("ready");
  return { run, receipts, routing: run.snapshot.routingReceiptRef ?? "" };
}

it("A RED receipt accepted for an example no test annotates, then a reclassification from bugfix to bounded-change, then next", async () => {
  const { run, receipts, routing } = await reclassified();
  const [diagnose = "", red = ""] = receipts;
  const receiptValidity = { [routing]: "valid", [diagnose]: "stale", [red]: "valid" } as const;

  const workOrder = run.next({ flows: [FLOW], obligations, receiptValidity });

  expect({
    receipts: receipts.length,
    stageKind: workOrder.stageKind,
    obligationIds: workOrder.obligations?.ids,
    priorStageReceiptRefs: workOrder.priorStageReceiptRefs,
    prior: run.snapshot.priorStages?.map((stage) => stage.stageKind),
  }).toEqual({
    receipts: 2,
    stageKind: "sdd_delta",
    obligationIds: obligations.ids,
    priorStageReceiptRefs: [
      { ref: diagnose, validity: "stale" },
      { ref: red, validity: "valid" },
    ],
    prior: ["diagnose", "implement"],
  });
});

it("next after the replan, once the routing receipt went stale", async () => {
  const { run, receipts, routing } = await reclassified();
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
  }).toEqual({ state: "routing", events: ["required-plan-revision"], replans: 2 });
});
