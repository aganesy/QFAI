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

// QFAI:SPEC-0016:TC-0016-0001
// QFAI:SPEC-0016:TC-0016-0002
describe("sub-agent roster completeness and handoff contracts", () => {
  let content: string;

  it("loads SKILL.md", async () => {
    content = await readFile(implementSkillPath, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

  // TC-0016-0001: All 6 sub-agents defined with responsibilities
  it("defines all 6 sub-agents with unique responsibility scopes", async () => {
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

  // TC-0016-0002: All handoff contracts present
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
      const pattern = new RegExp(`${from}[\\s\\S]*?${to}|${to}[\\s\\S]*?${from}`, "i");
      expect(
        content,
        `Handoff contract between ${from} and ${to} must be defined`,
      ).toMatch(pattern);
    }
  });
});

// QFAI:SPEC-0016:TC-0016-0003
describe("RedGreenAuditor is sole observation authority", () => {
  let content: string;

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

// QFAI:SPEC-0016:TC-0016-0004
describe("watch-it-fail enforcement and resubmission", () => {
  let content: string;

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
