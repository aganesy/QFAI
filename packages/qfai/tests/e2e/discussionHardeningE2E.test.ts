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
  it("SKILL.md が UI-bearing artifact family (DESIGN.md + sidecars) を説明している", async () => {
    const content = await readFile(skillPath, "utf-8");

    // Brand SSOT lives in root DESIGN.md; only screen-level sidecars
    // remain in uiux/.
    expect(content).toMatch(/DESIGN\.md/);
    expect(content).toMatch(/40_screen_contracts\.md/);
    expect(content).toMatch(/50_review_input_bundle\.md/);
  });

  it("SKILL.md が selected direction の前段として planner / brand SSOT を中心にしている", async () => {
    const content = await readFile(skillPath, "utf-8");

    expect(content).toMatch(/planner/i);
    expect(content).toMatch(/DESIGN\.md/);
    expect(content).not.toMatch(/selected[_ -]?anchor/i);
  });
});
