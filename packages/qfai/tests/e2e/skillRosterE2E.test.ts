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

// QFAI:SPEC-0011:US-0011-0001
describe("E2E: sub-agent roster formalization", () => {
  it("SKILL.md defines a formal sub-agent roster section with all 6 agents", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toMatch(/formal sub-agent roster/i);
    expect(content).toContain("TDDCycleController");
    expect(content).toContain("TDDImplementer");
    expect(content).toContain("RedGreenAuditor");
    expect(content).toContain("TDDSpecReviewer");
    expect(content).toContain("TDDCodeQualityReviewer");
    expect(content).toContain("ParallelSliceDispatcher");
  });
});

// QFAI:SPEC-0011:US-0011-0002
describe("E2E: completion contract hardening", () => {
  it("SKILL.md has item completion checklist, spec completion, and prohibition conditions", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toMatch(/item completion.*checklist|10-point/i);
    expect(content).toMatch(/spec completion.*condition/i);
    expect(content).toMatch(/completion.*prohibition|prohibition.*condition/i);
  });
});

// QFAI:SPEC-0011:US-0011-0003
describe("E2E: evidence contract hardening", () => {
  it("SKILL.md defines minimum evidence with command+result pairs", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toMatch(/per-item evidence|evidence.*contract/i);
    expect(content).toMatch(/RED command/i);
    expect(content).toMatch(/RED result/i);
    expect(content).toMatch(/GREEN command/i);
    expect(content).toMatch(/GREEN result/i);
    expect(content).toContain("fresh evidence");
  });
});

// QFAI:SPEC-0011:US-0011-0004
describe("E2E: parallel dispatch rules", () => {
  it("SKILL.md defines allow/deny conditions and ParallelSliceDispatcher authority", async () => {
    const content = await readFile(implementSkillPath, "utf-8");
    expect(content).toMatch(/allow.*condition/i);
    expect(content).toMatch(/deny.*condition/i);
    expect(content).toMatch(/ParallelSliceDispatcher.*sole.*authorit/i);
    expect(content).toMatch(/integration.*verify/i);
    expect(content).toMatch(/worktree.*separation/i);
  });
});
