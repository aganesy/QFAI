// QFAI:AC-0001-0186-02
// QFAI:AC-0001-0186-04
// QFAI:AC-0001-0187-01
// QFAI:AC-0001-0209-01
// QFAI:AC-0001-0214-03
// QFAI:AC-0001-0214-05
// QFAI:AC-0001-0215-01
// QFAI:AC-0001-0215-02
// QFAI:AC-0001-0223-01
// QFAI:AC-0001-0223-03
// QFAI:AC-0001-0224-04

import { afterEach, expect, it } from "vitest";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  planned as plannedDocument,
  planOf,
  type PlannedStage,
} from "../../../src/core/workflow/plan.js";
import {
  packagePlansDir,
  parsePlan,
  type PlanBranchPoint,
} from "../../../src/core/workflow/plans.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { minimalProject, removeProjects } from "./workflowProject.js";

afterEach(removeProjects);

interface Planned {
  stages: PlannedStage[];
  decisionPoints: string[];
  releasePoint: string | null;
  branchPoints: PlanBranchPoint[];
}

// The plan `npx qfai workflow plan --route <route>` returns.
async function planned(route: string): Promise<Planned> {
  const document = await planOf(await minimalProject(), { route });
  if (!document.ok || !("stages" in document)) throw new Error(`${route} does not plan`);
  return document;
}

function stepOrder(plan: Planned): string[] {
  return plan.stages.flatMap((stage) => stage.steps.map((step) => step.name));
}

// The destinations a plan pairs with an outcome reported at a step, or none.
function destinations(plan: Planned, step: string, outcome: string) {
  return plan.branchPoints
    .find((point) => point.step === step)
    ?.outcomes.find((each) => each.outcome === outcome)?.routes;
}

// QFAI:EX-0001-0223-01
it("add-feature asks its critical decisions at sdd-triage, before any story or contract is written", async () => {
  const plan = await planned("add-feature");
  const order = stepOrder(plan);

  expect({
    points: plan.decisionPoints,
    beforeStory: order.indexOf("sdd-triage") < order.indexOf("sdd-story"),
    beforeContract: order.indexOf("sdd-triage") < order.indexOf("sdd-contract"),
  }).toEqual({ points: ["sdd-triage"], beforeStory: true, beforeContract: true });
});

// QFAI:EX-0001-0223-02
it("retire-mechanism asks at sdd-triage, before implement-retire runs", async () => {
  const plan = await planned("retire-mechanism");
  const order = stepOrder(plan);

  expect([
    plan.decisionPoints,
    order.indexOf("sdd-triage") < order.indexOf("implement-retire"),
  ]).toEqual([["sdd-triage"], true]);
});

// QFAI:EX-0001-0223-04
it("backport-fix releases at its end", async () => {
  expect((await planned("backport-fix")).releasePoint).toBe("end");
});

// QFAI:EX-0001-0223-04
it("A plan whose file declares releasePoint: end reports it, with no default modifier", async () => {
  const text = await readFile(path.join(packagePlansDir(), "backport-fix.yml"), "utf8");
  const declared = text.replace(
    /^defaultModifiers: .*$/m,
    "defaultModifiers: []\nreleasePoint: end",
  );
  const load = parsePlan(declared, "backport-fix");
  const document = load.ok ? plannedDocument(load.plan) : load;

  expect(Reflect.get(document, "releasePoint")).toBe("end");
});

// QFAI:EX-0001-0223-05
it("hand-off-operation releases before triage-handoff", async () => {
  expect((await planned("hand-off-operation")).releasePoint).toBe("triage-handoff");
});

// QFAI:EX-0001-0214-07
it("draft-release-notes drafts, then releases at its end with no verify stage", async () => {
  const plan = await planned("draft-release-notes");

  expect([stepOrder(plan), plan.releasePoint]).toEqual([["verify-release-notes"], "end"]);
});

// QFAI:EX-0001-0209-01
it("add-feature returns the seven sdd steps in order, with the four pass-through steps marked", async () => {
  const [sdd] = (await planned("add-feature")).stages;

  expect(sdd?.steps.map((step) => [step.name, step.passThrough])).toEqual([
    ["sdd-triage", false],
    ["sdd-flow", true],
    ["sdd-story", false],
    ["sdd-contract", true],
    ["common-design-md", true],
    ["sdd-cycle", true],
    ["sdd-gate", false],
  ]);
});

// QFAI:EX-0001-0215-02
it("retriage-bundle runs implement-diagnose read-only in its recheck stage", async () => {
  const [recheck] = (await planned("retriage-bundle")).stages;

  expect(recheck?.steps.map((step) => [step.name, step.mode])).toEqual([
    ["implement-diagnose", "read-only"],
  ]);
});

// QFAI:EX-0001-0224-04
// QFAI:EX-0001-0186-03
it("A regression found by fix-defect's diagnosis moves the work to fix-red-main, which fixes, verifies and commits", async () => {
  const fixDefect = await planned("fix-defect");
  const fixRedMain = await planned("fix-red-main");
  const fix = fixRedMain.stages.find((stage) => stage.id === "fix");

  expect({
    destination: destinations(fixDefect, "implement-diagnose", "regression"),
    fix: fix?.steps.map((step) => step.name),
    last: fixRedMain.stages.at(-1)?.steps.at(-1)?.name,
  }).toEqual({
    destination: ["fix-red-main"],
    fix: ["implement-regression-fix"],
    last: "verify-commit",
  });
});

