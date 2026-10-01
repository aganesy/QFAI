import { expect, it } from "vitest";

import { planFacts } from "../../../src/core/workflow/observe.js";
import { WORKFLOW_ROUTES } from "../../../src/core/workflow/routes.js";
import { flowBindingOf } from "../../../src/core/workflow/stages.js";
import { stepRefs } from "../../../src/core/workflow/steps.js";
import { JournalRun, planOf, readyWith } from "./journalRun.js";

type Stages = Parameters<typeof planOf>[1];
type Stage = Stages[number];

const FLOW = "BF-0018";

// The receipts a canned accepted result of the stage carries, every branch point continuing.
function cannedFields(stage: Stage): Record<string, unknown> {
  const names = (stage.steps ?? []).map((step) => step.name);
  const diagnoses = (stage.steps ?? []).some(
    (step) => step.name === "implement-diagnose" && step.mode !== "read-only",
  );
  const cited = { ids: ["EX-0018-0001-01"], digest: "e".repeat(64) };
  return {
    testObservation: "not_applicable",
    ...(diagnoses
      ? { diagnosis: { verdict: "missing-test", reproductionRef: "repro.md", matchedIds: [] } }
      : {}),
    ...(stage.stageKind === "test_fix"
      ? { testFix: { citedBefore: cited, citedAfter: cited, reviewRef: "r.md", rerunRef: "t.md" } }
      : {}),
    ...(stage.stageKind === "regression_fix"
      ? { regressionFix: { testId: "t-1", rerunRef: "t.md", reviewRef: "r.md" } }
      : {}),
    ...(names.includes("triage-close") ? { closure: { outcome: "answered", followUps: [] } } : {}),
  };
}

// Drives the shipped plan through `next` and `accept` only, and returns what each work order
// named and whether `next` then returned no work order.
async function driven(route: string) {
  const stages = (await planFacts())[route]?.stages ?? [];
  const binding = flowBindingOf(stages);
  const run = new JournalRun(
    readyWith(planOf(route, stages), binding === "none" ? undefined : FLOW),
  );
  const issued: unknown[] = [];
  for (const stage of stages) {
    const workOrder = run.next();
    issued.push({
      stage: workOrder.stageInstanceId,
      steps: workOrder.steps,
      target: workOrder.target,
    });
    const accepted = run.accept(cannedFields(stage));
    if (!accepted.verdict.ok) throw new Error(`${route}: ${JSON.stringify(accepted.verdict)}`);
  }
  const final = run.apply({ operation: "next" });
  return { issued, final: { state: final.verdict.run?.state, workOrder: final.verdict.workOrder } };
}

// Each stage's work order as the plan names it: its steps with their entry files, in plan order,
// and the bound flow as the target of every stage that takes one.
function expectedOf(stages: Stages) {
  const untargeted = ["triage", "discussion", "maintenance", "verify"];
  const bound = flowBindingOf(stages) !== "none";
  return stages.map((stage) => ({
    stage: stage.stageInstanceId,
    steps: stepRefs(stage.steps ?? []),
    target:
      bound && !untargeted.includes(stage.stageKind) ? { kind: "flow", flowId: FLOW } : undefined,
  }));
}

for (const route of WORKFLOW_ROUTES) {
  // QFAI:EX-0001-0185-10
  it(route, async () => {
    const stages = (await planFacts())[route]?.stages ?? [];

    expect(await driven(route)).toEqual({
      issued: expectedOf(stages),
      final: { state: "ready", workOrder: null },
    });
  });
}
