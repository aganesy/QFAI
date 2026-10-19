// QFAI:AC-0001-0225-01
// QFAI:AC-0001-0225-02
// QFAI:AC-0001-0225-03
// QFAI:AC-0001-0225-04
// QFAI:AC-0001-0225-05
// QFAI:AC-0001-0225-06
// QFAI:AC-0001-0225-07
// QFAI:AC-0001-0226-01
/**
 * The reviews a route's plan declares: a change route reviews the specification change once and
 * the whole diff once, a fix route and a route that changes no specification only the diff, and the verify stage
 * and a route ending at `triage-close` nothing. Each review takes one reviewer for its kind, a
 * specialist only for a changed contract or screen, and none for a conflict-only merge or a code
 * review of a small literal-only change.
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
    codeReviewer: text.includes("`implementation-reviewer` for the code review of the whole diff"),
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

  expect(changeRoutes.length).toBeGreaterThan(0);
  expect(off.map((plan) => plan.route)).toEqual([]);
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

const flat = (text: string): string => text.replace(/\s+/g, " ").trim();

async function shipped(relative: string): Promise<string> {
  return readFile(path.join(PACKAGE_ROOT, "assets/init/.qfai/assistant", relative), "utf8");
}

const roles = (text: string): string[] => text.match(/`[a-z-]+-reviewer`/g) ?? [];

// The review step's reviewer set: the sentence before its list, each list item, and the paragraph after it.
async function reviewerSet(): Promise<{ intro: string; items: string[]; after: string }> {
  const step = await shipped("step/common-review-cycle/STEP.md");
  const block = /- \*\*The reviewer set\.\*\*([\s\S]*?)\n- \*\*/.exec(step)?.[1] ?? "";
  const [list = "", ...rest] = block.split(/\n\s*\n/);
  const [intro = "", ...items] = list.split(/\n {2}- /);
  return { intro: flat(intro), items: items.map(flat), after: flat(rest.join(" ")) };
}

// Step 6 of the entry skill, which states the same count.
async function runReviewStep(): Promise<string> {
  const skill = await shipped("skill/qfai-run/SKILL.md");
  return flat(/\n6\. \*\*Review\.\*\*([\s\S]*?)\n7\. /.exec(skill)?.[1] ?? "");
}

// QFAI:EX-0001-0225-01
// QFAI:EX-0001-0225-14
// QFAI:EX-0001-0225-15
it("Each review takes one reviewer for its kind, the architect only for an unread contract change, and no one else", async () => {
  const { intro, items } = await reviewerSet();

  expect(intro).toBe(
    "In a route, each review takes exactly these reviewers, each once in that review, with no threshold to judge:",
  );
  expect(items.map((item) => roles(item).join(" "))).toEqual([
    "`requirements-reviewer` `implementation-reviewer`",
    "`architecture-reviewer`",
    "`product-surface-reviewer`",
    "",
  ]);
  expect(items[0]).toBe(
    "one reviewer for its kind: `requirements-reviewer` for the specification review, `implementation-reviewer` for the code review of the whole diff;",
  );
  expect(items[1]).toBe(
    "`architecture-reviewer` too, only when the target holds a contract change no earlier review of the route read;",
  );
  expect(items[3]).toBe("no other reviewer. A stage the plan marks with no review gets none.");
  expect(flat(await shipped("step/common-review-cycle/STEP.md"))).toContain(
    "No reviewer is rerun.",
  );
  const evidence = flat(await shipped("skill/qfai-implement/references/ui-affecting.md"));
  expect(evidence).toContain(
    "A fix made for a finding of that review refreshes the capture it changes and is not reviewed again",
  );
  expect(evidence).not.toContain("refresh the capture and review");
  expect(reviews(await planOf("add-feature"))).toEqual(["sdd:spec", "note:code"]);
  expect(reviews(await planOf("fix-defect"))).toEqual(["note:code"]);
});

// QFAI:EX-0001-0225-06
// QFAI:EX-0001-0225-12
it("The surface reviewer joins only a review that reads a changed screen, not every review on a UI flow", async () => {
  const { items } = await reviewerSet();
  const step = flat(await shipped("step/common-review-cycle/STEP.md"));

  expect(items[2]).toBe(
    "`product-surface-reviewer` too, only when the target holds a screen change no earlier review of the route read: an edit to a UI contract's screen, or to the code, tests or styles that render one, or to a path `uiux.surfacePaths` declares. An uncertain case counts as a screen change (`.qfai/assistant/skill/qfai-implement/references/ui-affecting.md#routing`);",
  );
  expect(step).not.toContain("On a flow a UI contract with screens serves");
  // A parent skill invoked by name keeps its own reviewers; the rule binds a route.
  expect(flat(await shipped("step/sdd-triage/STEP.md"))).toContain(
    "`product-surface-reviewer` joins a review in a route only for a screen change, as `common-review-cycle`'s reviewer set says; `qfai-sdd` invoked by name keeps the reviewers its own `## Review` section names.",
  );
  expect(reviews(await planOf("prototype-feature"))).toEqual(["sdd:spec", "note:code"]);
  expect(reviews(await planOf("fix-defect"))).toEqual(["note:code"]);
});

