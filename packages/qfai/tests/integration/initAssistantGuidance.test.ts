import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const agentsDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "agent",
);
const instructionsDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "rule",
);
describe("init assistant guidance: exploration-first alignment", () => {
  it("frontend-engineer.md が selected direction / screen contracts を参照する", async () => {
    const content = await readFile(path.join(agentsDir, "frontend-engineer.md"), "utf-8");
    expect(content).toMatch(/selected direction|design system|screen contracts/i);
  });

  it("product-experience-architect.md が exploration / evaluation artifact を参照する", async () => {
    const content = await readFile(
      path.join(agentsDir, "product-experience-architect.md"),
      "utf-8",
    );
    expect(content).toMatch(
      /exploration brief|reference pool|evaluation rubric|selected direction/i,
    );
  });

  it("routes discussion sidecars through SDD before downstream UI work", async () => {
    const content = await readFile(
      path.join(instructionsDir, "ui-definition-protocol.md"),
      "utf-8",
    );
    expect(content).toContain("`/qfai-sdd` alone reads the discussion sidecar artifacts");
    expect(content).toContain(
      "They read the UI and UX definition from the story tree, contracts and evidence",
    );
  });

  it("uses the canonical frontend card mission", async () => {
    const content = await readFile(path.join(agentsDir, "frontend-engineer.md"), "utf-8");
    expect(content).toMatch(/mission: Implement frontend behavior aligned with selected direction/);
    expect(content).toMatch(/design system, screen contracts, and product-surface decisions/);
  });

  it("distributed agent cards do not require repo-private .instruction paths", async () => {
    const agentFiles = (await readdir(agentsDir))
      .filter((fileName) => fileName.endsWith(".md") && fileName !== "README.md")
      .sort((left, right) => left.localeCompare(right));

    for (const fileName of agentFiles) {
      const content = await readFile(path.join(agentsDir, fileName), "utf-8");
      expect(content).not.toContain(".instruction/");
    }
  });
});
