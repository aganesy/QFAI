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
  "agents",
);
const instructionsDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "instructions",
);
const steeringDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "steering",
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

  it("agent-selection.md が sidecar artifacts を維持する", async () => {
    const content = await readFile(path.join(instructionsDir, "agent-selection.md"), "utf-8");
    expect(content).toMatch(/sidecar artifacts/i);
  });

  it("agent-catalog.yml の frontend mission が selected direction ベースに更新されている", async () => {
    const content = await readFile(path.join(steeringDir, "agent-catalog.yml"), "utf-8");
    expect(content).toMatch(/selected direction|design system|screen contracts/i);
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
