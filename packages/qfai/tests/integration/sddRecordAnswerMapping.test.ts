/**
 * `/qfai-sdd` writes each answer of the deliberation record it consumes into
 * the one story-tree file that owns it. These cases read the shipped
 * instructions that say where each answer goes.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const trees = ["packages/qfai/assets/init/.qfai", ".qfai"];
const flat = async (tree: string, relative: string): Promise<string> =>
  (await readFile(path.join(root, tree, "assistant", relative), "utf-8")).replace(/\s+/g, " ");

const DECOMPOSITION = "skill/qfai-sdd/references/requirements-decomposition.md";
const AUTHORING = "skill/qfai-sdd/references/design-md-authoring.md";

/** The row of the answer table whose first cell is `answer`, with its cells trimmed. */
function mappedTo(table: string, answer: string): string | undefined {
  const row = table.split(" | ").findIndex((cell) => cell.replace(/^\| /, "") === answer);
  return row < 0 ? undefined : table.split(" | ")[row + 1];
}

describe("each answer of the record has one story-tree home", () => {
  for (const tree of trees) {
    // QFAI:AC-0001-0300-02
    // QFAI:EX-0001-0300-03
    it(`${tree}: risks, quality targets, legal limits and surfaces go to policy and tech.md`, async () => {
      const decomposition = await flat(tree, DECOMPOSITION);
      expect(mappedTo(decomposition, "Risks")).toBe("`01_policy/initiative.md` `## Risks` rows");
      expect(mappedTo(decomposition, "Product-wide quality targets")).toBe(
        "`01_policy/constraint.md` `## Quality targets` rows",
      );
      expect(mappedTo(decomposition, "Legal and compliance limits")).toBe(
        "`01_policy/constraint.md` `## Legal and Compliance Constraints` rows",
      );
      expect(mappedTo(decomposition, "The target surfaces")).toBe(
        "the `03_contract/tech.md` `Surface` row",
      );

      const flow = await flat(tree, "step/sdd-flow/STEP.md");
      expect(flow).toContain(
        "risks to `initiative.md` `## Risks`, trade-off priorities to the Decision priorities of `principle.md`, terms to `glossary.md`, product-wide quality targets to `constraint.md` `## Quality targets`, legal and compliance limits to its `## Legal and Compliance Constraints`, and the target surfaces to the `tech.md` `Surface` row.",
      );
      expect(flow).toContain("or `mixed` when it targets several");
    });

    // QFAI:EX-0001-0300-04
    it(`${tree}: trade-off priorities and terms go to principle.md and glossary.md`, async () => {
      const decomposition = await flat(tree, DECOMPOSITION);
      expect(mappedTo(decomposition, "Trade-off priorities")).toBe(
        "`01_policy/principle.md` Decision priorities",
      );
      expect(mappedTo(decomposition, "Terms")).toBe("`01_policy/glossary.md`");
    });

    // QFAI:EX-0001-0300-05
    it(`${tree}: flows and examples go to the business flows and their stories`, async () => {
      const decomposition = await flat(tree, DECOMPOSITION);
      expect(mappedTo(decomposition, "Flows and examples")).toBe(
        "the business flows, their stories and the EX rows of those stories",
      );
      expect(mappedTo(decomposition, "Screens and their behaviour obligations")).toBe(
        "the UI contracts under `<paths.contractsDir>/ui/`",
      );
      expect(mappedTo(decomposition, "A question still open")).toBe(
        "`<paths.specsDir>/open-questions.md`",
      );
    });

    // QFAI:AC-0001-0080-01
    // QFAI:EX-0001-0080-01
    it(`${tree}: the Brand Philosophy body holds the settled intent and names no winner`, async () => {
      const authoring = await flat(tree, AUTHORING);
      expect(authoring).toContain(
        "**`# Brand Philosophy` body.** The product intent, the interactions that must survive exploration, the brand signals, how the product differs from the generic version of itself, and the trend conclusions the record settles.",
      );
      expect(authoring).toContain("`/qfai-sdd` selects no visual winner");
      const step = await flat(tree, "step/common-design-md/STEP.md");
      expect(step).toContain("as exploration constraints, and select no visual winner");
    });

    // QFAI:AC-0001-0081-01
    // QFAI:EX-0001-0081-01
    it(`${tree}: a settled reference splits into Do, Don't and do_not_look_like`, async () => {
      const authoring = await flat(tree, AUTHORING);
      expect(authoring).toContain(
        "Each competitive or component reference the record settles: its adopted points and their local translation under **Do**, its rejected points under **Don't** and in `audience.do_not_look_like`.",
      );
      expect(authoring).toContain(
        "A competitive reference is an input to deliberate deviation, not a template to copy unchanged.",
      );
    });

    // QFAI:AC-0001-0082-01
    // QFAI:EX-0001-0082-01
    it(`${tree}: a rejected direction is a Don't anti-goal with its reason and a review cue`, async () => {
      const authoring = await flat(tree, AUTHORING);
      expect(authoring).toContain(
        "Each design direction the user rejected goes under **Don't** as an anti-goal, with its reason and a concrete cue a downstream reviewer uses to stop it recurring.",
      );
    });
  }
});
