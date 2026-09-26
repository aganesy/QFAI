import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const skillRoot = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/skill/qfai-atdd");

describe("ATDD coverage matrix home", () => {
  it("names one BF-scoped matrix with US, AC and EX rows", async () => {
    const skill = await readFile(path.join(skillRoot, "SKILL.md"), "utf8");
    const checklist = await readFile(
      path.join(skillRoot, "references/test-case-depth-checklist.md"),
      "utf8",
    );
    expect(skill).toContain(".qfai/evidence/coverage-depth-BF-NNNN.md");
    expect(skill).toMatch(/US, AC and\s+EX rows/);
    expect(checklist).toContain(".qfai/evidence/coverage-depth-BF-NNNN.md");
    expect(checklist).toContain("The test-design analyst authors it");
  });
});
