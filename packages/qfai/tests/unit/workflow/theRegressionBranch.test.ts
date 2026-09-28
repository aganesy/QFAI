// QFAI:EX-0001-0193-03

import { expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { JournalRun, planOf, readyWith } from "./journalRun.js";

type WorkOrder = ReturnType<JournalRun["next"]>;

const FLOW = "BF-0007";
const diagnosis = {
  verdict: "regression",
  reproductionRef: "evidence/regression-reproduction.json",
  matchedIds: ["EX-0007-0002-01"],
};
// The regressed example is annotated by a test, and stays so through the fix.
const obligations = {
  flowId: FLOW,
  ids: ["AC-0007-0002-01", FLOW, "EX-0007-0002-01", "EX-0007-0002-02"],
  exampleIds: ["EX-0007-0002-01", "EX-0007-0002-02"],
  annotated: ["EX-0007-0002-01"],
  digest: "d".repeat(64),
};
const SCOPE = ["src/**", "tests/**"];

// The routing result the re-route asks for, which settles the fix-red-main plan.
const proposal = {
  requestKind: "routed",
  extraction: extraction({ intent: "ci", qualifiers: ["red-since-change"] }),
  goal: "The default branch accepts a sixth address again; refuse it.",
  expectedBehaviorRefs: [{ kind: "flow-id", ref: FLOW }],
  observedRefs: [],
  affectedFlowIds: [FLOW],
  riskSignals: [],
  unresolvedQuestions: [],
  newStories: [],
  proposedWriteScope: SCOPE,
  protectedTargets: [],
  rationale: "The diagnosis found a regression a correct test catches.",
};

const stepNames = (workOrder: WorkOrder) => (workOrder.steps ?? []).map((step) => step.name);

// The receipts a canned accepted result of the work order carries.
function fieldsFor(workOrder: WorkOrder): Record<string, unknown> {
  if (workOrder.stageKind === "route") return { proposal };
  if (stepNames(workOrder).includes("implement-diagnose")) return { diagnosis };
  if (workOrder.stageKind !== "regression_fix") return {};
  const regressionFix = {
    testId: "TC-0007-0004",
    rerunRef: "evidence/rerun-green.json",
    reviewRef: "evidence/independent-review.json",
  };
  return { regressionFix };
}

it("A diagnose result regression for an annotated example", async () => {
  const plans = await planFacts();
  const run = new JournalRun(
    readyWith(planOf("fix-defect", plans["fix-defect"]?.stages ?? [], SCOPE), FLOW),
  );
  const facts = () => {
    const routing = run.snapshot.routingReceiptRef;
    const receiptValidity = routing ? { [routing]: "valid" as const } : {};
    return { plans, flows: [FLOW], obligations, receiptValidity };
  };
  const issued: WorkOrder[] = [];
  for (let at = 0; at < 8; at += 1) {
    const next = run.apply({ operation: "next" }, facts());
    const workOrder = next.verdict.workOrder;
    if (!workOrder) break;
    issued.push(workOrder);
    const accepted = run.accept(fieldsFor(workOrder), facts());
    if (!accepted.verdict.ok) throw new Error(JSON.stringify(accepted.verdict));
  }
  const regressionFix = issued.find((workOrder) => workOrder.stageKind === "regression_fix");
  const diagnose = issued.find((workOrder) => workOrder.stageKind === "diagnose");

  expect({
    issued: issued.map((workOrder) => [workOrder.stageKind, stepNames(workOrder)]),
    route: run.snapshot.plan?.route,
    state: run.snapshot.run.state,
    digestUnchanged: regressionFix?.obligations?.digest === diagnose?.obligations?.digest,
  }).toEqual({
    issued: [
      ["diagnose", ["implement-diagnose"]],
      ["route", []],
      ["diagnose", ["implement-bisect"]],
      ["diagnose", ["implement-diagnose"]],
      ["regression_fix", ["implement-regression-fix"]],
      ["verify", ["verify-change-note", "verify-context", "verify-qfai-gate", "verify-repo-gate"]],
    ],
    route: "fix-red-main",
    state: "ready",
    digestUnchanged: true,
  });
});
