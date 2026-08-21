import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const implementSkillPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skills",
  "qfai-implement",
  "SKILL.md",
);

// QFAI:SPEC-0011:TC-0011-0001
// QFAI:SPEC-0011:TC-0011-0002
describe("sub-agent roster completeness and handoff contracts", () => {
  let content: string | undefined;

  it("loads SKILL.md", async () => {
    content = await readFile(implementSkillPath, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  // TC-0011-0001: All routed specialists are declared with clear ownership
  it("defines the routed implementation specialists", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    const subAgents = [
      "delivery-planner",
      "frontend-engineer",
      "backend-engineer",
      "qa-gatekeeper",
      "implementation-reviewer",
      "completion-reviewer",
      "product-surface-reviewer",
    ];

    for (const agent of subAgents) {
      expect(content, `Sub-agent ${agent} must be defined in SKILL.md`).toContain(agent);
    }
  });

  it("defines responsibilities for each sub-agent", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toMatch(/delivery-planner[\s\S]*?selects the next pending item/i);
    expect(content).toMatch(/frontend-engineer[\s\S]*?implement the selected item only/i);
    expect(content).toMatch(/backend-engineer[\s\S]*?implement the selected item only/i);
    expect(content).toMatch(/qa-gatekeeper[\s\S]*?sole authority/i);
    expect(content).toMatch(/implementation-reviewer[\s\S]*?code quality/i);
    expect(content).toMatch(/completion-reviewer[\s\S]*?final DoD/i);
  });

  it("defines control guardrails for routed specialists", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toMatch(/Orchestrator MUST NOT write test or production code directly/i);
    expect(content).toMatch(/delivery-planner[\s\S]*?sole authority[\s\S]*?parallel dispatch/i);
    // "routed blocking reviewers" was narrower than the real gate:
    // `blocking_agents` omits `implementation-reviewer`, whose REVISE still
    // blocks `done`. The wording now says "every required reviewer".
    expect(content).toMatch(
      /Only after every required reviewer passes may the item transition to `done`/i,
    );
  });

  // TC-0011-0002: All handoff contracts present
  it("defines routed handoff transitions across planning, evidence, and review", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toMatch(/handoff contract/i);
    expect(content).toMatch(
      /delivery-planner[\s\S]*?assigns it to the appropriate implementation agent/i,
    );
    expect(content).toMatch(
      // Split into a RED submission and a GREEN submission (#355): one combined
      // post-hoc submission is only satisfiable after the RED state is gone.
      /Implementation agent submits the RED run to `qa-gatekeeper`[\s\S]*?then the GREEN run after it/i,
    );
    expect(content).toMatch(/`qa-gatekeeper` confirms or rejects each observation/i);
    expect(content).toMatch(/completion-reviewer[\s\S]*?implementation-reviewer/i);
    // #701: the trigger is no longer restated inline. It is defined once in
    // `references/ui-affecting.md` and every routing site cites that file, so
    // the contract asserts the citation rather than a second copy of the rule.
    expect(content).toMatch(
      /product-surface-reviewer` is added when the item is UI-affecting[\s\S]*?references\/ui-affecting\.md/i,
    );
    // "routed blocking reviewers" was narrower than the real gate:
    // `blocking_agents` omits `implementation-reviewer`, whose REVISE still
    // blocks `done`. The wording now says "every required reviewer".
    expect(content).toMatch(
      /Only after every required reviewer passes may the item transition to `done`/i,
    );
  });
});

// QFAI:SPEC-0011:TC-0011-0003
describe("qa-gatekeeper is sole observation authority", () => {
  let content: string | undefined;

  it("states qa-gatekeeper is the sole authority for RED/GREEN observations", async () => {
    content = await readFile(implementSkillPath, "utf-8");

    expect(content).toMatch(/qa-gatekeeper[\s\S]*?sole[\s\S]*?authorit/i);
    expect(content).toMatch(
      // Split into a RED submission and a GREEN submission (#355): one combined
      // post-hoc submission is only satisfiable after the RED state is gone.
      /Implementation agent submits the RED run to `qa-gatekeeper`[\s\S]*?then the GREEN run after it/i,
    );
  });

  it("routes RED/GREEN confirmation through qa-gatekeeper instead of the implementation agent", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toMatch(/`qa-gatekeeper` confirms or rejects each observation/i);
    expect(content).not.toMatch(
      /implementation agent[\s\S]*?confirms its own RED\/GREEN observation/i,
    );
  });
});

// QFAI:SPEC-0011:TC-0011-0004
describe("watch-it-fail enforcement and resubmission", () => {
  let content: string | undefined;

  it("requires watch-it-fail before implementation", async () => {
    content = await readFile(implementSkillPath, "utf-8");

    expect(content).toContain("watch it fail");
    // Must explicitly state test must fail before implementation
    expect(content).toMatch(/fail[\s\S]*?before[\s\S]*?implement|watch it fail/i);
  });

  it("requires watch-it-pass before refactor", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toContain("watch it pass");
    // Must explicitly state test must pass before refactor
    expect(content).toMatch(/pass[\s\S]*?before[\s\S]*?refactor|watch it pass/i);
  });
});

// ---------------------------------------------------------------------------
// spec-0006: Wording alignment + routing consistency
// ---------------------------------------------------------------------------

// QFAI:SPEC-0012:TC-0012-0042
describe("TC-0012-0042: wording alignment implementation mode", () => {
  it("SKILL.md claims match implementation keywords", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    const agents = ["delivery-planner", "qa-gatekeeper", "implementation-reviewer"];
    for (const agent of agents) {
      expect(content).toContain(agent);
    }
    expect(content).toMatch(/RED|GREEN|refactor/i);
  });
});

// QFAI:SPEC-0012:TC-0012-0043
describe("TC-0012-0043: aspirational language detection", () => {
  it("SKILL.md does not use vague aspirational phrases without concrete criteria", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    // Responsibility sections should use concrete verbs, not vague aspirational language
    expect(content).toMatch(/must|shall|required|prohibited/i);
  });
});

// QFAI:SPEC-0012:TC-0012-0044
describe("TC-0012-0044: routing consistency", () => {
  it("SKILL.md routing matches handoff contract targets", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toMatch(
      /delivery-planner[\s\S]*?assigns it to the appropriate implementation agent/i,
    );
    expect(content).toMatch(
      // Split into a RED submission and a GREEN submission (#355): one combined
      // post-hoc submission is only satisfiable after the RED state is gone.
      /Implementation agent submits the RED run to `qa-gatekeeper`[\s\S]*?then the GREEN run after it/i,
    );
  });
});

// QFAI:SPEC-0012:TC-0012-0045
describe("TC-0012-0045: routing contradiction detection", () => {
  it("no contradictory routing in SKILL.md handoff contracts", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).not.toMatch(/implementation agent[\s\S]*?assigns itself the next item/i);
    expect(content).not.toMatch(/product-surface-reviewer[\s\S]{0,160}sole authority/i);
  });
});
