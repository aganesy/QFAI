import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  QFAI_GITIGNORE_BLOCK,
  QFAI_GITIGNORE_GOVERNANCE_NEGATIONS,
  QFAI_GITIGNORE_RECOMMENDED_ENTRIES,
} from "../../src/core/gitignore.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const skillRoot = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant/skill/qfai-atdd");
const negation = "!.qfai/evidence/coverage-depth-*.md";

describe("ATDD coverage matrix home", () => {
  it("keeps the matrix in version control after the general evidence ignore", () => {
    expect(QFAI_GITIGNORE_GOVERNANCE_NEGATIONS).toContain(negation);
    const lines = QFAI_GITIGNORE_BLOCK.split("\n");
    expect(lines.indexOf(negation)).toBeGreaterThan(lines.indexOf(".qfai/evidence/*"));
    expect(QFAI_GITIGNORE_RECOMMENDED_ENTRIES).not.toContain(negation);
  });

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
