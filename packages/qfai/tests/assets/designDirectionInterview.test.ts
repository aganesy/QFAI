/**
 * The brand direction is chosen by the user, once, at the only stage that asks.
 *
 * An assistant used to pick one of eight archetypes from its own reading of the
 * product, and the user first saw the result as twelve hex values in a file.
 * Nothing downstream asks: `/qfai-sdd` Phase 0 authors tokens from whatever the
 * pack records, so an unasked question becomes an invented brand.
 *
 * Three things have to hold together, and each is prose an agent reads:
 * discussion asks, the pack has a field to record the answer in, and Phase 0
 * reads that field rather than scoring prose.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILLS = "assistant/skills";
const INTAKE = `${SKILLS}/qfai-discussion/references/design-dna-intake.md`;
const MATRIX = `${SKILLS}/qfai-discussion/references/discussion-completion-matrix.md`;
const CONTEXT_TEMPLATE = `${SKILLS}/qfai-discussion/templates/01_Context.md`;
const DISCUSSION_SKILL = `${SKILLS}/qfai-discussion/SKILL.md`;
const AUTHORING = `${SKILLS}/qfai-sdd/references/design-md-authoring.md`;

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("the design direction is the user's decision", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the pack has a place to record the choice`, async () => {
      const template = await read(tree, CONTEXT_TEMPLATE);

      expect(template).toContain("## Design Direction");
      for (const field of ["adopted_theme:", "brand_accent:", "conventions_kept:", "chosen_by:"]) {
        expect(template).toContain(field);
      }
      // A theme resolves to tokens; an adjective does not.
      expect(flat(template)).toContain("Name a theme, not an adjective.");
    });

    it(`${tree}: the interview offers candidates rather than asking for adjectives`, async () => {
      const intake = flat(await read(tree, INTAKE));

      expect(intake).toContain("Offer candidates, not adjectives.");
      expect(intake).toContain("Bias the candidates toward the ordinary.");
      // One ask path, the shared one. A second would escape the protocol that
      // decides when a question is allowed at all.
      expect(intake).toContain("shared-skill-operating-baseline.md#user-questions");
      // The cap is not a reason to skip the ask, and what lifts it is the
      // exemption rather than the stage the ask happens in. Two classes of
      // question reach this ask, so the document names both. Drop the approval
      // class and a question whose subject the skill declares mandatory has no
      // documented exemption; drop the grilling class and a question about a
      // decision the design has left open has none.
      expect(intake).toContain(
        "is an approval, and a question inside a grilling session whose subject is a" +
          " decision the design has left open is a grilling question",
      );
      expect(intake).toContain("Both are exempt.");
      // Each class is a subject test, not a location test. Without the last
      // sentence a session turns every question asked during it into an exempt
      // one, and an ordinary clarification escapes the cap by timing.
      expect(intake).toContain(
        "whose subject is something else is an ordinary clarification and is capped",
      );
    });

    it(`${tree}: an unattended run records an assumption instead of blocking`, async () => {
      const intake = flat(await read(tree, INTAKE));

      expect(intake).toContain("`chosen_by: assumption`");
      expect(intake).toContain("11_OQ-Register.md");
      expect(intake).toContain("Do not block.");
    });

    // The planner-first rule used to forbid selecting any visual winner, which
    // is the opposite of asking the user to choose a theme. It still holds for
    // the screen explorations, which the prototype loop ranks by iterating.
    it(`${tree}: planner-first is scoped to the screen explorations`, async () => {
      const skill = flat(await read(tree, DISCUSSION_SKILL));
      const matrix = flat(await read(tree, MATRIX));

      expect(skill).toContain("carry the screen explorations unranked");
      expect(skill).toContain("The brand direction is the exception");
      expect(matrix).toContain("no single screen exploration is selected");
      expect(matrix).toContain("`01_Context.md#Design Direction` names an adopted theme");
    });

    it(`${tree}: a surface that renders no tokens is asked for no direction`, async () => {
      const matrix = flat(await read(tree, MATRIX));

      expect(matrix).toContain("conditions 1 and 5 above do not apply to it");
      expect(matrix).toContain("nothing downstream reads a theme for a surface that renders");
    });

    it(`${tree}: Phase 0 reads the recorded direction and stops without one`, async () => {
      const authoring = flat(await read(tree, AUTHORING));

      expect(authoring).toContain("`01_Context.md#Design Direction` is the decision the user made");
      expect(authoring).toContain("stop and ask rather than pick one");
      // Scoring survives only as the fallback, and is named as the assistant's answer.
      expect(authoring).toContain("Map the theme the pack records to the archetype");
      expect(authoring).toContain("is the fallback for a pack whose direction names no theme");
    });
  }
});
