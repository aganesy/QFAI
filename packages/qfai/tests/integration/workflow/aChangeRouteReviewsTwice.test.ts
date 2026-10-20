// QFAI:AC-0001-0225-01
// QFAI:AC-0001-0225-02
// QFAI:AC-0001-0225-03
// QFAI:AC-0001-0225-04
// QFAI:AC-0001-0225-05
// QFAI:AC-0001-0225-06
// QFAI:AC-0001-0225-07
// QFAI:AC-0001-0225-08
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

import { afterEach, expect, it } from "vitest";

import type { WorkflowExtraction } from "../../../src/core/workflow/extraction.js";
import {
  loadBuiltInPlans,
  parsePlan,
  type WorkflowPlanFile,
} from "../../../src/core/workflow/plans.js";
import { withSpecStage } from "../../../src/core/workflow/specStage.js";
import { extraction } from "../../helpers/workflowExtraction.js";
import { field, minimalProject, removeProjects, workflow, writeJson } from "./workflowProject.js";

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

afterEach(removeProjects);

// The plan `npx qfai workflow plan --in` prints for the extraction.
async function planJson(value: WorkflowExtraction): Promise<unknown> {
  const root = await minimalProject();
  const file = await writeJson(root, "tmp/request.json", value);
  return workflow(root, ["plan", "--in", file]).json;
}

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// The route, each stage as `id[steps]{review}` and the decision points of the plan for the
// extraction.
async function plannedFor(value: WorkflowExtraction): Promise<unknown> {
  const json = await planJson(value);
  const shown = list(field(json, "stages")).map((stage) => {
    const names = list(field(stage, "steps")).map(
      (step) => `${String(field(step, "name"))}${field(step, "passThrough") === true ? "°" : ""}`,
    );
    const review = field(stage, "review");
    return `${String(field(stage, "id"))}[${names.join(" ")}]${review ? `{${String(review)}}` : ""}`;
  });
  return {
    route: field(json, "route"),
    stages: shown,
    decisionPoints: field(json, "decisionPoints"),
  };
}

// Each scope of the plan for the extraction, as `scope:stage/stage`.
async function scopesFor(value: WorkflowExtraction): Promise<string[]> {
  return list(field(await planJson(value), "scopes")).map(
    (scope) =>
      `${String(field(scope, "scope"))}:${list(field(scope, "stages")).map(String).join("/")}`,
  );
}

const SPEC_STAGE = "spec[sdd-triage sdd-story° sdd-contract°]{spec}";
const NOTE = "note[verify-change-note°]{code}";
const GATES = "verify[verify-qfai-gate verify-repo-gate verify-commit]";
const CI_REQUEST = extraction({
  intent: "ci",
  entryFlags: ["expect"],
  artifacts: ["tests", "spec", "ci"],
  confidence: "medium",
  alternatives: [
    { intent: "behaviour-change", entryFlags: ["expect"], qualifiers: [], signals: [] },
  ],
});

// QFAI:EX-0001-0225-20
it("A tooling request that names the story tree gets a specification stage and its review", async () => {
  const withoutSpec = extraction({ ...CI_REQUEST, artifacts: ["tests", "ci"] });

  expect({
    withSpec: await plannedFor(CI_REQUEST),
    withoutSpec: await plannedFor(withoutSpec),
    scopes: [await scopesFor(CI_REQUEST), await scopesFor(withoutSpec)],
  }).toEqual({
    withSpec: {
      route: "change-tooling",
      stages: [SPEC_STAGE, "edit[implement-tooling]", NOTE, GATES],
      decisionPoints: ["sdd-triage"],
    },
    withoutSpec: {
      route: "change-tooling",
      stages: ["edit[implement-tooling]", NOTE, GATES],
      decisionPoints: [],
    },
    scopes: [["broad:spec/edit/note/verify"], ["broad:edit/note/verify"]],
  });
});

// QFAI:EX-0001-0225-21
it("The specification stage follows the route's last sdd stage, or else precedes its first writing stage", async () => {
  expect({
    fix: await plannedFor(
      extraction({ intent: "defect", artifacts: ["code", "tests", "contract"] }),
    ),
    flagged: field(
      await plannedFor(
        extraction({
          intent: "defect",
          entryFlags: ["decision"],
          artifacts: ["code", "tests", "spec"],
        }),
      ),
      "decisionPoints",
    ),
    retire: await plannedFor(
      extraction({
        intent: "unenforced",
        qualifiers: ["removal-requested"],
        artifacts: ["code", "spec"],
      }),
    ),
  }).toEqual({
    fix: {
      route: "fix-defect",
      stages: ["diagnose[implement-diagnose]", SPEC_STAGE, "implement[implement-tdd]", NOTE, GATES],
      decisionPoints: ["sdd-triage"],
    },
    flagged: ["implement-diagnose", "sdd-triage"],
    retire: {
      route: "retire-mechanism",
      stages: [
        "diagnose[implement-diagnose]",
        "decide[sdd-triage]",
        "spec[sdd-story° sdd-contract°]{spec}",
        "remove[implement-retire]",
        NOTE,
        GATES,
      ],
      decisionPoints: ["sdd-triage"],
    },
  });
});

