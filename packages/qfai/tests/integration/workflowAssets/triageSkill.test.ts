/**
 * Integration: the `qfai-triage` stage skill `qfai init` ships and its nine steps — what the parent
 * lists, what each step's front matter and routing entry carry, and what the shipped text says a
 * request that ends without a change leaves behind.
 */
import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { loadBuiltInPlans } from "../../../src/core/workflow/plans.js";
import { parseAutopilotPolicy } from "../../../src/core/validators/autopilotPolicy.js";
import { readEffectiveRouting, stepReview } from "../../../src/core/validators/agentDefinition.js";
import {
  flat,
  frontMatterOf,
  readShipped,
  rowOf,
  sectionOf,
  skillSteps,
} from "../../helpers/shippedAssistant.js";

const SKILL = "skill/qfai-triage/SKILL.md";

const TRIAGE_STEPS = [
  "triage-close",
  "triage-answer",
  "triage-investigate",
  "triage-request-info",
  "triage-dedupe",
  "triage-decompose",
  "triage-cluster",
  "triage-security-intake",
  "triage-handoff",
];

function step(name: string): Promise<string> {
  return readShipped(`step/${name}/STEP.md`);
}

describe("qfai-triage as a stage skill", () => {
  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-05
  it("lists the nine triage steps, closing last, and opens its description with its trigger", async () => {
    const steps = await skillSteps("qfai-triage");
    expect([...steps].sort()).toEqual([...TRIAGE_STEPS].sort());
    expect(steps.at(-1)).toBe("triage-close");

    const front = frontMatterOf(await readShipped(SKILL));
    const description = String(front.description);
    expect(description).toMatch(/^Use when invoked by name or handed a QFAI work order\b/);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(description).not.toMatch(/[<>]/);
    expect(Object.keys(front)).not.toContain("disable-model-invocation");
    expect(Object.keys(front)).not.toContain("routing-profile");

    const stepRoles: string[] = [];
    for (const name of steps) {
      const stepFront = frontMatterOf(await step(name));
      expect(stepFront.name, name).toBe(name);
      expect(stepFront.owner, name).toBe("qfai-triage");
      if (Array.isArray(stepFront.roles)) stepRoles.push(...stepFront.roles.map(String));
    }
    const declared = Array.isArray(front.roles) ? front.roles.map(String) : [];
    expect([...new Set(declared)].sort()).toEqual(
      [...new Set(["orchestrator", ...stepRoles])].sort(),
    );
  });

  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-05
  it("routes each step by name on its own profile and gives the skill no entry", async () => {
    const effective = await readEffectiveRouting(defaultConfig);
    expect(effective.routing?.has("qfai-triage")).toBe(false);
    for (const name of TRIAGE_STEPS) {
      expect(frontMatterOf(await step(name))["routing-profile"], name).toBe("default");
      expect(stepReview(effective, name).profile, name).toBe("default");
      expect(stepReview(effective, name).alwaysRequired, name).toEqual([]);
    }
  });
});

describe("qfai-triage invoked by name", () => {
  // QFAI:AC-0001-0214-04
  // QFAI:EX-0001-0214-06
  it("runs the duplicate check and the close for a duplicate question, and ends at its stage", async () => {
    const skill = await readShipped(SKILL);
    const steps = sectionOf(skill, "## Steps");
    expect(rowOf(steps, "| `triage-dedupe`")).toMatch(/may repeat an existing item/);
    expect(rowOf(steps, "| `triage-close`")).toMatch(/Only `triage-security-intake` ran/);
    expect(flat(steps)).toMatch(/Invoked by name, the skill ends at this stage/);
    expect(flat(steps)).toMatch(/starts no other stage and routes no follow-up/);
    expect(flat(sectionOf(skill, "### Reviewer Gate"))).toMatch(
      /A tracked file the stage changed fails the review/,
    );
    expect(flat(sectionOf(skill, "## Completion"))).toMatch(/never says a change is done/i);

    const policy = parseAutopilotPolicy(skill, "qfai-triage");
    expect(policy.hardRequiredMissing).toEqual([]);
    expect(policy.hardRequiredUnknown).toEqual([]);
    expect(
      parseAutopilotPolicy("## Default Autopilot Policy\n", "qfai-triage").hardRequiredMissing,
    ).toEqual(["triage request"]);

    for (const name of TRIAGE_STEPS) {
      expect(flat(sectionOf(await step(name), "## What it writes")), name).toMatch(
        /No file git tracks/,
      );
    }
    expect(flat(await step("triage-dedupe"))).toMatch(/does not edit the items it links/);
    const remit = sectionOf(
      await readShipped("rule/references/reviewer-remit.md"),
      "## Reviewer remit",
    );
    expect(rowOf(remit, "`/qfai-triage`")).toMatch(/no tracked file changed/);
  });
});

