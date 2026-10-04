import path from "node:path";

import { describe, expect, it } from "vitest";

import { readImplementFlowSteps } from "../helpers/implementSteps.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const implementAssistantDir = path.join(templateRoot, ".qfai", "assistant");

describe("sub-agent roster completeness and handoff contracts", () => {
  let content: string | undefined;

  it("loads SKILL.md", async () => {
    content = await readImplementFlowSteps(implementAssistantDir);
    expect(content.length).toBeGreaterThan(0);
  });

  it("defines the routed implementation specialists", async () => {
    content ??= await readImplementFlowSteps(implementAssistantDir);

    const subAgents = [
      "delivery-planner",
      "frontend-engineer",
      "backend-engineer",
      "qa-gatekeeper",
      "implementation-reviewer",
      "product-surface-reviewer",
    ];

    for (const agent of subAgents) {
      expect(content, `Sub-agent ${agent} must be defined in SKILL.md`).toContain(agent);
    }
  });

  it("defines control guardrails for parallel work and reviewers", async () => {
    content ??= await readImplementFlowSteps(implementAssistantDir);

    expect(content).toContain("Work one EX at a time by default");
    expect(content).toContain("Parallel work requires disjoint");
    expect(content).toContain("required user consent");
  });

  it("defines the example handoff and review sequence", async () => {
    content ??= await readImplementFlowSteps(implementAssistantDir);

    expect(content).toContain("Otherwise take the flow's EX IDs that no test annotates");
    expect(content).toContain("Record command, selector and failure");
    expect(content).toContain("Run the same selector and record");
    expect(content).toContain("references/ui-affecting.md");
  });
});

describe("watch-it-fail enforcement and resubmission", () => {
  let content: string | undefined;

  it("requires an observed assertion failure before implementation", async () => {
    content = await readImplementFlowSteps(implementAssistantDir);

    expect(content).toContain(
      "Observe the assertion fail for the intended behavior before changing",
    );
  });

  it("requires the same selector after implementation and refactor", async () => {
    content ??= await readImplementFlowSteps(implementAssistantDir);

    expect(content).toContain("Run the same selector and record");
    expect(content).toContain("Re-run the selector and record the result");
  });
});

// ---------------------------------------------------------------------------
// spec-0006: Wording alignment + routing consistency
// ---------------------------------------------------------------------------

describe("wording alignment implementation mode", () => {
  it("SKILL.md claims match implementation keywords", async () => {
    const content = await readImplementFlowSteps(implementAssistantDir);
    const agents = ["delivery-planner", "qa-gatekeeper", "implementation-reviewer"];
    for (const agent of agents) {
      expect(content).toContain(agent);
    }
    expect(content).toMatch(/RED|GREEN|refactor/i);
  });
});

describe("aspirational language detection", () => {
  it("SKILL.md does not use vague aspirational phrases without concrete criteria", async () => {
    const content = await readImplementFlowSteps(implementAssistantDir);
    // Responsibility sections should use concrete verbs, not vague aspirational language
    expect(content).toMatch(/must|shall|required|prohibited/i);
  });
});

describe("routing consistency", () => {
  it("SKILL.md routing matches handoff contract targets", async () => {
    const content = await readImplementFlowSteps(implementAssistantDir);
    expect(content).toContain("rule/shared-skill-delegation-baseline.md");
  });
});

describe("routing contradiction detection", () => {
  it("no contradictory routing in SKILL.md handoff contracts", async () => {
    const content = await readImplementFlowSteps(implementAssistantDir);
    expect(content).not.toMatch(/implementation agent[\s\S]*?assigns itself the next item/i);
    expect(content).not.toMatch(/product-surface-reviewer[\s\S]{0,160}sole authority/i);
  });
});
