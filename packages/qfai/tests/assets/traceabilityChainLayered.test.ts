import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: vitest runs this suite from
// `packages/qfai`, but a runner launched at the monorepo root would resolve
// `../..` to the directory ABOVE the repo and every read below would fail on a
// path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Normalizes the two arrow spellings the shipped tree mixes (`->` in
 * `qfai-configure`, `→` in the constitution) so one chain assertion covers
 * every file that restates the chain.
 */
const normalizeArrows = (content: string): string => content.replace(/\s*->\s*/g, " → ");

const LAYERED_CHAIN =
  "Require → Spec → US → AC → BR → EX → TC → Tests → Code → Verification evidence";
const LEGACY_CHAIN = "Require → Spec → Scenario → Tests → Code → Verification evidence";

// Every place in the shipped tree that restates the constitution's chain. A
// fourth copy appearing later must be added here, or it drifts unnoticed the
// way `qfai-configure` and `qfai-verify` did.
const CHAIN_RESTATEMENTS = [
  "assistant/constitution/constitution.md",
  "assistant/skills/qfai-configure/SKILL.md",
  "assistant/skills/qfai-verify/references/articles.md",
];

describe("the traceability chain names only hops the layered layout produces", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Article V states the layered chain`, async () => {
      const constitution = await read(tree, "assistant/constitution/constitution.md");
      expect(normalizeArrows(constitution)).toContain(LAYERED_CHAIN);
    });

    it(`${tree}: Article V asks for layered item IDs, not scenario titles`, async () => {
      const constitution = await read(tree, "assistant/constitution/constitution.md");
      // `scenario titles` instructed an agent to reference something a layered
      // project never contains, which invites an invented identifier.
      expect(constitution).not.toContain("scenario titles");
      for (const prefix of ["`US-*`", "`AC-*`", "`BR-*`", "`EX-*`", "`TC-*`"]) {
        expect(constitution).toContain(prefix);
      }
    });

    it(`${tree}: any surviving Scenario hop in Article V is labelled legacy`, async () => {
      const constitution = await read(tree, "assistant/constitution/constitution.md");
      const article = constitution.slice(
        constitution.indexOf("## Article V "),
        constitution.indexOf("## Article VI "),
      );
      expect(article, "Article V not found").not.toHaveLength(0);
      if (article.includes("Scenario")) {
        expect(article).toContain("legacy");
        expect(article).toContain("superseded");
      }
    });

    for (const rel of CHAIN_RESTATEMENTS) {
      it(`${tree}: ${rel} does not restate the superseded chain`, async () => {
        const normalized = normalizeArrows(await read(tree, rel));
        expect(normalized).not.toContain(LEGACY_CHAIN);
      });
    }

    for (const rel of CHAIN_RESTATEMENTS.slice(1)) {
      it(`${tree}: ${rel} repeats the constitution's chain verbatim`, async () => {
        expect(normalizeArrows(await read(tree, rel))).toContain(LAYERED_CHAIN);
      });
    }
  }
});
