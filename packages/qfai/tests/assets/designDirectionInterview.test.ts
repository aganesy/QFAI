/**
 * The brand direction is chosen by the user, once, at the only stage that asks.
 *
 * An assistant used to pick one of eight archetypes from its own reading of the
 * product, and the user first saw the result as twelve hex values in a file.
 * Nothing downstream asks: `/qfai-sdd` Phase 0 authors tokens from whatever the
 * pack records, so an unasked question becomes an invented brand.
 *
 * Two things have to hold together, and each is prose an agent reads:
 * discussion asks and records the answer as an Interview row, and Phase 0 reads
 * the recorded choice rather than scoring prose.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILLS = "assistant/skill";
const INTAKE = `${SKILLS}/qfai-discussion/references/design-dna-intake.md`;
const AUTHORING = `${SKILLS}/qfai-sdd/references/design-md-authoring.md`;

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("the design direction is the user's decision", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the interview offers candidates rather than asking for adjectives`, async () => {
      const intake = flat(await read(tree, INTAKE));

      expect(intake).toContain("Offer candidates, not adjectives.");
      expect(intake).toContain("Bias the candidates toward the ordinary.");
      // One ask path, the shared one. A second would escape the protocol that
      // decides when a question is allowed at all.
      expect(intake).toContain("shared-skill-operating-baseline.md#user-questions");
      // An approval is exempt from the budget, so the cap is not a reason to
      // skip it. The exemption is a property of the question, not of the command
      // it sits in — the budget binds every command alike, so a reference that
      // reached for the command would be reaching for something that is no
      // longer there.
      expect(intake).toContain("a decision the skill declares mandatory is an approval");
      expect(intake).toContain("Both are exempt.");
      expect(intake).toContain("The cap binds every command alike");
    });

    it(`${tree}: an unattended run records an assumption and an open question instead of blocking`, async () => {
      const intake = flat(await read(tree, INTAKE));

      expect(intake).toContain(
        "take the most conventional candidate as an Agent decisions row labelled an assumption, and write the theme as an `open-questions.md` row.",
      );
      expect(intake).toContain("Do not block.");
    });

    // QFAI:EX-0001-0087-02
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
