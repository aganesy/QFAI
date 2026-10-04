// QFAI:AC-0001-0225-01
// QFAI:AC-0001-0225-02
// QFAI:AC-0001-0225-03
// QFAI:AC-0001-0225-04
// QFAI:AC-0001-0226-01
/**
 * The reviews a route's plan declares: a change route reviews the specification change once and
 * the whole diff once, a fix route and a route that changes no specification only the diff, and the verify stage
 * and a route ending at `triage-close` nothing.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import { loadBuiltInPlans, type WorkflowPlanFile } from "../../../src/core/workflow/plans.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// Each review a plan declares, as `stage:review`, in plan order.
function reviews(plan: WorkflowPlanFile | undefined): string[] {
  return (plan?.stages ?? []).flatMap((stage) =>
    stage.review ? [`${stage.id}:${stage.review}`] : [],
  );
}

async function planOf(route: string): Promise<WorkflowPlanFile | undefined> {
  return (await loadBuiltInPlans()).find((plan) => plan.route === route);
}

// QFAI:EX-0001-0225-01
// QFAI:EX-0001-0225-02
// QFAI:EX-0001-0225-04
it("add-feature reviews the specification and the diff; fix-defect and edit-text only the diff", async () => {
  expect({
    addFeature: reviews(await planOf("add-feature")),
    fixDefect: reviews(await planOf("fix-defect")),
    editText: reviews(await planOf("edit-text")),
  }).toEqual({
    addFeature: ["sdd:spec", "note:code"],
    fixDefect: ["note:code"],
    editText: ["note:code"],
  });
});

// QFAI:EX-0001-0225-03
it("A fix-defect gets no specification review, only the code review after note", async () => {
  const step = await readFile(
    path.join(PACKAGE_ROOT, "assets/init/.qfai/assistant/step/common-review-cycle/STEP.md"),
    "utf8",
  );
  const text = step.replace(/\s+/g, " ");

  expect({
    reviews: reviews(await planOf("fix-defect")),
    specOnlyOnChange: text.includes(
      "the specification review when the stage changed a story-tree or contract file",
    ),
    codeReviewer: text.includes("the code review of the whole diff: `implementation-reviewer`"),
  }).toEqual({ reviews: ["note:code"], specOnlyOnChange: true, codeReviewer: true });
});

// QFAI:EX-0001-0225-05
it("The verify stage of every change route, and every route ending at triage-close, hold no review", async () => {
  const plans = await loadBuiltInPlans();
  const reviewed = plans.flatMap((plan) =>
    plan.stages
      .filter(
        (stage) =>
          stage.review &&
          (stage.kind === "triage" || stage.steps.some((step) => step.name === "verify-repo-gate")),
      )
      .map((stage) => `${plan.route}:${stage.id}`),
  );
  const closing = plans.filter((plan) =>
    plan.stages.at(-1)?.steps.some((step) => step.name === "triage-close"),
  );

  expect({
    reviewed,
    closingReviews: closing.flatMap(reviews),
    answerQuestion: reviews(await planOf("answer-question")),
  }).toEqual({ reviewed: [], closingReviews: [], answerQuestion: [] });
});

it("Every change route reviews the specification once when it can change it, and the diff once", async () => {
  const plans = await loadBuiltInPlans();
  const changeRoutes = plans.filter((plan) =>
    plan.stages.some((stage) => stage.steps.some((step) => step.name === "verify-repo-gate")),
  );
  const writesSpec = (plan: WorkflowPlanFile) =>
    plan.stages.some(
      (stage) => stage.kind === "sdd" && stage.steps.some((step) => step.name === "sdd-story"),
    );
  const off = changeRoutes.filter((plan) => {
    const kinds = reviews(plan).map((each) => each.split(":")[1]);
    const expected = writesSpec(plan) ? ["spec", "code"] : ["code"];
    return kinds.join() !== expected.join();
  });

  expect({ changeRoutes: changeRoutes.length, off: off.map((plan) => plan.route) }).toEqual({
    changeRoutes: 23,
    off: [],
  });
});

// QFAI:EX-0001-0226-01
it("write-acceptance-tests writes the test bodies, runs the gates and reviews the code once", async () => {
  const plan = await planOf("write-acceptance-tests");
  const stages = (plan?.stages ?? []).map((stage) => [
    stage.id,
    stage.steps.map((step) => `${step.name}${step.passThrough ? "°" : ""}`),
  ]);

  expect({ stages, reviews: reviews(plan) }).toEqual({
    stages: [
      ["implement", ["implement-credentials°", "implement-acceptance"]],
      ["note", ["verify-change-note°"]],
      ["verify", ["verify-qfai-gate", "verify-repo-gate", "verify-commit"]],
    ],
    reviews: ["note:code"],
  });
});

// QFAI:EX-0001-0225-06
it("The review step names the reviewers of each review, and the surface reviewer on a UI flow", async () => {
  const step = await readFile(
    path.join(PACKAGE_ROOT, "assets/init/.qfai/assistant/step/common-review-cycle/STEP.md"),
    "utf8",
  );
  const reviewerSet = /- \*\*The reviewer set\.\*\*([\s\S]*?)\n- \*\*/.exec(step)?.[1] ?? "";

  expect(
    ["requirements-reviewer", "architecture-reviewer", "implementation-reviewer"].map((role) =>
      reviewerSet.includes(`\`${role}\``),
    ),
  ).toEqual([true, true, true]);
  expect(reviewerSet.replace(/\s+/g, " ")).toContain(
    "On a flow a UI contract with screens serves, `product-surface-reviewer` joins either review.",
  );
});
