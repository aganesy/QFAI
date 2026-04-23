import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateBase = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
);
const skillPath = path.join(templateBase, "SKILL.md");
const uiuxTemplateDir = path.join(templateBase, "templates", "uiux");

describe("discussion skill template integration", () => {
  it("uiux template directory が新しい exploration family を持つ", async () => {
    const files = await readdir(uiuxTemplateDir);
    expect(files).toContain("30_exploration_brief.md");
    expect(files).toContain("31_reference_pool.md");
    expect(files).toContain("32_design_anti_goals.md");
    expect(files).toContain("33_exploration_rubric.md");
    expect(files).toContain("34_evaluator_calibration.md");
    expect(files).toContain("40_screen_contracts.md");
    expect(files).toContain("50_review_input_bundle.md");
  });

  it("SKILL.md の UI-bearing completion が exploration artifact を要求している", async () => {
    const content = await readFile(skillPath, "utf-8");
    expect(content).toMatch(/30_exploration_brief\.md/);
    expect(content).toMatch(/33_exploration_rubric\.md/);
    expect(content).toMatch(/34_evaluator_calibration\.md/);
    expect(content).toMatch(/best-of-history/i);
  });
});
