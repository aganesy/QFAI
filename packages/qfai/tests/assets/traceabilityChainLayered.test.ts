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

    it(`${tree}: Article V branches the Tests hop by layer`, async () => {
      const constitution = await read(tree, "assistant/constitution/constitution.md");
      const article = constitution.slice(
        constitution.indexOf("## Article V "),
        constitution.indexOf("## Article VI "),
      );
      // A single `TC → Tests` hop cannot hold for E2E/API: those layers owe
      // `US-*` / `CON-API-*` and a `TC-*` on them raises
      // TDDLIST_OBLIGATION_LAYER_MISMATCH, so following the Article would
      // either leave the chain open or add a reference the validator rejects.
      // `CON-DB-*` is listed too: it is Integration-owned and its absence from
      // an Integration test is an error, so an exhaustive-looking list that
      // omits it drops a tracked obligation.
      for (const binding of [
        "`TC-* → Unit / Component / Integration tests`",
        "`CON-DB-* → Integration tests`",
        "`US-* → E2E tests`",
        "`CON-API-* → API tests`",
      ]) {
        expect(article).toContain(binding);
      }
      expect(article).toContain("QFAI-ATDD-115");
      expect(article).toContain("TDDLIST_OBLIGATION_LAYER_MISMATCH");
    });

    it(`${tree}: Article V separates the ledger rule from annotation routing`, async () => {
      const constitution = await read(tree, "assistant/constitution/constitution.md");
      const article = constitution.slice(
        constitution.indexOf("## Article V "),
        constitution.indexOf("## Article VI "),
      );
      // TDDLIST_OBLIGATION_LAYER_MISMATCH binds `tdd/test-list.md` rows only.
      // A TC still declared at L4/L5 has its annotation routed to
      // tests/api/** or tests/e2e/** and counted there (QFAI-ATDD-112), so
      // reading the ledger rule as "strip the annotation" destroys coverage;
      // the Article must send the author upstream instead.
      expect(article).toContain("TC-Refs");
      expect(article).toContain("QFAI-ATDD-112");
      expect(article.replace(/\s+/g, " ")).toContain("`L4` / `L5`");
      expect(article.replace(/\s+/g, " ")).toMatch(
        /Re-file the obligation upstream as `CON-API-\*` or `US-\*`/,
      );
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

      // A restatement is what an agent running that skill actually reads. The
      // bare chain demands `TC → Tests` for every change, which contradicts the
      // canonical `US-Refs` / `CON-API-Refs` route and sends a valid E2E or API
      // test back through a `TC-*` the ledger rejects.
      it(`${tree}: ${rel} carries the layer branch, not the bare chain`, async () => {
        const restatement = (await read(tree, rel)).replace(/\s+/g, " ");
        expect(restatement).toContain("The ");
        expect(restatement).toMatch(/`(?:->|→) Tests` hop branches by layer/);
        expect(restatement).toContain("`US-*` from E2E and `CON-API-*` from API");
        expect(restatement).toContain("`CON-DB-*` from integration");
        expect(restatement).toContain("not through `TC-*`");
        expect(restatement).toContain("TDDLIST_OBLIGATION_LAYER_MISMATCH");
      });
    }

    // `catalog/test-layers.md` moves the whole chain: the TC, its EX, the BR
    // that EX concretizes and the AC that BR answers. Naming only EX and BR
    // strands the AC, and `QFAI-COV-201` fires when that TC was its only cover
    // — the re-filing trades one error for another.
    it(`${tree}: re-filing carries the parent AC, not only the EX and BR`, async () => {
      const constitution = (await read(tree, CHAIN_RESTATEMENTS[0] ?? "")).replace(/\s+/g, " ");
      expect(constitution).toContain("move the whole chain in one change");
      expect(constitution).toContain("the `AC-*` that BR answers");
      expect(constitution).toContain("Leaving the `AC-*` behind");
      expect(constitution).toContain("QFAI-COV-201");
    });
  }
});
