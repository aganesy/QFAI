/**
 * Integration: what every skill owning a step of a built-in plan carries so a workflow run and an
 * operator can reach it, and which of its steps the plans run.
 *
 * The description opens with its trigger, the `steps:` front matter lists the owner's steps, and
 * each plan stage runs only steps its owner lists. How the core loads a plan is not this module's.
 */
import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { readEffectiveRouting, stepReview } from "../../../src/core/validators/agentDefinition.js";
import {
  PLAN_ROUTES,
  PLAN_STEP_OWNERS,
  flat,
  frontMatterOf,
  planStageSteps,
  readShipped,
  rowOf,
  sectionOf,
  skillSteps,
} from "../../helpers/shippedAssistant.js";

/** The steps `qfai-verify` owns, in the order it runs them when invoked by name. */
const VERIFY_STEPS = [
  "verify-repeat-run",
  "verify-advisory",
  "verify-change-note",
  "verify-context",
  "verify-qfai-gate",
  "verify-repo-gate",
  "verify-external",
  "verify-manual",
  "verify-release-notes",
];

/** The verify block every change route runs. */
const VERIFY_BLOCK = ["verify-qfai-gate", "verify-repo-gate"];

/** Every step each plan kind runs, across the built-in plans, in first-seen order. */
async function kindSteps(kinds: string[]): Promise<{ names: string[]; passThrough: string[] }> {
  const names: string[] = [];
  const passThrough: string[] = [];
  for (const route of PLAN_ROUTES) {
    for (const stage of await planStageSteps(route)) {
      if (!kinds.includes(stage.kind)) continue;
      for (const step of stage.steps) {
        if (!names.includes(step.name)) names.push(step.name);
        if (step.passThrough && !passThrough.includes(step.name)) passThrough.push(step.name);
      }
    }
  }
  return { names, passThrough };
}

/** The steps of one plan's stages of one kind, as names. */
async function stageNames(route: string, kind: string): Promise<string[][]> {
  const stages = await planStageSteps(route);
  return stages
    .filter((stage) => stage.kind === kind)
    .map((stage) => stage.steps.map((step) => step.name));
}