// A plan in the shape of a plan file, so the plan format can read it back.
function asPlanFile(plan: WorkflowPlanFile): string {
  return JSON.stringify({
    route: plan.route,
    family: plan.family,
    stages: plan.stages.map((stage) => ({
      id: stage.id,
      kind: stage.kind,
      steps: stage.steps.map((step) =>
        step.passThrough === undefined && step.mode === undefined
          ? step.name
          : { step: step.name, passThrough: step.passThrough, mode: step.mode },
      ),
      ...(stage.after.length > 0 ? { after: stage.after } : {}),
      ...(stage.review ? { review: stage.review } : {}),
    })),
    decisionPoints: plan.decisionPoints,
    ...(plan.releasePoint === undefined ? {} : { releasePoint: plan.releasePoint }),
    branchPoints: plan.branchPoints,
  });
}

// QFAI:EX-0001-0225-21
it("Every plan the specification stage expands still reads back as a valid plan", async () => {
  const plans = await loadBuiltInPlans();
  const expanded = plans
    .map((plan) => ({ plan, wider: withSpecStage(plan, ["code", "tests", "spec"]) }))
    .filter(({ plan, wider }) => wider !== plan)
    .map(({ wider }) => wider);
  const faults = expanded.flatMap((plan) => {
    const load = parsePlan(asPlanFile(plan), plan.route);
    return load.ok
      ? []
      : load.refusals.map((each) => `${each.route}:${each.reason}:${each.subject}`);
  });

  expect(expanded.map((plan) => plan.route)).toEqual(
    expect.arrayContaining(["change-tooling", "fix-defect", "retire-mechanism"]),
  );
  expect(faults).toEqual([]);
});

// QFAI:EX-0001-0225-22
it("A security intake, a conflict resolution, a route that writes nothing and a refused request gain no specification stage", async () => {
  const planned = [
    await plannedFor(extraction({ intent: "security", artifacts: ["spec"] })),
    await plannedFor(
      extraction({
        intent: "stale-record",
        qualifiers: ["meaning-preserving"],
        artifacts: ["docs", "spec"],
      }),
    ),
    await plannedFor(extraction({ intent: "design", artifacts: ["spec"] })),
  ];

  expect(planned.map((each) => field(each, "route"))).toEqual([
    "fix-vulnerability",
    "resolve-conflicts",
    "decide-design",
  ]);
  const stages = planned.flatMap((each) => list(field(each, "stages")));
  expect(stages.filter((stage) => String(stage).startsWith("spec["))).toEqual([]);

  const refused = await planJson(
    extraction({ intent: "docs", artifacts: ["code", "tests", "spec"] }),
  );
  expect(list(field(refused, "reasons")).map((each) => field(each, "subject"))).toEqual([
    "code",
    "tests",
    "spec",
  ]);

  const candidates = list(
    field(
      await planJson(
        extraction({
          intent: "ci",
          artifacts: ["spec", "ci"],
          confidence: "low",
          alternatives: [{ intent: "refactor", entryFlags: [], qualifiers: [], signals: [] }],
        }),
      ),
      "candidates",
    ),
  );
  expect(
    candidates.map((each) => [
      field(each, "route"),
      list(field(each, "scopes")).some((scope) => list(field(scope, "stages")).includes("spec")),
    ]),
  ).toEqual([
    ["change-tooling", false],
    ["refactor-code", false],
  ]);
});

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
    "re-review. No other reviewer is rerun.",
  );
  const evidence = flat(await shipped("skill/qfai-implement/references/ui-affecting.md"));
  expect(evidence).toContain(
    "A fix made for a finding of that review refreshes the capture it changes, and a fix that changes behaviour gets its one focused re-review",
  );
  expect(evidence).not.toContain("is not reviewed again");
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
  expect(after).toContain(
    "In the `resolve-conflicts` route, a resolution that touches a story-tree file, a contract, or `decisions.md` or `open-questions.md` is not exempt: it gets the code review, and `architecture-reviewer` too for a contract.",
  );
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
    "A change to code, tests, a story-tree or contract file, a screen or a file's structure is not literal-only, and neither is a change that touches permissions, secrets, credentials or tokens; a URL, host, registry, image or action reference; a dependency or tool version resolved from the network; a workflow trigger; a setting that turns a check, lint rule, type check, gate or test on or off; any text inside a shell command, script or recipe; or a package's own version, or any value a release, tag or publish job reads.",
  );
  expect(after).toContain(
    "The stage report and the final report both name the skip, the changed lines and why no reviewer ran.",
  );
  expect(writes).toContain(
    "For a code review skipped as a small literal-only change: the skip, the changed lines and why no reviewer ran, in the stage report and in the final report.",
  );
  expect(gate).toContain(
    "For a code review skipped as a small literal-only change, the stage report names the skip, the changed lines and why, and records the skip for the final report.",
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
  expect(run).toContain(
    "A conflict resolution the plan's own edit stage made in the story tree, a contract or a register still gets one.",
  );
  expect(run).toContain("a behaviour fix gets one re-review, as `common-review-cycle` says.");
  expect(run).not.toMatch(/flows served by a UI contract/);
});
