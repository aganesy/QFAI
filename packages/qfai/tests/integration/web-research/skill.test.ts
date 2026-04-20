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
  "web-research",
  "SKILL.md",
);

async function readSkill(): Promise<string> {
  return readFile(skillPath, "utf-8");
}

describe("web-research SKILL.md template structure", { timeout: 15_000 }, () => {
  // QFAI:SPEC-0027:TC-0027-0007 (TDD-0021)
  it("progressive disclosure - metadata-only on load, full body on task start", async () => {
    const content = await readSkill();

    // SKILL.md must describe progressive disclosure
    expect(content).toMatch(/progressive\s+disclosure/i);

    // SKILL.md must describe metadata-only loading
    expect(content).toMatch(/metadata[_\s-]?only|metadata\s+on\s+load/i);
  });

  // QFAI:SPEC-0027:TC-0027-0008 (TDD-0022)
  it("invalid SKILL.md YAML parse error reported, default behavior activated", async () => {
    const content = await readSkill();

    // SKILL.md must mention invalid / parse error / malformed
    expect(content).toMatch(/invalid|parse\s+error|malformed/i);

    // SKILL.md must mention default behavior / fallback
    expect(content).toMatch(/default\s+behavior|fallback/i);
  });
});
