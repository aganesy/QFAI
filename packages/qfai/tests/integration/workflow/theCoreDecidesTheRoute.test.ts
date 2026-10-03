// QFAI:AC-0001-0211-01
// QFAI:AC-0001-0211-02
// QFAI:AC-0001-0211-03
// QFAI:AC-0001-0211-04
// QFAI:AC-0001-0211-06

import { expect, it } from "vitest";

import { decideRoute } from "../../../src/core/workflow/decisionRules.js";
import {
  ENTRY_FLAGS,
  INTENTS,
  QUALIFIERS,
  SIGNALS,
  type RoutingReading,
} from "../../../src/core/workflow/extraction.js";
import { stageResultRefusals } from "../../../src/core/workflow/parse.js";
import { loadPackagePlan } from "../../../src/core/workflow/plans.js";
import { isWorkflowRoute } from "../../../src/core/workflow/routes.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { driveStages, proposalWith, quietCompletion, routedBy } from "./decisionRuns.js";

// QFAI:EX-0001-0211-01
it("A routing result carrying facts, and no route, is routed by the rule that holds", async () => {
  const { run, decision } = await routedBy({ intent: "defect", entryFlags: ["repro", "expect"] });
  const decided = decision.events.find((event) => event.type === "route-decided");

  expect({
    state: decision.verdict.run?.state,
    event: [decided?.route, decided?.rule],
    context: run.snapshot.routeDecision,
    plan: run.snapshot.plan?.route,
  }).toEqual({
    state: "ready",
    event: ["fix-defect", 27],
    context: { route: "fix-defect", rule: 27 },
    plan: "fix-defect",
  });
});

// QFAI:EX-0001-0211-02
it("A proposal that names a route, a stage list or a step list is refused, naming the field", () => {
  const refused = (field: string, value: unknown) =>
    stageResultRefusals({
      resultId: "route-1",
      workOrderId: "work-order-route-1",
      stageInstanceId: "route",
      attempt: 1,
      expectedSequence: 3,
      outcome: "accepted",
      testObservation: "not_applicable",
      actor: { agentInstance: "router-1" },
      proposal: { ...proposalWith({ intent: "defect" }), [field]: value },
    });

  expect([
    refused("candidateRoute", "fix-defect"),
    refused("route", "fix-defect"),
    refused("requiredStages", ["diagnose", "verify"]),
    refused("optionalSteps", ["sdd-contract"]),
  ]).toEqual([
    [{ reason: "schema", subject: "proposal.candidateRoute" }],
    [{ reason: "schema", subject: "proposal.route" }],
    [{ reason: "schema", subject: "proposal.requiredStages" }],
    [{ reason: "schema", subject: "proposal.optionalSteps" }],
  ]);
});

// The facts the decision rules read, beside the intent.
const READ = [
  ...ENTRY_FLAGS.map((each) => ["entryFlags", each] as const),
  ...QUALIFIERS.map((each) => ["qualifiers", each] as const),
  ...SIGNALS.map((each) => ["signals", each] as const),
];

// Every combination of at most `size` of the facts, as readings of `intent`.
function readingsOf(intent: RoutingReading["intent"], size: number): RoutingReading[] {
  const readings: RoutingReading[] = [];
  const pick = (from: number, chosen: (typeof READ)[number][]) => {
    const reading: RoutingReading = { intent, entryFlags: [], qualifiers: [], signals: [] };
    for (const [field, value] of chosen) Reflect.set(reading, field, [...reading[field], value]);
    readings.push(reading);
    if (chosen.length === size) return;
    for (let at = from; at < READ.length; at += 1) {
      const next = READ[at];
      if (next) pick(at + 1, [...chosen, next]);
    }
  };
  pick(0, []);
  return readings;
}

const RELEASE_SIGNALS = ["backport", "release-notes", "test-plan"];

// QFAI:EX-0001-0211-33
// SIMPLIFIED: combines at most three facts per extraction, not every subset of them.
// Lift when: a rule reads more than three facts together.
it("Every extraction reaches exactly one catalog route by a rule, an unsignalled release by rule 14", () => {
  const unrouted: string[] = [];
  const outside: string[] = [];
  let decided = 0;
  for (const intent of INTENTS) {
    for (const reading of readingsOf(intent, 3)) {
      const choice = decideRoute(reading);
      decided += 1;
      if (!isWorkflowRoute(choice.route)) outside.push(choice.route);
      const released =
        reading.intent === "release" &&
        !reading.signals.some((signal) => RELEASE_SIGNALS.includes(signal)) &&
        !reading.qualifiers.includes("distribution-incident");
      if (choice.rule === null && !released) unrouted.push(JSON.stringify(reading));
      if (choice.rule === null && choice.route !== "answer-question") {
        outside.push(choice.route);
      }
    }
  }
  const bareRelease = decideRoute(extraction({ intent: "release" }));

  expect({
    decided: decided > 100_000,
    outside,
    unrouted,
    bareRelease: [bareRelease.route, bareRelease.rule],
  }).toEqual({
    decided: true,
    outside: [],
    unrouted: [],
    bareRelease: ["hand-off-operation", 14],
  });
});

// QFAI:EX-0001-0211-34
it("A request no intent was read from is answered, and finishing it changes no file", async () => {
  const { run, decision } = await routedBy(
    { intent: null },
    { affectedFlowIds: [], proposedWriteScope: [] },
  );
  const { issued } = await driveStages(run);
  const finished = run.apply({ operation: "finish" }, { completion: quietCompletion() });
  const closure = (run.snapshot.acceptedStages ?? []).at(-1)?.closure;

  expect({
    route: [decision.events[0]?.route, decision.events[0]?.rule],
    stages: issued.map((workOrder) => workOrder.stageInstanceId),
    state: finished.verdict.run?.state,
    unmet: finished.verdict.unmet,
    closure: closure?.outcome,
  }).toEqual({
    route: ["answer-question", null],
    stages: ["answer"],
    state: "completed",
    unmet: [],
    closure: "answered",
  });
});

// QFAI:EX-0001-0211-36
it("Two fix-defect requests take the same stages and steps", async () => {
  const planned = async (risks: "data-loss"[]) => {
    const { route } = decideRoute(extraction({ intent: "defect", risks }));
    const load = await loadPackagePlan(route);
    if (!load.ok) throw new Error(`The ${route} plan does not load.`);
    return load.plan.stages.map((stage) => [stage.id, stage.steps.map((step) => step.name)]);
  };
  const [risky, plain] = [await planned(["data-loss"]), await planned([])];

  expect({
    same: JSON.stringify(risky) === JSON.stringify(plain),
    stages: risky.map(([id]) => id),
  }).toEqual({
    same: true,
    stages: ["diagnose", "spec", "implement", "note", "verify"],
  });
});
