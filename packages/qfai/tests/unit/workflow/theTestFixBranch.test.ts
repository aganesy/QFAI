// QFAI:EX-0001-0187-01

import { expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { kindSteps } from "./kindSteps.js";
import { JournalRun, planOf, readyWith } from "./journalRun.js";

const FLOW = "BF-0007";
const SCOPE = ["src/**", "tests/**"];

// The routing result the re-route asks for, which settles the repair-test plan.
const proposal = {
  requestKind: "routed",
  extraction: extraction({ intent: "test-defect" }),
  goal: "The acceptance test of the address limit waits on a timer; repair it.",
  expectedBehaviorRefs: [{ kind: "flow-id", ref: FLOW }],
  observedRefs: [],
  affectedFlowIds: [FLOW],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  proposedWriteScope: SCOPE,
  protectedTargets: [],
  rationale: "The diagnosis found the test defective.",
};

// A fix-defect run whose diagnosis found a defective test whose first matched ID is
// `firstMatched`, re-routed at that branch point to repair-test at an unchanged revision.
async function rerouted(firstMatched: string) {
  const plans = await planFacts();
  const run = new JournalRun(
    readyWith(planOf("fix-defect", plans["fix-defect"]?.stages ?? [], SCOPE), FLOW),
  );
  const facts = () => {
    const routing = run.snapshot.routingReceiptRef;
    const receiptValidity = routing ? { [routing]: "valid" as const } : {};
    const revision = { head: "c0ffee", observedChangedPaths: [], fileDigests: {} };
    return { plans, flows: [FLOW], receiptValidity, ...revision };
  };
  run.next(facts());
  const diagnosis = {
    verdict: "defective-test",
    reproductionRef: "evidence/defective-test.json",
    matchedIds: [firstMatched, "EX-0007-0002-02"],
  };
  run.accept({ diagnosis }, facts());
  run.next(facts());
  run.accept({ proposal }, facts());
  return { run, facts, fix: run.next(facts()) };
}

// Both test-fix steps run whatever the layer; the one that does not own the layer passes.
const matrix: [string, string][] = [
  ["business-flow", "BF-0007"],
  ["acceptance-criterion", "AC-0007-0002-01"],
  ["example", "EX-0007-0002-01"],
];

for (const [title, firstMatched] of matrix) {
  it(title, async () => {
    const { run, fix } = await rerouted(firstMatched);

    expect([run.snapshot.plan?.route, fix.stageKind, fix.steps]).toEqual([
      "repair-test",
      "test_fix",
      kindSteps("test_fix"),
    ]);
  });
}

it("A criterion-first fix that repairs the test and passes implement-test-fix, then verify", async () => {
  const { run, facts } = await rerouted("AC-0007-0002-01");
  const cited = { ids: ["AC-0007-0002-01", "EX-0007-0002-01"], digest: "a".repeat(64) };
  const accepted = run.accept(
    {
      passes: [
        {
          step: "implement-test-fix",
          reason: "The acceptance test owns the flaky wait; no example changes.",
          evidenceRef: "evidence/implement-test-fix-pass.md",
        },
      ],
      testFix: {
        citedBefore: cited,
        citedAfter: cited,
        reviewRef: "evidence/test-fix-review.json",
        rerunRef: "evidence/test-fix-rerun.json",
      },
    },
    facts(),
  );
  const next = run.next(facts());

  expect({
    state: accepted.verdict.run?.state,
    next: [next.stageInstanceId, next.stageKind],
  }).toEqual({ state: "ready", next: ["verify", "verify"] });
});
