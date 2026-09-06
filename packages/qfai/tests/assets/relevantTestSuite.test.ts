import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`. A runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo, and every read
// below then fails on a path that has nothing to do with the assertion.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/relevant-test-suite.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe('"relevant test suite" is defined and bounded', () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the Refactor step defines the selector and its fallback`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      expect(skill).toContain("smallest selector that covers the module you touched");
      expect(skill).toContain("**plus its reverse dependency closure**");
      expect(skill).toContain("the package containing the touched module");
      expect(skill).toContain("references/relevant-test-suite.md");
      expect(skill).not.toContain("Run the full relevant test suite");
    });

    it(`${tree}: the selector follows the production import graph, not just test imports`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain("Walk the **production** import graph backwards");
      // The indirect-dependent shape the direct-import scan misses.
      expect(section).toContain("`X` <- `Y` (production) <- `Y`'s test");
      expect(section).toContain("Searching test files for a direct import of `X` is not enough");
      // An unresolvable graph must widen, never narrow.
      expect(section).toContain("whenever the reverse walk cannot be completed");
      expect(section).toContain("Incomplete resolution always widens; it never narrows");
    });

    it(`${tree}: the wide run has a stated cadence, not a per-item cost`, async () => {
      const skill = unwrap(await read(tree, SKILL));
      const section = unwrap(await read(tree, REFERENCE));
      expect(skill).toContain("narrow suite per item, full suite at each checkpoint boundary");
      expect(skill).toContain("quadratic in ledger size");
      expect(section).toContain("### Checkpoint boundaries");
      expect(section).toContain("the full suite runs at, and only at");
      // Item 11 must not re-impose the full suite on every item.
      expect(skill).not.toContain(
        "Checkpoint verification passed — this is where the **full** suite runs",
      );
      expect(skill).toContain(
        "The **full** suite is required here only when the item sits on a checkpoint boundary",
      );
      // ...while still running at least once per spec. The guarantee comes from
      // the unconditional spec-level boundary, not from a condition re-derived
      // in `SKILL.md`: a run that completes one named row while others are still
      // `todo` — the ordinary `/qfai-atdd` handoff — is not on a boundary.
      expect(skill).toContain(
        "the spec-level boundary runs it unconditionally on a terminal ledger",
      );
      expect(skill).not.toContain("always a boundary");
    });

    // The "only" in the list above is scoped, and has to be. This file's list is
    // a set of ROW predicates, while `checkpoint-verification.md` tiers the
    // boundaries into per item and per spec — and the spec-level one has no row
    // at all, so it cannot be one of these entries. When this file claimed to be
    // "the single definition of the boundary cadence" full stop, an agent reading
    // only this anchor would skip the spec-level run that the checkpoint document
    // separately requires (with its own command set, minus step 1, and its own
    // seal). Pin the scoping so the two cannot drift back into contradiction.
    it(`${tree}: the boundary list scopes its "only" to the per-item tier`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain(
        "**This list is the single definition of the PER-ITEM boundary cadence",
      );
      expect(section).not.toContain(
        "**This list is the single definition of the boundary cadence.**",
      );
      expect(section).toContain("It is not the definition of every full-suite run");
      expect(section).toContain("is defined there, not here");
      // …and it must DELEGATE rather than restate. Naming the spec-level
      // condition here would make this file the second definition of it —
      // the exact shape that let the two drift apart, one tier up.
      expect(section, "the spec-level condition is restated here again").not.toMatch(
        /reaches `done` or a valid `exception`/,
      );
      expect(section).toContain('Do not read the "only" below as licence to skip it');

      // And the document it defers to must still carry that boundary, with the
      // two things this file promises are specified there.
      const checkpoint = unwrap(
        await read(tree, "assistant/skills/qfai-implement/references/checkpoint-verification.md"),
      );
      expect(checkpoint).toContain("**Per spec**");
      expect(checkpoint).toContain("## Verification command set (per spec)");
      expect(checkpoint).toContain("The spec-level boundary records a seal of its own");
    });

    it(`${tree}: the once-per-spec boundary follows work, not file position`, async () => {
      // A re-executed ledger routinely has its remaining `todo` rows above
      // already-`done` ones (spec-0015), so the physical last row is skipped
      // and would never trigger the full suite.
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain("the **last incomplete row this run completes**");
      expect(section).toContain(
        "if no other row is left at `todo` / `red` / `green` / `refactor` / `review-fix`, that row is a boundary",
      );
      expect(section).toContain("deliberately **not** the physical last row of the file");
      expect(section).toContain(
        "A run that completes no row has nothing to verify and no boundary",
      );
      expect(section).not.toContain("the **last row of the ledger**");

      const skill = unwrap(await read(tree, SKILL));
      expect(skill).not.toContain("the last ledger row is always a boundary");
    });

    it(`${tree}: the cross-package boundary does not depend on the fallback firing`, async () => {
      // Step 3's package is resolved only when the reverse walk fails, so a
      // boundary phrased against it is unevaluable on a fully resolved graph.
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain("**touched modules belonging to more than one package**");
      expect(section).toContain("Resolve the owning package of every touched module directly");
      expect(section).toContain("**independently of the resolution step used above**");
      expect(section).toContain("does not skip it");
      expect(section).not.toContain("touched a module **outside** the package resolved in step 3");
    });

    it(`${tree}: the checkpoint runs before done, so no backward transition is needed`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));
      expect(section).toContain("### Checkpoint runs before `done`, never after");
      expect(section).toContain("run the checkpoint at the end of Refactor");
      expect(section).toContain("FAIL -> `refactor -> exception` with a DR-ID");
      expect(section).toContain("filed as a new `todo` row");
      expect(section).toContain("Rows already `done` from earlier boundaries are never re-opened");
      // Refactor step 5 must not mark `done` before verifying.
      expect(skill).toContain("run checkpoint verification **while the item is still `refactor`**");
      expect(skill).toContain("Transition to `done` only on PASS");
    });

    it(`${tree}: boundaries are counted, not grouped by AC`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      // With a ~1:1 TC-to-AC spec every row is the last of its group, so an
      // AC-group boundary degenerates back to a full run per item.
      expect(section).toContain("every **N-th** completed row, with `N = 10` by default");
      expect(section).toContain("An AC or BR group is **not** a boundary");
      expect(section).toContain("coarser than the obligation granularity");
      expect(section).not.toContain("the **last row of each BR/AC group**");
      // The degenerate case is stated generically. The file ships verbatim into
      // every consuming project, so a concrete spec id here names that
      // project's own unrelated spec, not the one the sentence measured.
      expect(section).toContain(
        "every `TC` mapping to a distinct `AC` and occupying one ledger row",
      );
      expect(section).not.toContain("this repository's `spec-");
      expect(section).not.toMatch(/`TC-\d{4}-\d{4}/);
    });

    it(`${tree}: test-layers.md bounds test-file granularity`, async () => {
      const layers = await read(tree, "assistant/catalog/test-layers.md");
      expect(layers).toContain("## Test-file granularity");
      expect(layers).toContain("one test module per `TC-*`");
      expect(layers).toContain("is an anti-pattern");
      // The permissive trace rule must no longer read as licence to aggregate.
      expect(layers).toContain("this is a trace rule, not");
    });
  }
});