// QFAI:EX-0001-0187-01
// QFAI:EX-0001-0187-06
it("A defective test found by fix-defect's diagnosis moves the work to repair-test, which fixes the test, verifies and commits", async () => {
  const fixDefect = await planned("fix-defect");
  const repairTest = await planned("repair-test");
  const fix = repairTest.stages.find((stage) => stage.id === "fix");

  expect({
    destination: destinations(fixDefect, "implement-diagnose", "defective-test"),
    fixes: fix?.steps.some((step) => step.name === "implement-test-fix"),
    last: repairTest.stages.at(-1)?.steps.at(-1)?.name,
  }).toEqual({ destination: ["repair-test"], fixes: true, last: "verify-commit" });
});

// QFAI:EX-0001-0215-04
it("repair-consistency moves to retire-mechanism when sdd-triage reports retire", async () => {
  const plan = await planned("repair-consistency");

  expect(destinations(plan, "sdd-triage", "retire")).toEqual(["retire-mechanism"]);
});

// QFAI:EX-0001-0215-06
it("quarantine-flaky moves on a product race and continues on a defective test", async () => {
  const plan = await planned("quarantine-flaky");

  expect([
    destinations(plan, "implement-diagnose", "product-race"),
    destinations(plan, "implement-diagnose", "defective-test"),
  ]).toEqual([["fix-intermittent"], undefined]);
});

// QFAI:EX-0001-0215-07
it("refactor-code moves on a behaviour change only to the destinations it declares", async () => {
  const routes = destinations(
    await planned("refactor-code"),
    "implement-refactor",
    "behaviour-change",
  );

  expect([routes, Array.isArray(routes) && routes.includes("fix-defect")]).toEqual([
    ["add-feature", "change-compatibility"],
    false,
  ]);
});

// QFAI:EX-0001-0215-11
it("An outcome no branch point declares moves nothing", async () => {
  const editText = await planned("edit-text");
  const fixDefect = await planned("fix-defect");

  expect([editText.branchPoints, destinations(fixDefect, "implement-diagnose", "retire")]).toEqual([
    [],
    undefined,
  ]);
});

// The route the decision rules give an extraction a step reports.
async function routeOf(fields: Parameters<typeof extraction>[0]): Promise<unknown> {
  const document = await planOf(await minimalProject(), { extraction: extraction(fields) });
  return Reflect.get(document, "route");
}

// QFAI:EX-0001-0215-03
// QFAI:EX-0001-0186-08
it("fix-defect continues on missing-test and moves on each other diagnosis verdict", async () => {
  const fixDefect = await planned("fix-defect");
  const verdicts = [
    "missing-test",
    "as-specified",
    "not-ours",
    "duplicate",
    "needs-info",
    "expectation-differs",
    "defective-test",
    "regression",
    "surface-conflict",
  ];
  const order = stepOrder(fixDefect);

  expect({
    moves: verdicts.map((verdict) => destinations(fixDefect, "implement-diagnose", verdict)),
    diagnosedBeforeAnyEdit: order.indexOf("implement-diagnose") < order.indexOf("sdd-story"),
  }).toEqual({
    moves: [
      undefined,
      ["answer-question"],
      ["close-no-change"],
      ["close-duplicate"],
      ["request-info"],
      ["decide-design"],
      ["repair-test"],
      ["fix-red-main"],
      ["repair-consistency"],
    ],
    diagnosedBeforeAnyEdit: true,
  });
});

// QFAI:EX-0001-0215-05
it("A revert reported by fix-red-main's implement-bisect moves to revert-culprit, and no outcome continues to implement-diagnose", async () => {
  const fixRedMain = await planned("fix-red-main");
  const order = stepOrder(fixRedMain);

  expect({
    fixRedMain: destinations(fixRedMain, "implement-bisect", "revert"),
    outcomes: fixRedMain.branchPoints
      .find((point) => point.step === "implement-bisect")
      ?.outcomes.map((each) => each.outcome),
    next: order[order.indexOf("implement-bisect") + 1],
  }).toEqual({
    fixRedMain: ["revert-culprit"],
    outcomes: ["revert"],
    next: "implement-diagnose",
  });
});

// QFAI:EX-0001-0215-08
it("apply-settled moves to decide-design when sdd-triage reports outside-record", async () => {
  expect(destinations(await planned("apply-settled"), "sdd-triage", "outside-record")).toEqual([
    "decide-design",
  ]);
});

// QFAI:EX-0001-0215-09
it("decide-design moves an adopted proposal to prototype-feature when triage-close names it", async () => {
  expect(destinations(await planned("decide-design"), "triage-close", "adopted")).toContain(
    "prototype-feature",
  );
});

// QFAI:EX-0001-0215-10
it("answer-question plans a found defect through the decision rules, which give fix-defect", async () => {
  expect([
    destinations(await planned("answer-question"), "triage-investigate", "defect-found"),
    await routeOf({ intent: "defect", entryFlags: ["repro"] }),
  ]).toEqual(["decision-table", "fix-defect"]);
});

// QFAI:EX-0001-0214-04
it("request-info plans the received answers through the decision rules, which give fix-defect", async () => {
  expect([
    destinations(await planned("request-info"), "triage-close", "info-received"),
    await routeOf({ intent: "defect", entryFlags: ["repro", "cause"] }),
  ]).toEqual(["decision-table", "fix-defect"]);
});

// QFAI:EX-0001-0209-02
it("write-acceptance-tests always runs implement-credentials before implement-acceptance", async () => {
  const [implement] = (await planned("write-acceptance-tests")).stages;

  expect(implement?.steps.map((step) => [step.name, step.passThrough])).toEqual([
    ["implement-credentials", true],
    ["implement-acceptance", false],
  ]);
});
