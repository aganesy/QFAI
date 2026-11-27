/**
 * Integration: the shipped domain-language step, where the plans run it, and the skills that
 * list it. Reads the shipped step and skill files and the built-in plans.
 */
import { describe, expect, it } from "vitest";

import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";
import { flat, frontMatterOf, readShipped, sectionOf } from "../../helpers/shippedAssistant.js";

const STEP = "common-domain-language";

async function skillSteps(skill: string): Promise<unknown> {
  return frontMatterOf(await readShipped(`skill/${skill}/SKILL.md`)).steps;
}

describe("where the plans run the domain-language step", () => {
  // QFAI:AC-0001-0318-01
  // QFAI:EX-0001-0318-01
  it("runs it between research and interview in each discussion stage", async () => {
    const plans = await loadBuiltInPlans();
    const discussion = plans.flatMap((plan) =>
      plan.stages
        .filter((stage) => stage.kind === "discussion")
        .map((stage) => [plan.route, stage.steps.map((step) => [step.name, step.passThrough])]),
    );
    expect(discussion.map(([route]) => route).sort()).toEqual(["decide-design", "decompose-epic"]);
    for (const [, steps] of discussion) {
      expect(steps).toEqual([
        ["discussion-research", undefined],
        [STEP, true],
        ["discussion-interview", undefined],
      ]);
    }
  });

  // QFAI:EX-0001-0318-02
  it("runs it first, pass-through, in every sdd stage", async () => {
    const plans = await loadBuiltInPlans();
    const sdd = plans.flatMap((plan) =>
      plan.stages
        .filter((stage) => stage.kind === "sdd")
        .map((stage) => ({ route: plan.route, steps: stage.steps })),
    );
    expect(sdd.length).toBeGreaterThan(0);
    for (const { route, steps } of sdd) {
      expect(steps[0], route).toMatchObject({ name: STEP, passThrough: true });
      expect(steps[1]?.name, route).toBe("sdd-triage");
    }
  });
});

describe("what the step file says", () => {
  // QFAI:AC-0001-0318-02
  // QFAI:EX-0001-0318-03
  it("reads the glossary, writes by stage, and keeps definitions the user's", async () => {
    const text = await readShipped(`step/${STEP}/STEP.md`);
    expect(frontMatterOf(text)).toMatchObject({ name: STEP, owner: "common" });
    const body = flat(text);
    for (const phrase of [
      "glossary.md",
      "Avoid",
      "Context",
      "open-questions.md",
      "edge case",
      "cite the use",
      "no recommended answer",
      "critical decision",
    ]) {
      expect(body, phrase).toContain(phrase);
    }
    expect(body).toMatch(/names a rejected word as a word.*code span/i);
    const check = flat(await readShipped("skill/qfai-grilling/references/glossary-check.md"));
    expect(check).toMatch(/named as a word only in a code span kept on one line/i);
    expect(flat(sectionOf(text, "## Passes when"))).toMatch(/Read first: .*the step passes/i);
    expect(flat(sectionOf(text, "## Gate"))).not.toBe("");
  });
});

describe("terms a discussion settled", () => {
  // QFAI:EX-0001-0318-05
  it("are written into the glossary by the specification stage, which does not pass while one waits", async () => {
    const text = await readShipped(`step/${STEP}/STEP.md`);
    expect(flat(text)).toMatch(
      /specification stage writes each settled-term row .* into the glossary, then deletes that row/i,
    );
    expect(flat(sectionOf(text, "## Passes when"))).toMatch(/no settled-term row waits/i);
    expect(flat(text)).toMatch(/discussion stage writes no glossary row/i);
  });
});

describe("the skills that list the step", () => {
  // QFAI:AC-0001-0318-03
  // QFAI:EX-0001-0318-04
  it("puts it between research and interview, and first in qfai-sdd", async () => {
    expect(await skillSteps("qfai-discussion")).toEqual([
      "discussion-research",
      STEP,
      "discussion-interview",
    ]);
    const sdd = await skillSteps("qfai-sdd");
    expect(Array.isArray(sdd) ? sdd[0] : undefined).toBe(STEP);
  });
});
