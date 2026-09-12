/**
 * `DESIGN.md` says where its numbers came from.
 *
 * Twelve colours, three families, four radii and three shadows used to be
 * written from a sentence of prose about an archetype. Everything downstream
 * is exact about them — the lock hashes them, `certify` re-scans them, every
 * literal in every capture is checked against them — so the rigour sat on top
 * of a guess.
 *
 * `brand.theme` names the published theme the values were taken from. What is
 * checkable here is that the instruction to take them travels with the field,
 * that the archetype stops being the token source where a theme is named, and
 * that the name reaches the implementer.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILLS = "assistant/skills";
const AUTHORING = `${SKILLS}/qfai-sdd/references/design-md-authoring.md`;
const SPEC = `${SKILLS}/qfai-prototyping/references/design-md-spec.md`;
const SAMPLE = `${SKILLS}/qfai-prototyping/templates/DESIGN.md.sample`;
const HANDOFF = `${SKILLS}/qfai-prototyping/references/handoff.md`;

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("the design tokens name their source", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the schema documents the field and why it may be absent`, async () => {
      const spec = flat(await read(tree, SPEC));

      expect(spec).toContain("theme: string");
      expect(spec).toContain("## `brand.theme`");
      // Optional, or every project that authored its own file before the field
      // existed fails a gate for saying nothing rather than for being wrong.
      expect(spec).toContain("It is optional because a project that authored its own");
    });

    it(`${tree}: the sample carries the field`, async () => {
      // A field absent from the sample is one nobody fills: the sample is what
      // `npx qfai init` drops at the project root.
      expect(await read(tree, SAMPLE)).toContain("theme:");
    });

    it(`${tree}: Phase 0 takes the values rather than composing them`, async () => {
      const authoring = flat(await read(tree, AUTHORING));

      expect(authoring).toContain("taken from the named theme's published values");
      expect(authoring).toContain("Do not compose them.");
      // The vocabularies do not line up, which is why this is a translation.
      // One shipped crosswalk beats a mapping file authored per project.
      expect(authoring).toContain("| This file");
      expect(authoring).toContain("destructive");
      // Both gaps have a rule, or the two open questions get answered by taste.
      expect(authoring).toContain("A role the theme does not publish");
      expect(authoring).toContain("A role the theme publishes and this file has no name for");
      expect(authoring).toContain("The schema is closed");
    });

    it(`${tree}: the archetype stops being the token source where a theme is named`, async () => {
      // A validated field nothing reads drifts. The archetype still seeds
      // `accessibility.motion`, which no theme publishes, and still seeds the
      // tokens for a file that names no theme — so it reaches something.
      const authoring = flat(await read(tree, AUTHORING));

      expect(authoring).toContain("seeds `accessibility.motion`, which no theme publishes");
      expect(authoring).toContain("only for a file with no `brand.theme`");
      expect(authoring).toContain("a prose tendency cannot overrule them");
    });

    it(`${tree}: the name reaches the implementer`, async () => {
      const handoff = flat(await read(tree, HANDOFF));

      expect(handoff).toContain("the mirror copies it too");
      expect(handoff).toContain("install the theme, rather than reproduce");
    });
  }
});