describe("the skills a workflow run's steps belong to", () => {
  // QFAI:AC-0001-0195-04
  // QFAI:EX-0001-0195-07
  it("opens every owner's description with its trigger condition", async () => {
    for (const skill of PLAN_STEP_OWNERS) {
      const description = frontMatterOf(await readShipped(`skill/${skill}/SKILL.md`)).description;
      expect(typeof description, `${skill} has a description`).toBe("string");
      const text = String(description);
      expect(text, `${skill}: nothing precedes the trigger`).toMatch(
        /^Use when invoked by name or handed a QFAI work order\b/,
      );
      expect(text.length, `${skill}: at most 1024 characters`).toBeLessThanOrEqual(1024);
      expect(text, `${skill}: no angle bracket`).not.toMatch(/[<>]/);
    }
  });

  // QFAI:AC-0001-0195-05
  // QFAI:EX-0001-0195-08
  it("lists each owner's steps in order, with no review profile of its own", async () => {
    expect(await skillSteps("qfai-maintain")).toEqual(["maintain-edit"]);
    expect(await skillSteps("qfai-verify")).toEqual(VERIFY_STEPS);
    expect(await skillSteps("qfai-sdd")).toEqual([
      "sdd-triage",
      "sdd-flow",
      "sdd-story",
      "sdd-contract",
      "common-design-md",
      "sdd-cycle",
      "sdd-gate",
    ]);
    for (const skill of PLAN_STEP_OWNERS) {
      const front = frontMatterOf(await readShipped(`skill/${skill}/SKILL.md`));
      expect(Object.keys(front), skill).not.toContain("routing-profile");
      const stepRoles: string[] = [];
      for (const step of await skillSteps(skill)) {
        const roles = frontMatterOf(await readShipped(`step/${step}/STEP.md`)).roles;
        if (Array.isArray(roles)) stepRoles.push(...roles.map(String));
      }
      const declared = Array.isArray(front.roles) ? front.roles.map(String) : [];
      expect([...new Set(declared)].sort(), skill).toEqual(
        [...new Set(["orchestrator", ...stepRoles])].sort(),
      );
    }
    const sdd = await readShipped("skill/qfai-sdd/SKILL.md");
    expect(sdd).toContain(".qfai/assistant/step/");
    expect(sdd).toContain("common-design-md");
  });

  // QFAI:AC-0001-0195-06
  // QFAI:EX-0001-0195-09
  it("leaves every owner model-invocable", async () => {
    for (const skill of PLAN_STEP_OWNERS) {
      const text = await readShipped(`skill/${skill}/SKILL.md`);
      expect(text, `${skill}/SKILL.md has front matter`).toMatch(/^---\r?\n/);
      expect(Object.keys(frontMatterOf(text)), skill).not.toContain("disable-model-invocation");
    }
  });

  // A model-invocable owner the host picks for a free-text request hands it to `qfai-run` only
  // through the entry check, and a parent reads only the baseline sections its body cites.
  // QFAI:AC-0001-0195-01
  // QFAI:EX-0001-0195-01
  it("runs the entry check first in every owner", async () => {
    const runFirst =
      "Run the entry check of `.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory` first.";
    for (const skill of PLAN_STEP_OWNERS) {
      const body = flat(await readShipped(`skill/${skill}/SKILL.md`));
      const at = body.indexOf(runFirst);
      expect(at, skill).toBeGreaterThan(-1);
      expect(
        body.indexOf("## ", body.indexOf("[DRIFT-PROTOCOL:MANDATORY]")),
        skill,
      ).toBeGreaterThan(at);
    }
  });

  // QFAI:AC-0001-0200-02
  // QFAI:EX-0001-0200-02
  it("runs only qfai-implement's own steps, and never the seam step, in the plans", async () => {
    const owned = await skillSteps("qfai-implement");
    expect([...owned].sort()).toEqual(
      [
        "implement-diagnose",
        "implement-tdd",
        "implement-regression-fix",
        "implement-test-fix",
        "implement-seam",
        "implement-checkpoint",
        "implement-bisect",
        "implement-revert",
        "implement-minimize",
        "implement-stress-harness",
        "implement-oracle-parity",
        "implement-benchmark",
        "implement-refactor",
        "implement-retire",
        "implement-sweep",
        "implement-quarantine",
        "implement-dep-bump",
        "implement-tooling",
        "implement-backport",
        "implement-scaffold",
        "implement-credentials",
        "implement-acceptance",
      ].sort(),
    );
    const implement = await kindSteps(["diagnose", "implement", "test_fix", "regression_fix"]);
    expect(implement.names.filter((step) => !owned.includes(step))).toEqual([]);
    expect((await stageNames("repair-test", "test_fix")).flat()).toContain("implement-test-fix");
    const every = await kindSteps(Object.keys(await everyKind()));
    expect(every.names).not.toContain("implement-seam");
  });

  // QFAI:AC-0001-0207-04
  // QFAI:EX-0001-0207-04
  it("runs only qfai-sdd's own steps in the story-authoring stages", async () => {
    const owned = await skillSteps("qfai-sdd");
    const authoring = await kindSteps(["sdd", "sdd_append"]);
    expect(authoring.names.filter((step) => !owned.includes(step))).toEqual([]);
    for (const route of PLAN_ROUTES) {
      for (const append of await stageNames(route, "sdd_append")) {
        expect(append, route).toEqual(["sdd-story", "sdd-gate"]);
      }
    }
    expect(await stageNames("fix-defect", "sdd_append")).toEqual([["sdd-story", "sdd-gate"]]);
  });

  // QFAI:AC-0001-0208-07
  // QFAI:EX-0001-0208-08
  // QFAI:EX-0001-0216-06
  it("lists qfai-verify's nine steps and runs the whole verify block in every change route", async () => {
    expect(await skillSteps("qfai-verify")).toEqual(VERIFY_STEPS);
    let changeRoutes = 0;
    for (const route of PLAN_ROUTES) {
      const blocks = (await stageNames(route, "verify")).filter((steps) =>
        steps.includes("verify-repo-gate"),
      );
      if (blocks.length === 0) continue;
      changeRoutes += 1;
      expect(blocks, route).toEqual([VERIFY_BLOCK]);
    }
    expect(changeRoutes).toBe(23);
  });

  // QFAI:AC-0001-0199-03
  // QFAI:EX-0001-0199-03
  it("runs only qfai-discussion's steps in the decide plans, and the UI sidecars step may pass", async () => {
    const owned = await skillSteps("qfai-discussion");
    expect(owned).toEqual([
      "discussion-research",
      "discussion-interview",
      "discussion-pack",
      "discussion-oq",
      "discussion-uiux",
    ]);
    const discussion = await kindSteps(["discussion"]);
    expect(discussion.names.filter((step) => !owned.includes(step))).toEqual([]);
    expect(discussion.passThrough).toEqual(["discussion-pack", "discussion-uiux"]);
    const uiux = await readShipped("step/discussion-uiux/STEP.md");
    expect(sectionOf(uiux, "## Skipped when")).toBe("");
    expect(flat(sectionOf(uiux, "## Passes when"))).toMatch(
      /the step passes when the target is not UI-bearing/i,
    );
  });

  // QFAI:AC-0001-0204-02
  // QFAI:EX-0001-0204-02
  it("runs the four prototyping steps of the loop in the prototype-feature plan", async () => {
    const owned = await skillSteps("qfai-prototyping");
    expect(owned).toEqual([
      "prototyping-grill",
      "prototyping-preflight",
      "prototyping-loop",
      "prototyping-recover",
      "prototyping-handoff",
    ]);
    expect(await stageNames("prototype-feature", "prototype")).toEqual([
      owned.filter((step) => step !== "prototyping-recover"),
    ]);
  });
});

