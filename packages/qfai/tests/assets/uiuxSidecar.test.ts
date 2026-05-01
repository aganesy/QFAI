import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

describe("uiux sidecar templates", { timeout: 15000 }, () => {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const templateDir = path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skills",
    "qfai-discussion",
    "templates",
  );
  const uiuxDir = path.join(templateDir, "uiux");
  const skillMdPath = path.join(templateDir, "..", "SKILL.md");

  async function readTemplate(filename: string): Promise<string> {
    return readFile(path.join(uiuxDir, filename), "utf-8");
  }

  async function readCoreTemplate(filename: string): Promise<string> {
    return readFile(path.join(templateDir, filename), "utf-8");
  }

  it("exploration-first sidecar family を配布する (v2.0: 33/34 削除)", async () => {
    const files = await fg(["*.md"], { cwd: uiuxDir, absolute: false });
    expect(files).toContain("30_exploration_brief.md");
    expect(files).toContain("31_reference_pool.md");
    expect(files).toContain("32_design_anti_goals.md");
    expect(files).toContain("40_screen_contracts.md");
    expect(files).toContain("50_review_input_bundle.md");
    // v2.0 (spec-0017 P4): 33_exploration_rubric / 34_evaluator_calibration are removed.
    expect(files).not.toContain("33_exploration_rubric.md");
    expect(files).not.toContain("34_evaluator_calibration.md");
  });

  it("30_exploration_brief.md が探索条件を定義している", async () => {
    const content = await readTemplate("30_exploration_brief.md");
    expect(content).toContain("## Product Intent");
    expect(content).toContain("## Brand Signals");
    expect(content).toContain("## Differentiation Targets");
  });

  it("40_screen_contracts.md は screen contract 強スキーマを維持する", async () => {
    const content = await readTemplate("40_screen_contracts.md");
    expect(content).toContain("### Screen:");
    expect(content).toMatch(/- screen_id:/);
    expect(content).toMatch(/- route:/);
    expect(content).toMatch(/- purpose:/);
    expect(content).toMatch(/- actor:/);
    expect(content).toMatch(/- primary_tasks:/);
    expect(content).toMatch(/- required_states:/);
  });

  it("50_review_input_bundle.md が best-of-history を明記する", async () => {
    const content = await readTemplate("50_review_input_bundle.md");
    expect(content).toMatch(/best-of-history/i);
  });

  it("SKILL.md が exploration-first completion condition を説明している", async () => {
    const content = await readFile(skillMdPath, "utf-8");
    expect(content).toMatch(/30_exploration_brief\.md/);
    expect(content).toMatch(/non-ui|skip/i);
  });

  it("03_Story-Workshop.md は optional fallback と Behavior Obligations を維持する", async () => {
    const content = await readCoreTemplate("03_Story-Workshop.md");
    expect(content).toMatch(/Behavior Obligations/i);
    expect(content).toMatch(/optional fallback/i);
  });

  it("04_Sources.md は reference translation schema を持つ", async () => {
    const content = await readCoreTemplate("04_Sources.md");
    expect(content).toContain("adopted_points");
    expect(content).toContain("rejected_points");
    expect(content).toContain("local_translation");
  });
});
