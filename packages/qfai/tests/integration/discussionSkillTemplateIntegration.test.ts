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
  it("uiux template directory が screen-level sidecars を持つ", async () => {
    const files = await readdir(uiuxTemplateDir);
    expect(files).toContain("40_screen_contracts.md");
    expect(files).toContain("50_review_input_bundle.md");
    // Brand-level inputs moved to root DESIGN.md; rubric/calibration
    // sidecars previously removed.
    expect(files).not.toContain("33_exploration_rubric.md");
    expect(files).not.toContain("34_evaluator_calibration.md");
  });

  it("SKILL.md の UI-bearing completion が brand SSOT を要求している", async () => {
    const content = await readFile(skillPath, "utf-8");
    expect(content).toMatch(/DESIGN\.md/);
    expect(content).toMatch(/40_screen_contracts\.md/);
    expect(content).toMatch(/50_review_input_bundle\.md/);
  });

  // The Reviewer Gate templates and the completion matrix are two halves of the
  // same UI-bearing exit condition. When they disagree, a pack that satisfies
  // the matrix is sent back by the reviewer, and a pack that satisfies the
  // reviewer fails the forbidden-sidecar check — the UI-bearing pack cannot be
  // completed at all.
  it("review テンプレートが completion matrix と同じ UI ファミリーを要求している", async () => {
    const reviewDir = path.join(templateBase, "templates", "review");
    const retiredChecks = [
      /taste interview/i,
      /3-layer evaluation/i,
      /option comparison/i,
      /selected anchor clarity/i,
    ];
    for (const fileName of ["review_request.md", "Rxx_reviewer.md"]) {
      const content = await readFile(path.join(reviewDir, fileName), "utf-8");
      for (const pattern of retiredChecks) {
        expect(content).not.toMatch(pattern);
      }
      expect(content).toMatch(/DESIGN\.md/);
      expect(content).toMatch(/unranked/i);
      expect(content).toMatch(/canonical `uiux\/` family/i);
      expect(content).toMatch(/forbidden legacy sidecar/i);
    }
  });
});