// QFAI:EX-0001-0225-16
it("A declared surface path and an uncertain case both count as a screen change, as the UI routing reference says", async () => {
  const { items } = await reviewerSet();
  const routing = flat(
    /## Routing([\s\S]*?)\n## /.exec(
      await shipped("skill/qfai-implement/references/ui-affecting.md"),
    )?.[1] ?? "",
  );

  expect(items[2]).toContain("or to a path `uiux.surfacePaths` declares");
  expect(items[2]).toContain("An uncertain case counts as a screen change");
  expect(items[2]).toContain("references/ui-affecting.md#routing");
  expect(routing).toContain("a changed path matches a declared UI surface path");
  expect(routing).toContain("route an unresolved case as UI affecting");
  expect(reviews(await planOf("fix-defect"))).toEqual(["note:code"]);
});

// QFAI:EX-0001-0225-13
it("A review whose target only resolves conflicts between reviewed sides gets no reviewer, and the report says so", async () => {
  const { after } = await reviewerSet();
  const step = await shipped("step/common-review-cycle/STEP.md");
  const gate = flat(/## Gate([\s\S]*)$/.exec(step)?.[1] ?? "");

  expect(after).toMatch(
    /^A review whose target's only edits resolve the conflicts of a merge or a branch update between sides that were each already reviewed gets no reviewer\./,
  );
  expect(after).toContain("A resolution that adds content neither side had is not conflict-only.");
  expect(after).toContain("The stage report names the merge and why no reviewer ran.");
  expect(gate).toContain(
    "the stage report names each verdict and each answer, or says why the review dispatched no reviewer.",
  );
});

// QFAI:EX-0001-0225-17
it("A route code review of a small literal-only change gets no reviewer, and both reports say so", async () => {
  const { after } = await reviewerSet();
  const step = await shipped("step/common-review-cycle/STEP.md");
  const writes = flat(/## Writes([\s\S]*?)\n## /.exec(step)?.[1] ?? "");
  const gate = flat(/## Gate([\s\S]*)$/.exec(step)?.[1] ?? "");

  expect(after).toContain(
    "In a route, a code review whose target replaces at most five lines, a replaced line counting once, and no line added or removed, each changing only a literal value such as a version, a number, a name or a flag in a configuration or build file, gets no reviewer.",
  );
  expect(after).toContain(
    "A change to code, tests, a story-tree or contract file, a screen or a file's structure is not literal-only, and neither is a change that touches permissions, secrets, credentials or tokens; a URL, host, registry, image or action reference; a dependency or tool version resolved from the network; a workflow trigger; a setting that turns a check, lint rule, type check, gate or test on or off; or any text inside a shell command, script or recipe.",
  );
  expect(after).toContain(
    "The stage report and the final report both name the skip, the changed lines and why no reviewer ran.",
  );
  expect(writes).toContain(
    "For a code review skipped as a small literal-only change: the skip, the changed lines and why no reviewer ran, in the stage report and in the final report.",
  );
  expect(gate).toContain(
    "A code review skipped as a small literal-only change is named, with its changed lines and why, in the stage report and in the final report.",
  );
  expect(await runReviewStep()).toContain(
    "or a route code review of a small literal-only change, as `common-review-cycle` defines, gets no reviewer.",
  );
  expect(reviews(await planOf("change-tooling"))).toEqual(["note:code"]);
});

it("The entry skill's review step states the same count as the review step", async () => {
  const run = await runReviewStep();
  const { items } = await reviewerSet();

  expect([...new Set(roles(run))].sort()).toEqual([...new Set(items.flatMap(roles))].sort());
  expect(run).toContain(
    "whose `review` is `spec`, `requirements-reviewer` reviews; for `code`, `implementation-reviewer`.",
  );
  expect(run).toContain(
    "Only a contract or screen change no earlier review read adds `architecture-reviewer` or `product-surface-reviewer`, as `common-review-cycle` lists; no one else joins.",
  );
  expect(run).toContain(
    "A review whose target's only edits resolve the conflicts of a merge or branch update between reviewed sides, or a route code review of a small literal-only change, as `common-review-cycle` defines, gets no reviewer.",
  );
  expect(run).not.toMatch(/flows served by a UI contract/);
});
