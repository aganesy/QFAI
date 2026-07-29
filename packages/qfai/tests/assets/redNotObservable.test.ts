import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/red-not-observable.md";

describe("an unobservable RED has a non-anomalous outcome", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: an unexpected pass is classified before routing`, async () => {
      const skill = await read(tree, SKILL);
      expect(skill).toContain("classify **why** before doing anything");
      expect(skill).toContain("is **not an anomaly**");
      expect(skill).toContain("Never weaken a");
      expect(skill).toContain("references/red-not-observable.md");
      // The old unconditional routing must be gone.
      expect(skill).not.toContain(
        "5. If the test unexpectedly passes, transition to `exception` and record the anomaly.",
      );
    });

    it(`${tree}: falsifiability evidence has named fields`, async () => {
      const reference = await read(tree, REFERENCE);
      for (const field of ["Satisfied-by", "Falsifiability command", "Falsifiability result"]) {
        expect(reference).toContain(field);
      }
      expect(reference).toContain("mutation-testing result");
    });

    it(`${tree}: the gate and the prohibition both accept the substitute`, async () => {
      const reference = await read(tree, REFERENCE);
      expect(reference).toContain(
        "Item 3 of the 11-point gate is satisfied by the falsifiability evidence.",
      );
      expect(reference).toContain(
        'The completion prohibition "No RED fresh evidence exists for the item" does',
      );
    });
  }
});
