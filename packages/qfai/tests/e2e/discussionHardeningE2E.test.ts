import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillPath = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
  "SKILL.md",
);

describe("discussion hardening E2E guidance", () => {
  it("SKILL.md が exploration-first artifact family を説明している", async () => {
    const content = await readFile(skillPath, "utf-8");

    expect(content).toMatch(/30_exploration_brief\.md/);
    expect(content).toMatch(/31_reference_pool\.md/);
    expect(content).toMatch(/32_design_anti_goals\.md/);
    expect(content).toMatch(/33_exploration_rubric\.md/);
    expect(content).toMatch(/34_evaluator_calibration\.md/);
    expect(content).toMatch(/40_screen_contracts\.md/);
    expect(content).toMatch(/50_review_input_bundle\.md/);
  });

  it("SKILL.md が selected direction の前段として planner / exploration brief を中心にしている", async () => {
    const content = await readFile(skillPath, "utf-8");

    expect(content).toMatch(/planner/i);
    expect(content).toMatch(/30_exploration_brief\.md/);
    expect(content).not.toMatch(/selected[_ -]?anchor/i);
  });
});
