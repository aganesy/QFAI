import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`. A runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo, and every read
// below then fails on a path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Slice between two markers, asserting both are present and ordered first. */
function between(content: string, from: string, to: string): string {
  const start = content.indexOf(from);
  const end = content.indexOf(to);
  expect(start, `marker not found: ${from}`).toBeGreaterThan(-1);
  expect(end, `marker not found or out of order: ${to}`).toBeGreaterThan(start);
  return content.slice(start, end);
}
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/red-not-observable.md";
const FINAL_CHECKLIST = "assistant/skills/qfai-implement/references/final-checklist.md";

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
      // The 12-point gate is ALL-conditions-required, so covering only item 3
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

    it(`${tree}: the closing checklist and the memory context carry the exception`, async () => {
      // These are the surfaces an agent re-reads at the end of a run. Left
      // absolute, they force either an unclosable item or a fabricated RED.
      const skill = await read(tree, SKILL);
      // main moved the checklist body into `references/final-checklist.md`
      // under the progressive-disclosure budget (#414); SKILL.md now points at
      // it, so the boxes are asserted where they are actually ticked.
      const pointer = between(skill, "## FINAL CHECKLIST", "## Completion Checklist");
      expect(pointer).toContain("`references/final-checklist.md`");

      const checklist = await read(tree, FINAL_CHECKLIST);
      expect(checklist).toContain("_RED not observable_");
      expect(checklist).not.toContain("- [ ] Red phase: test was written and confirmed to fail.");
      expect(checklist).not.toContain(
        "- [ ] Green phase: minimal code was written and test confirmed to pass.",
      );

      const memoryStart = skill.indexOf("project_memory:");
      expect(memoryStart, "SKILL.md has no `project_memory:`").toBeGreaterThan(-1);
      const memory = skill.slice(memoryStart);
      expect(memory).toContain("_RED not observable_");
      expect(memory).not.toContain(
        "Fresh RED + GREEN command/result evidence is mandatory per item; status-only",
      );

      // The constitution states the same obligation for every skill.
      const workflow = await read(tree, "assistant/constitution/workflow.md");
      expect(workflow).toContain("references/red-not-observable.md");
      expect(workflow).toContain("Weakening a correct test to manufacture a RED is forbidden.");

      const reference = await read(tree, REFERENCE);
      expect(reference).toContain("**The `FINAL CHECKLIST` Red and Green boxes**");
      expect(reference).toContain("**`project_memory` and `constitution/workflow.md`**");
    });

    it(`${tree}: the evidence contract states the two forms are exclusive`, async () => {
      const skill = await read(tree, SKILL);
      expect(skill).toContain("**Exclusive alternative to the RED pair**");
      // Wrap-tolerant: the sentence is the obligation, the column it breaks at
      // is not. Pinning the exact `\n    ` failed on a reflow that changed
      // nothing about the rule.
      expect(skill.replace(/\s*\n\s*/g, " ")).toContain(
        "Exactly one of the two forms must be present — never both, never neither",
      );

      const reference = await read(tree, REFERENCE);
      expect(reference).toContain("**exclusive alternatives**");
      expect(reference).toContain(
        "`qa-gatekeeper` accepts the\n  falsifiability form as the minimum evidence for this row.",
      );
    });
  }
});
