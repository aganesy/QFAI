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

/** Every step each plan kind runs, across the five built-in plans, in first-seen order. */
async function kindSteps(kinds: string[]): Promise<{ names: string[]; proposed: string[] }> {
  const names: string[] = [];
  const proposed: string[] = [];
  for (const route of PLAN_ROUTES) {
    for (const stage of await planStageSteps(route)) {
      if (!kinds.includes(stage.kind)) continue;
      for (const step of stage.steps) {
        if (!names.includes(step.name)) names.push(step.name);
        if (step.when === "proposed" && !proposed.includes(step.name)) proposed.push(step.name);
      }
    }
  }
  return { names, proposed };
}

/** The steps of one plan's stages of one kind, as names. */
async function stageNames(route: string, kind: string): Promise<string[][]> {
  const stages = await planStageSteps(route);
  return stages
    .filter((stage) => stage.kind === kind)
    .map((stage) => stage.steps.map((step) => step.name));
}

describe("the skills a workflow run's steps belong to", () => {
  // QFAI:AC-0001-0202-04
  // QFAI:EX-0001-0202-07
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

  // QFAI:AC-0001-0202-05
  // QFAI:EX-0001-0202-08
  it("lists each owner's steps in order, with no review profile of its own", async () => {
    expect(await skillSteps("qfai-maintain")).toEqual(["maintain-edit"]);
    expect(await skillSteps("qfai-verify")).toEqual([
      "verify-context",
      "verify-qfai-gate",
      "verify-repo-gate",
    ]);
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

  // QFAI:AC-0001-0202-06
  // QFAI:EX-0001-0202-09
  it("leaves every owner model-invocable", async () => {
    for (const skill of PLAN_STEP_OWNERS) {
      const text = await readShipped(`skill/${skill}/SKILL.md`);
      expect(text, `${skill}/SKILL.md has front matter`).toMatch(/^---\r?\n/);
      expect(Object.keys(frontMatterOf(text)), skill).not.toContain("disable-model-invocation");
    }
  });

  // QFAI:AC-0001-0204-02
  // QFAI:EX-0001-0204-02
  it("runs only qfai-atdd's own steps in the acceptance stages", async () => {
    const owned = await skillSteps("qfai-atdd");
    expect(owned).toEqual(["atdd-scaffold", "atdd-credentials", "atdd-author", "atdd-test-fix"]);
    const acceptance = await kindSteps(["acceptance"]);
    expect(acceptance.names.filter((step) => !owned.includes(step))).toEqual([]);
    expect((await stageNames("bugfix", "test_fix")).flat()).toContain("atdd-test-fix");
  });

  // QFAI:AC-0001-0207-02
  // QFAI:EX-0001-0207-02
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
      ].sort(),
    );
    const implement = await kindSteps(["diagnose", "implement", "regression_fix"]);
    expect(implement.names.filter((step) => !owned.includes(step))).toEqual([]);
    expect((await stageNames("bugfix", "test_fix")).flat()).toContain("implement-test-fix");
    const every = await kindSteps(Object.keys(await everyKind()));
    expect(every.names).not.toContain("implement-seam");
  });

  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-04
  it("runs only qfai-sdd's own steps in the story-authoring stages", async () => {
    const owned = await skillSteps("qfai-sdd");
    const authoring = await kindSteps(["sdd", "sdd_delta", "sdd_append"]);
    expect(authoring.names.filter((step) => !owned.includes(step))).toEqual([]);
    expect(await stageNames("bugfix", "sdd_append")).toEqual([["sdd-story", "sdd-gate"]]);
  });

  // QFAI:AC-0001-0215-07
  // QFAI:EX-0001-0215-08
  it("runs exactly qfai-verify's three steps in every change route's verify stage", async () => {
    const owned = await skillSteps("qfai-verify");
    expect(owned).toEqual(["verify-context", "verify-qfai-gate", "verify-repo-gate"]);
    for (const route of ["direct", "bugfix", "bounded-change", "feature"]) {
      expect(await stageNames(route, "verify"), route).toEqual([owned]);
    }
  });

  // QFAI:AC-0001-0206-03
  // QFAI:EX-0001-0206-03
  it("runs only qfai-discussion's steps in discovery, the UI sidecars when proposed", async () => {
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
    expect(discussion.proposed).toEqual(["discussion-uiux"]);
  });

  // QFAI:AC-0001-0211-02
  // QFAI:EX-0001-0211-02
  it("runs the four prototyping steps of the loop in the feature plan", async () => {
    const owned = await skillSteps("qfai-prototyping");
    expect(owned).toEqual([
      "prototyping-grill",
      "prototyping-preflight",
      "prototyping-loop",
      "prototyping-handoff",
      "prototyping-recover",
    ]);
    expect(await stageNames("feature", "prototype")).toEqual([owned.slice(0, 4)]);
  });
});

/** The reviewers one review takes after the given steps ran: the union of their profiles'. */
async function unionOfReviewers(steps: string[]): Promise<string[]> {
  const effective = await readEffectiveRouting(defaultConfig);
  const union = new Set(steps.flatMap((step) => stepReview(effective, step).alwaysRequired));
  return [...union].sort();
}

describe("a parent skill invoked by name", () => {
  // QFAI:AC-0001-0202-07
  it("reads one step at a time, in order, and reviews once after the last step", async () => {
    const byName = flat(
      sectionOf(
        await readShipped("rule/shared-skill-operating-baseline.md"),
        "### A parent skill invoked by name",
      ),
    );
    expect(byName).toMatch(/take the steps from the parent's `steps:` list, in that order/i);
    expect(byName).toMatch(/read that step's `STEP\.md` and no other, run it/i);
    expect(byName).toMatch(/after the last step, run one review through `common-review-cycle`/i);
    expect(byName).toMatch(
      /the union of the reviewers the profiles of the steps that ran require/i,
    );
  });

  // QFAI:EX-0001-0202-10
  it("runs the three verify steps and reviews them once with completion-reviewer and qa-gatekeeper", async () => {
    const steps = await skillSteps("qfai-verify");
    expect(steps).toEqual(["verify-context", "verify-qfai-gate", "verify-repo-gate"]);
    const context = frontMatterOf(await readShipped("step/verify-context/STEP.md"));
    expect(context["routing-profile"]).toBeUndefined();
    for (const step of ["verify-qfai-gate", "verify-repo-gate"]) {
      const front = frontMatterOf(await readShipped(`step/${step}/STEP.md`));
      expect(front["routing-profile"], step).toBe("runtime-heavy");
    }
    expect(await unionOfReviewers(steps)).toEqual(["completion-reviewer", "qa-gatekeeper"]);
  });

  // QFAI:EX-0001-0202-11
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
    expect(await unionOfReviewers(ran)).toEqual(["architecture-reviewer", "completion-reviewer"]);
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
