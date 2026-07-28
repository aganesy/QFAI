import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const SKILLS = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md",
  ".qfai/assistant/skills/qfai-implement/SKILL.md",
];

describe("a reviewer REVISE has a legal state and an evidence slot", () => {
  for (const relativePath of SKILLS) {
    it(`${relativePath}: review-fix is a status with both edges`, async () => {
      const skill = await readFile(path.join(repoRoot, relativePath), "utf-8");
      expect(skill).toContain(
        "Valid status values: `todo`, `red`, `green`, `refactor`, `review-fix`, `done`, `exception`.",
      );
      expect(skill).toContain("`refactor` -> `review-fix` (a blocking reviewer returned `REVISE`)");
      expect(skill).toContain("`review-fix` -> `refactor` (rework complete; re-submit to the reviewer)");
    });

    it(`${relativePath}: rework is explicitly not a backward transition`, async () => {
      const skill = await readFile(path.join(repoRoot, relativePath), "utf-8");
      expect(skill).toContain("**Reviewer rework is not a backward transition.**");
      expect(skill).toContain("without any of those\nruns counting as a backward transition");
    });

    it(`${relativePath}: review-fix blocks completion`, async () => {
      const skill = await readFile(path.join(repoRoot, relativePath), "utf-8");
      expect(skill).toContain(
        "- Items with `todo`, `red`, `green`, `refactor`, or `review-fix` status still exist",
      );
    });

    it(`${relativePath}: the evidence contract is a repeatable round shape`, async () => {
      const skill = await readFile(path.join(repoRoot, relativePath), "utf-8");
      for (const field of [
        "`Round N: RED command`",
        "`Round N: GREEN result`",
        "`Round N: reviewer verdict`",
      ]) {
        expect(skill).toContain(field);
      }
      expect(skill).toContain("A single-round item satisfies this with `Round 1: …`");
    });
  }
});

describe("validateTddList accepts review-fix", () => {
  it("does not flag review-fix as an invalid status", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-review-fix-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      for (const file of ["01_Spec.md", "02_User-stories.md", "03_Acceptance-Criteria.md", "06_Test-Cases.md"]) {
        await writeFile(path.join(specDir, file), "# seed\n", "utf-8");
      }
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status     | DR-ID | Evidence |",
          "| -------- | ------- | ----- | --------------- | -------- | ---------- | ----- | -------- |",
          "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | review-fix | -     | round 2  |",
        ].join("\n"),
        "utf-8",
      );

      const issues = await validateTddList(root, defaultConfig);
      expect(issues.some((entry) => entry.code === "TDDLIST_INVALID_STATUS")).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