describe("a question answered without a change", () => {
  // QFAI:AC-0001-0214-01
  // QFAI:EX-0001-0214-01
  // QFAI:EX-0001-0214-09
  // QFAI:EX-0001-0223-08
  it("excludes only the pre-handoff approval record from the route's no-change gate", async () => {
    const gate = flat(sectionOf(await step("triage-close"), "## Gate"));

    expect(gate).toMatch(/\bno tracked file changed by (?:any|a|the) triage step\b/i);
    expect(gate).toMatch(/\bonly (?:exception|exclusion)\b/i);
    expect(gate).toMatch(/\brequired approval row\b/i);
    expect(gate).toContain("`decisions.md`");
    expect(gate).toMatch(/`qfai-run`.*\b(?:records|writes)\b.*\bbefore\b.*`triage-handoff`/i);

    for (const name of ["triage-handoff", "triage-close"]) {
      expect(flat(sectionOf(await step(name), "## What it writes")), name).toMatch(
        /No file git tracks/,
      );
    }
    const handoff = await step("triage-handoff");
    expect(flat(sectionOf(handoff, "## Procedure"))).toMatch(
      /run none of the operation here: no push, publication, tag or change to an account/i,
    );
    expect(flat(sectionOf(handoff, "## Gate"))).toMatch(/nothing was run on their behalf/i);
  });

  // QFAI:AC-0001-0214-01
  // QFAI:EX-0001-0214-01
  it("answers in one triage stage with no verify stage and no review, and never says a change is done", async () => {
    const plan = (await loadBuiltInPlans()).find((each) => each.route === "answer-question");
    expect(
      plan?.stages.map((stage) => [stage.kind, stage.review, stage.steps.map((s) => s.name)]),
    ).toEqual([["triage", undefined, ["triage-investigate", "triage-answer", "triage-close"]]]);

    const close = await step("triage-close");
    expect(rowOf(close, "| `answered`")).toMatch(/The question was answered/);
    expect(flat(sectionOf(close, "## Gate"))).toMatch(/never says a change is done/);
    expect(flat(sectionOf(await step("triage-answer"), "## What it writes"))).toMatch(
      /No file git tracks/,
    );
  });

  // QFAI:AC-0001-0214-02
  // QFAI:EX-0001-0214-03
  it("records a documentation gap the answer shows as a follow-up, and plans nothing for it", async () => {
    expect(flat(sectionOf(await step("triage-answer"), "## Procedure"))).toMatch(
      /such as an option the documentation never mentions, record it as a follow-up for `triage-close`\. Do not fix it here/,
    );
    const close = await step("triage-close");
    const procedure = flat(sectionOf(close, "## Procedure"));
    expect(procedure).toMatch(/a gap in the documentation an answer exposed/);
    expect(procedure).toMatch(/Each follow-up states its goal and the reason it exists/);
    expect(procedure).toMatch(/no step is added to the run for it/);
    expect(flat(sectionOf(close, "## What it writes"))).toMatch(
      /the report states the outcome and lists each follow-up/,
    );
  });
});

describe("a split request", () => {
  // QFAI:AC-0001-0214-06
  // QFAI:EX-0001-0214-08
  it("records each child as a follow-up with its dependencies and routes none of them", async () => {
    const decompose = flat(await step("triage-decompose"));
    expect(decompose).toMatch(
      /state its goal, the reason it exists, and the children it depends on/,
    );
    expect(decompose).toMatch(/Route none of them here/);

    const close = await step("triage-close");
    expect(rowOf(close, "| `split`")).toMatch(/split into child requests/);
    const procedure = flat(sectionOf(close, "## Procedure"));
    expect(procedure).toMatch(/A child that depends on another names that child in its reason/);
    expect(procedure).toMatch(/Route nothing/);
    expect(procedure).toMatch(/no step is added to the run for it/);
    expect(flat(sectionOf(close, "## What it writes"))).toMatch(
      /`closure` as `\{ outcome, followUps \}`, each follow-up `\{ goal, reason \}`/,
    );
  });
});
