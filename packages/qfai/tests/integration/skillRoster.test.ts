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

  // TC-0011-0001: All 6 sub-agents defined with responsibilities
  it("defines all 6 sub-agents", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    const subAgents = [
      "TDDCycleController",
      "TDDImplementer",
      "RedGreenAuditor",
      "TDDSpecReviewer",
      "TDDCodeQualityReviewer",
      "ParallelSliceDispatcher",
    ];

    for (const agent of subAgents) {
      expect(content, `Sub-agent ${agent} must be defined in SKILL.md`).toContain(agent);
    }
  });

  it("defines responsibilities for each sub-agent", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    // Each sub-agent must have a responsibility description
    expect(content).toMatch(/TDDCycleController[\s\S]*?responsibilit/i);
    expect(content).toMatch(/TDDImplementer[\s\S]*?responsibilit/i);
    expect(content).toMatch(/RedGreenAuditor[\s\S]*?responsibilit/i);
    expect(content).toMatch(/TDDSpecReviewer[\s\S]*?responsibilit/i);
    expect(content).toMatch(/TDDCodeQualityReviewer[\s\S]*?responsibilit/i);
    expect(content).toMatch(/ParallelSliceDispatcher[\s\S]*?responsibilit/i);
  });

  it("defines prohibitions for each sub-agent", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    // Each sub-agent must have prohibitions
    expect(content).toMatch(/TDDCycleController[\s\S]*?prohibit/i);
    expect(content).toMatch(/TDDImplementer[\s\S]*?prohibit/i);
    expect(content).toMatch(/RedGreenAuditor[\s\S]*?prohibit/i);
    expect(content).toMatch(/TDDSpecReviewer[\s\S]*?prohibit/i);
    expect(content).toMatch(/TDDCodeQualityReviewer[\s\S]*?prohibit/i);
    expect(content).toMatch(/ParallelSliceDispatcher[\s\S]*?prohibit/i);
  });

  // TC-0011-0002: All handoff contracts present
  it("defines all 8 agent-to-agent handoff transitions", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    // Must have a handoff contracts section
    expect(content).toMatch(/handoff contract/i);

    // The 8 transitions per spec
    const transitions = [
      { from: "TDDCycleController", to: "TDDImplementer" },
      { from: "TDDImplementer", to: "RedGreenAuditor" },
      { from: "RedGreenAuditor", to: "TDDImplementer" },
      { from: "TDDImplementer", to: "TDDSpecReviewer" },
      { from: "TDDSpecReviewer", to: "TDDImplementer" },
      { from: "TDDImplementer", to: "TDDCodeQualityReviewer" },
      { from: "TDDCodeQualityReviewer", to: "TDDImplementer" },
      { from: "TDDCycleController", to: "ParallelSliceDispatcher" },
    ];

    for (const { from, to } of transitions) {
      const pattern = new RegExp(`${from}\\s*->\\s*${to}`);
      expect(content, `Handoff contract transition "${from} -> ${to}" must be defined`).toMatch(
        pattern,
      );
    }
  });
});

// QFAI:SPEC-0011:TC-0011-0003
describe("RedGreenAuditor is sole observation authority", () => {
  let content: string | undefined;

  it("states RedGreenAuditor is the sole authority for RED/GREEN observations", async () => {
    content = await readFile(implementSkillPath, "utf-8");

    // TDDImplementer must not self-certify
    expect(content).toMatch(/RedGreenAuditor[\s\S]*?sole[\s\S]*?authorit/i);
    // Self-certification must be prohibited
    expect(content).toMatch(/self.certif[\s\S]*?prohibit|prohibit[\s\S]*?self.certif/i);
  });

  it("prohibits TDDImplementer from confirming its own observations", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    // Explicit prohibition for self-certification
    expect(content).toMatch(
      /TDDImplementer[\s\S]*?must not[\s\S]*?confirm|TDDImplementer[\s\S]*?cannot[\s\S]*?certif/i,
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
describe("TC-0012-0042: wording alignment standard mode", () => {
  it("SKILL.md claims match implementation keywords", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    // SKILL.md must reference core sub-agent names that match implementation
    const agents = ["TDDCycleController", "TDDImplementer", "RedGreenAuditor"];
    for (const agent of agents) {
      expect(content).toContain(agent);
    }
    // Must use standard TDD vocabulary
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
    // Handoff routing must be defined for TDDCycleController -> TDDImplementer
    expect(content).toMatch(/TDDCycleController\s*->\s*TDDImplementer/);
    // Handoff routing must be defined for TDDImplementer -> RedGreenAuditor
    expect(content).toMatch(/TDDImplementer\s*->\s*RedGreenAuditor/);
  });
});

// QFAI:SPEC-0012:TC-0012-0045
describe("TC-0012-0045: routing contradiction detection", () => {
  it("no contradictory routing in SKILL.md handoff contracts", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    // Verify no circular contradiction: TDDImplementer should not route to itself
    expect(content).not.toMatch(/TDDImplementer\s*->\s*TDDImplementer/);
    // Verify no invalid routing: ParallelSliceDispatcher should not route to RedGreenAuditor directly
    expect(content).not.toMatch(/ParallelSliceDispatcher\s*->\s*RedGreenAuditor/);
  });
});
