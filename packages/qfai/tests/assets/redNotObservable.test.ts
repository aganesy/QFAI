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
        '**Item 3 ("RED was observed")** is satisfied by the falsifiability evidence.',
      );
      expect(reference).toContain(
        '**The completion prohibition** "No RED fresh evidence exists for the item"',
      );
    });

    it(`${tree}: every all-required gate item this path touches is covered`, async () => {
      // The 11-point gate is ALL-conditions-required, so covering only item 3
      // still left the row unable to reach `done`.
      const skill = await read(tree, SKILL);
      expect(skill).toContain(
        "the correct test was added first and proven falsifiable by mutation instead of by a natural failure",
      );
      expect(skill).toContain(
        "**waived** on the _RED not observable_ path, where the `Satisfied-by` row already implements the predicate",
      );
      expect(skill).toContain(
        "On the _RED not observable_ path there is none to write — the `Satisfied-by` row already implements the predicate",
      );

      const reference = await read(tree, REFERENCE);
      expect(reference).toContain('**Item 2 ("A failing test was added first")**');
      expect(reference).toContain(
        '**Item 4 ("Minimal production code was written")** is **waived**',
      );
    });

    it(`${tree}: the evidence contract states the two forms are exclusive`, async () => {
      const skill = await read(tree, SKILL);
      expect(skill).toContain("**Exclusive alternative**");
      expect(skill).toContain(
        "Exactly one of the two forms must be present —\n    never both, never neither",
      );

      const reference = await read(tree, REFERENCE);
      expect(reference).toContain("**exclusive alternatives**");
      expect(reference).toContain(
        "`qa-gatekeeper` accepts the\n  falsifiability form as the minimum evidence for this row.",
      );
    });
  }
});
