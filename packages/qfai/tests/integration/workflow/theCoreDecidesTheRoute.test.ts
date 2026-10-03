// QFAI:AC-0001-0190-01
// QFAI:AC-0001-0211-01
// QFAI:AC-0001-0211-03
// QFAI:AC-0001-0211-04
// QFAI:AC-0001-0211-06

import { afterEach, expect, it } from "vitest";

import { decideRoute } from "../../../src/core/workflow/decisionRules.js";
import {
  ENTRY_FLAGS,
  INTENTS,
  QUALIFIERS,
  SIGNALS,
  type RoutingReading,
  type WorkflowExtraction,
} from "../../../src/core/workflow/extraction.js";
import { planOf, type PlanDocument } from "../../../src/core/workflow/plan.js";
import { isWorkflowRoute } from "../../../src/core/workflow/routes.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { minimalProject, removeProjects } from "./workflowProject.js";

afterEach(removeProjects);

async function planned(fields: Partial<WorkflowExtraction>): Promise<PlanDocument> {
  return planOf(await minimalProject(), { extraction: extraction(fields) });
}

// QFAI:EX-0001-0211-01
it("An extraction that names no route is routed by the rule that holds", async () => {
  const document = await planned({ intent: "defect", entryFlags: ["repro", "expect"] });

  expect([
    Reflect.get(document, "ok"),
    Reflect.get(document, "route"),
    Reflect.get(document, "rule"),
  ]).toEqual([true, "fix-defect", 27]);
});

// QFAI:AC-0001-0211-02
// QFAI:EX-0001-0211-04
it("An extraction two rules could read is routed by the lower-numbered one", async () => {
  const security = { intent: "security", entryFlags: ["repro"], risks: ["security"] } as const;
  const plain = await planned(security);
  const signalled = await planned({ ...security, signals: ["approved-record-task"] });

  expect(
    [plain, signalled].map((document) => [
      Reflect.get(document, "route"),
      Reflect.get(document, "rule"),
    ]),
  ).toEqual([
    ["fix-vulnerability", 1],
    ["fix-vulnerability", 1],
  ]);
});

// QFAI:EX-0001-0211-03
it("An extraction value outside its vocabulary is refused, naming the field", async () => {
  const root = await minimalProject();
  const refused = async (fields: Record<string, unknown>) => {
    const document = await planOf(root, { extraction: { ...extraction(), ...fields } });
    return document.ok ? [] : document.reasons;
  };
  const reading = { intent: "feature", entryFlags: [], qualifiers: [], signals: [] };

  expect([
    await refused({ intent: "bug" }),
    await refused({ entryFlags: ["urgent"] }),
    await refused({ confidence: 0.9 }),
    await refused({ alternatives: [reading] }),
  ]).toEqual([
    [{ reason: "schema", subject: "intent" }],
    [{ reason: "schema", subject: "entryFlags[0]" }],
    [{ reason: "schema", subject: "confidence" }],
    [{ reason: "schema", subject: "alternatives" }],
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
      if (choice.rule === null) unrouted.push(JSON.stringify(reading));
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
it("A request no intent was read from plans the route that answers it and changes nothing", async () => {
  const document = await planned({ intent: null });
  const stages = document.ok && "stages" in document ? document.stages : [];
  const steps = stages.flatMap((stage) => stage.steps.map((step) => step.name));

  expect({
    route: Reflect.get(document, "route"),
    rule: Reflect.get(document, "rule"),
    verifies: steps.includes("verify-repo-gate"),
    closes: steps.at(-1),
  }).toEqual({ route: "answer-question", rule: null, verifies: false, closes: "triage-close" });
});

it("A question plans a route that answers it and changes no tracked file", async () => {
  const document = await planned({ intent: "question-how", artifacts: [] });
  const stages = document.ok && "stages" in document ? document.stages : [];
  const steps = stages.flatMap((stage) => stage.steps.map((step) => step.name));

  expect([steps.includes("verify-repo-gate"), steps.at(-1)]).toEqual([false, "triage-close"]);
});

// QFAI:EX-0001-0211-36
it("Two fix-defect requests plan the same stages and steps, whatever their risks", async () => {
  const shape = (document: PlanDocument) =>
    document.ok && "stages" in document
      ? document.stages.map((stage) => [stage.id, stage.steps.map((step) => step.name)])
      : [];
  const risky = shape(await planned({ intent: "defect", risks: ["data-loss"] }));
  const plain = shape(await planned({ intent: "defect" }));
  const ids = risky.map(([id]) => id);

  expect({
    same: JSON.stringify(risky) === JSON.stringify(plain),
    inOrder: ["diagnose", "spec", "implement", "note", "verify"].map((id) => ids.indexOf(id)),
  }).toEqual({ same: true, inOrder: [0, 1, ids.length - 3, ids.length - 2, ids.length - 1] });
});