/** The reviewers one review takes after the given steps ran: the union of their profiles'. */
async function unionOfReviewers(steps: string[]): Promise<string[]> {
  const effective = await readEffectiveRouting(defaultConfig);
  const union = new Set(steps.flatMap((step) => stepReview(effective, step).alwaysRequired));
  return [...union].sort();
}

describe("a parent skill invoked by name", () => {
  // QFAI:AC-0001-0195-07
  it("reads one step at a time, in order, and reviews once after the last step", async () => {
    const baseline = await readShipped("rule/shared-skill-operating-baseline.md");
    expect(flat(sectionOf(baseline, "## Running Steps"))).toMatch(
      /a parent's `requires` names the `common-\*` steps its own body runs\*\*, such as `common-review-cycle`/i,
    );
    for (const skill of PLAN_STEP_OWNERS) {
      const front = frontMatterOf(await readShipped(`skill/${skill}/SKILL.md`));
      if (skill !== "qfai-triage") expect(front.requires, skill).toContain("common-review-cycle");
    }
    const byName = flat(sectionOf(baseline, "### A parent skill invoked by name"));
    expect(byName).toMatch(/take the steps from the parent's `steps:` list, in that order/i);
    expect(byName).toMatch(/read that step's `STEP\.md` and no other, run it/i);
    expect(byName).toMatch(
      /after the last step, run the one review the parent names, through `common-review-cycle`/i,
    );
    expect(byName).toMatch(
      /the specification review for `qfai-sdd` and `qfai-discussion`, the code review for a parent that changed code, tests or a change note, and none for `qfai-triage` or for a `qfai-verify` run that wrote nothing/i,
    );
    expect(byName).not.toMatch(/union of the reviewers/i);
  });

  // QFAI:EX-0001-0195-10
  it("runs the verify block and no review", async () => {
    const skill = await readShipped("skill/qfai-verify/SKILL.md");
    const steps = (await skillSteps("qfai-verify")).filter((step) =>
      /\| Never/.test(rowOf(skill, `| \`${step}\``)),
    );
    expect(steps).toEqual([
      "verify-change-note",
      "verify-context",
      "verify-qfai-gate",
      "verify-repo-gate",
    ]);
    const context = frontMatterOf(await readShipped("step/verify-context/STEP.md"));
    expect(context["routing-profile"]).toBeUndefined();
    for (const step of ["verify-qfai-gate", "verify-repo-gate"]) {
      const front = frontMatterOf(await readShipped(`step/${step}/STEP.md`));
      expect(front["routing-profile"], step).toBe("runtime-heavy");
    }
    expect(flat(sectionOf(skill, "## Review"))).toMatch(
      /a run that wrote no tracked file holds no review/i,
    );
  });

  // QFAI:EX-0001-0195-11
  it("skips the DESIGN.md step on a flow no UI contract serves and reviews the rest once", async () => {
    const steps = await skillSteps("qfai-sdd");
    expect(steps).toEqual([
      "sdd-triage",
      "sdd-flow",
      "sdd-story",
      "sdd-contract",
      "common-design-md",
      "sdd-cycle",
      "sdd-gate",
    ]);
    const skill = await readShipped("skill/qfai-sdd/SKILL.md");
    expect(rowOf(skill, "| `common-design-md`")).toMatch(/The flow is not UI-bearing/);
    const ran = steps.filter((step) => step !== "common-design-md");
    expect(await unionOfReviewers(ran)).toEqual(["architecture-reviewer", "requirements-reviewer"]);
  });
});

/** Every stage kind the built-in plans use. */
async function everyKind(): Promise<Record<string, true>> {
  const kinds: Record<string, true> = {};
  for (const route of PLAN_ROUTES) {
    for (const stage of await planStageSteps(route)) kinds[stage.kind] = true;
  }
  return kinds;
}
