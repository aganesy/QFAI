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
import { planFacts } from "../../../src/core/workflow/observe.js";
import { stageResultRefusals } from "../../../src/core/workflow/parse.js";
import { defaultsIn } from "../../../src/core/workflow/routeDecision.js";
import { isWorkflowRoute } from "../../../src/core/workflow/routes.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import {
  FLOW,
  HEAVY_REVIEWERS,
  driveStages,
  proposalWith,
  quietCompletion,
  routedBy,
} from "./decisionRuns.js";

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
it("Every extraction reaches exactly one catalog route, and only an unsignalled release reaches none", async () => {
  const defaultsOf = defaultsIn(await planFacts());
  const unrouted: string[] = [];
  const outside: string[] = [];
  let decided = 0;
  for (const intent of INTENTS) {
    for (const reading of readingsOf(intent, 3)) {
      const choice = decideRoute({ ...reading, artifacts: ["code"] }, defaultsOf);
      decided += 1;
      if (!isWorkflowRoute(choice.route)) outside.push(choice.route);
      const released =
        reading.intent === "release" &&
        !reading.signals.some((signal) => RELEASE_SIGNALS.includes(signal)) &&
        !reading.qualifiers.includes("distribution-incident");
      if (choice.rule === null && !released) unrouted.push(JSON.stringify(reading));
      if (choice.rule === null && choice.route !== "investigate-question") {
        outside.push(choice.route);
      }
    }
  }
  const bareRelease = decideRoute(
    { ...extraction({ intent: "release" }), artifacts: ["release"] },
    defaultsOf,
  );

  expect({
    decided: decided > 100_000,
    outside,
    unrouted,
    bareRelease: [bareRelease.route, bareRelease.rule],
  }).toEqual({
    decided: true,
    outside: [],
    unrouted: [],
    bareRelease: ["investigate-question", null],
  });
});

// QFAI:EX-0001-0211-34
it("A request no intent was read from is investigated, and finishing it changes no file", async () => {
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
    route: ["investigate-question", null],
    stages: ["investigate", "answer", "close"],
    state: "completed",
    unmet: [],
    closure: "answered",
  });
});

// QFAI:EX-0001-0211-36
it("Two fix-defect requests issue the same stages and steps; only their reviewers differ", async () => {
  const drive = async (risks: ("data-loss" | "silent")[]) => {
    const { run } = await routedBy({ intent: "defect", risks }, { affectedFlowIds: [FLOW] });
    const { issued } = await driveStages(run);
    return issued;
  };
  const [risky, plain] = [await drive(["data-loss"]), await drive([])];
  const steps = (issued: typeof risky) =>
    issued.map((workOrder) => [
      workOrder.stageInstanceId,
      (workOrder.steps ?? []).map((step) => step.name),
    ]);

  expect({
    same: JSON.stringify(steps(risky)) === JSON.stringify(steps(plain)),
    stages: risky.map((workOrder) => workOrder.stageInstanceId),
    riskyReviewers: risky.every((workOrder) =>
      HEAVY_REVIEWERS.every((role) => (workOrder.requiredReviewerRoles ?? []).includes(role)),
    ),
    plainReviewers: plain.map((workOrder) => workOrder.requiredReviewerRoles),
    modifiers: [risky[0]?.modifiers, plain[0]?.modifiers],
  }).toEqual({
    same: true,
    stages: ["diagnose", "spec", "acceptance", "implement", "verify"],
    riskyReviewers: true,
    plainReviewers: [undefined, undefined, undefined, undefined, undefined],
    modifiers: [["review:heavy"], undefined],
  });
});
