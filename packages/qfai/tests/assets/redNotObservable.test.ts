import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const SKILLS = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md",
  ".qfai/assistant/skills/qfai-implement/SKILL.md",
];

describe("an unobservable RED has a non-anomalous outcome", () => {
  for (const relativePath of SKILLS) {
    it(`${relativePath}: an unexpected pass is classified before routing`, async () => {
      const skill = await readFile(path.join(repoRoot, relativePath), "utf-8");
      expect(skill).toContain("classify **why** before doing anything else");
      expect(skill).toContain("This is **not an anomaly**");
      expect(skill).toContain("Never weaken a correct test until it fails");
      // The old unconditional routing must be gone.
      expect(skill).not.toContain(
        "5. If the test unexpectedly passes, transition to `exception` and record the anomaly.",
      );
    });

    it(`${relativePath}: falsifiability evidence has named fields`, async () => {
      const skill = await readFile(path.join(repoRoot, relativePath), "utf-8");
      expect(skill).toContain("#### RED not observable (obligation already satisfied)");
      for (const field of ["Satisfied-by", "Falsifiability command", "Falsifiability result"]) {
        expect(skill).toContain(field);
      }
      expect(skill).toContain("mutation-testing result");
    });

    it(`${relativePath}: the gate and the prohibition both accept the substitute`, async () => {
      const skill = await readFile(path.join(repoRoot, relativePath), "utf-8");
      expect(skill).toContain(
        "**or** the row carries falsifiability evidence per *RED not observable*",
      );
      expect(skill).toContain(
        "- No RED fresh evidence exists for the item, and no falsifiability evidence replaces it",
      );
    });
  }
});
