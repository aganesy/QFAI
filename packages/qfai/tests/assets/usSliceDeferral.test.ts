/**
 * The shipped docs must state the `US-*` deferral, in both QFAI trees.
 *
 * `CON-API-*` and `CON-DB-*` each documented `x-qfai-status: planned` as the
 * in-band way to defer one obligation outside the current slice, while the
 * `US-*` obligation was stated unconditionally twice. A stage reading only the
 * shipped prose therefore had no legal way to record "this story is not in this
 * slice", and reached for a Change Request or a ledger `exception` — neither of
 * which is the form.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const CATALOG = "assistant/catalog/test-layers.md";
const ATDD_SKILL = "assistant/skills/qfai-atdd/SKILL.md";
const US_TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/02_User-stories.md";

describe("a US outside the current slice has a documented deferral", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the layer SSOT gives US the same marker the contracts have`, async () => {
      const catalog = flat(await read(tree, CATALOG));
      expect(catalog).toContain("`- x-qfai-status: planned` meta line inside its");
      expect(catalog).toContain("QFAI-ATDD-118");
      // Per story, not per spec: the surface-type relaxation already documented
      // above it is all-or-nothing for the whole spec, so citing it as the exit
      // for one story tells the reader to erase its siblings' obligation too.
      expect(catalog).toContain("This is per story, unlike the surface-type scoping above");
      // A deferral suspends the obligation; it does not un-declare the ID.
      expect(catalog).toContain("A deferred `US-*` stays a known ID");
    });

    it(`${tree}: /qfai-atdd states the deferral where it states the obligation`, async () => {
      const skill = flat(await read(tree, ATDD_SKILL));
      // Both places the US obligation is stated — CRITICAL CONSTRAINTS and
      // Success Criteria — since a reader who finds only the unconditional one
      // is back where this started.
      expect(skill).toContain("`tests/e2e/**` must cover all required `US-*`. A story outside the");
      expect(skill).toContain("All required `US` are covered by E2E tests (`QFAI-ATDD-111`)");
      const occurrences = skill.split("- x-qfai-status: planned").length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
      // `exception` is a ledger branch and blocking; a `US-*` owns no row. Say
      // so rather than let the reader spend a cycle looking for one.
      expect(skill).toContain("`exception` is not the alternative here");
    });

    it(`${tree}: the user-story template shows where the marker goes`, async () => {
      const template = flat(await read(tree, US_TEMPLATE));
      expect(template).toContain("Add a `- x-qfai-status: planned` meta line");
      expect(template).toContain("QFAI-ATDD-118");
      // The three wrong exits the absence of this form used to leave open.
      expect(template).toContain("leave the story uncovered");
      expect(template).toContain("declare the whole spec non-user-facing");
    });
  }
});
