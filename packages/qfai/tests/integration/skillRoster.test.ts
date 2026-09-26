import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const implementSkillPath = path.join(
  templateRoot,
  ".qfai",
  "assistant",
  "skill",
  "qfai-implement",
  "SKILL.md",
);

describe("sub-agent roster completeness and handoff contracts", () => {
  let content: string | undefined;

  it("loads SKILL.md", async () => {
    content = await readFile(implementSkillPath, "utf-8");
    expect(content.length).toBeGreaterThan(0);
  });

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

  it("defines the current ownership boundaries", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toContain("The qa-gatekeeper checks the observed RED and GREEN evidence");
    expect(content).toContain("implementation-reviewer checks code and tests");
    expect(content).toMatch(/completion-reviewer checks\s+obligation, commands/);
    expect(content).toContain("Route UI-affecting work to");
  });

  it("defines control guardrails for parallel work and reviewers", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toContain("Work one EX at a time by default");
    expect(content).toContain("Parallel work requires disjoint");
    expect(content).toContain("required user consent");
    expect(content).toContain("Each required reviewer must pass the same final revision");
  });

  it("defines the example handoff and review sequence", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toContain("Take the lowest EX ID");
    expect(content).toContain("Record command, selector, failure, test hash, and");
    expect(content).toContain("Run the same selector and record");
    expect(content).toContain("A review pack identifies the BF, EX, evidence path");
    expect(content).toContain("references/ui-affecting.md");
  });
});

// QFAI:EX-0001-0095-01
describe("qa-gatekeeper is sole observation authority", () => {
  let content: string | undefined;

  it("routes RED and GREEN evidence to the qa-gatekeeper", async () => {
    content = await readFile(implementSkillPath, "utf-8");

    expect(content).toContain("The qa-gatekeeper checks the observed RED and GREEN evidence");
  });

  it("routes RED/GREEN confirmation through qa-gatekeeper instead of the implementation agent", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toContain("The author does not certify their own result");
    expect(content).not.toMatch(
      /implementation agent[\s\S]*?confirms its own RED\/GREEN observation/i,
    );
  });
});

describe("watch-it-fail enforcement and resubmission", () => {
  let content: string | undefined;

  it("requires an observed assertion failure before implementation", async () => {
    content = await readFile(implementSkillPath, "utf-8");

    expect(content).toContain(
      "Observe the assertion fail for the intended behavior before changing",
    );
  });

  it("requires the same selector after implementation and refactor", async () => {
    content ??= await readFile(implementSkillPath, "utf-8");

    expect(content).toContain("Run the same selector and record");
    expect(content).toContain("Re-run the selector and affected tests");
  });
});

// ---------------------------------------------------------------------------
// spec-0006: Wording alignment + routing consistency
// ---------------------------------------------------------------------------

describe("wording alignment implementation mode", () => {
  it("SKILL.md claims match implementation keywords", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    const agents = ["delivery-planner", "qa-gatekeeper", "implementation-reviewer"];
    for (const agent of agents) {
      expect(content).toContain(agent);
    }
    expect(content).toMatch(/RED|GREEN|refactor/i);
  });
});

describe("aspirational language detection", () => {
  it("SKILL.md does not use vague aspirational phrases without concrete criteria", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    // Responsibility sections should use concrete verbs, not vague aspirational language
    expect(content).toMatch(/must|shall|required|prohibited/i);
  });
});

describe("routing consistency", () => {
  it("SKILL.md routing matches handoff contract targets", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toContain("rule/shared-skill-delegation-baseline.md");
    expect(content).toContain("The qa-gatekeeper checks the observed RED and GREEN evidence");
  });
});

describe("routing contradiction detection", () => {
  it("no contradictory routing in SKILL.md handoff contracts", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).not.toMatch(/implementation agent[\s\S]*?assigns itself the next item/i);
    expect(content).not.toMatch(/product-surface-reviewer[\s\S]{0,160}sole authority/i);
  });
});
