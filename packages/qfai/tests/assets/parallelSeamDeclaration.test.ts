/**
 * Parallel dispatch is judged on declared seams (#391).
 *
 * The allow conditions are facts about production modules; RED-first guarantees
 * those modules do not exist when `delivery-planner` — the sole authority — has
 * to evaluate them, and the required ledger schema's only path-valued column is
 * `Test file`. The deny condition even demanded "concrete file/module
 * evidence", which is precisely what test-first withholds.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const IMPLEMENT = "assistant/skills/qfai-implement";
const SKILL = `${IMPLEMENT}/SKILL.md`;
const LEDGER = `${IMPLEMENT}/references/execution-ledger.md`;
const POLICY = `${IMPLEMENT}/references/parallelization-policy.md`;
const STRUCTURE = "assistant/catalog/structure.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("declared seam", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the ledger schema documents Owning module`, async () => {
      const ledger = await read(tree, LEDGER);

      expect(ledger).toContain("| Owning module |");
      expect(flat(ledger)).toContain(
        "`Owning module` is a **declaration, not an observation**, and that is the whole point: it exists before the code does.",
      );
    });

    it(`${tree}: the schema states why Test file was not enough`, async () => {
      const ledger = flat(await read(tree, LEDGER));

      expect(ledger).toContain(
        "two items trivially have independent test files and land on the same production module",
      );
      // The declaration is authored where the behaviour's home is already known.
      expect(ledger).toContain("Fill it at ledger-authoring time (`/qfai-sdd` Phase 2b)");
      expect(ledger).toContain("One module per row");
    });

    it(`${tree}: an undeclared row is not eligible for parallel dispatch`, async () => {
      const ledger = flat(await read(tree, LEDGER));
      const policy = flat(await read(tree, POLICY));

      expect(ledger).toContain("A row carrying `-` is **not eligible for parallel dispatch**");
      expect(policy).toContain("A row carrying `-` in that column is not eligible");
    });

    it(`${tree}: the allow/deny conditions are restated over the column`, async () => {
      const policy = flat(await read(tree, POLICY));

      expect(policy).toContain(
        "**Every concurrently dispatched row declares an `Owning module`**, and no two of them declare the same one",
      );
      expect(policy).toContain(
        "Two concurrently dispatched items declare the same `Owning module`, or either of them declares none",
      );
    });

    it(`${tree}: "concrete file/module evidence" points at the column`, async () => {
      const policy = flat(await read(tree, POLICY));

      expect(policy).toContain(
        "Before RED that evidence is the rows' declared `Owning module` values",
      );
      // The honest fallback when the column is absent.
      expect(policy).toContain(
        "**If the ledger carries no `Owning module` column, the allow conditions cannot be evaluated at all**",
      );
      expect(policy).toContain('"The test files differ" is not an independence claim.');
    });

    it(`${tree}: seam reconciliation runs regardless of a green suite`, async () => {
      const policy = flat(await read(tree, POLICY));

      expect(policy).toContain("## Seam reconciliation (after a parallel run)");
      // The gap the integration verify does not close.
      expect(policy).toContain(
        "It does not detect two slices deciding the same thing twice under two names in one module",
      );
      expect(policy).toContain("**independently of whether the merged suite passes**");
      expect(policy).toContain(
        "It is a breach whether or not anything broke: the gate was passed on a claim that turned out to be false",
      );
    });

    it(`${tree}: reconciliation takes its roots from structure steering, not a literal src/`, async () => {
      const policy = flat(await read(tree, POLICY));

      // Step 1's prose and its own command must name the same operand.
      expect(policy).toContain(
        "For each slice, list the paths it actually touched under the production roots `catalog/structure.md` declares",
      );
      // The operand is a named field, not a section the reader has to infer.
      expect(policy).toContain(
        "the `Production roots` field of its `## Key packages / entrypoints` section",
      );
      expect(policy).toContain("substituting `<source root>` from that field rather than assuming");
      expect(policy).not.toContain("list the `src/` paths it actually touched");
    });

    it(`${tree}: structure steering carries an exhaustive Production roots field`, async () => {
      const structure = flat(await read(tree, STRUCTURE));

      // Stage 0 fills `<...>` placeholders, so the field must exist to be filled.
      expect(structure).toContain("## Key packages / entrypoints");
      expect(structure).toContain(
        "- Production roots: <every directory that holds shipped source, exhaustively",
      );
      expect(structure).toContain("exclude tests, fixtures, build output and config>");
    });

    it(`${tree}: a legitimately empty diff is not an infinite re-read loop`, async () => {
      const policy = flat(await read(tree, POLICY));

      // Zero paths is ambiguous, and the falsifiability path makes it legal.
      expect(policy).toContain("A zero-path result is not by itself evidence of a clean seam");
      expect(policy).toContain("it is not automatically a mis-read root either");
      expect(policy).toContain(
        "every item on the slice took the falsifiability path, which adds no production code and reverts its mutation (`references/red-not-observable.md`)",
      );
      // Re-reading the roots is the branch for the *other* case only.
      expect(policy).toContain(
        "if even one item claims production code, treat the empty diff as a mis-read root",
      );
    });

    it(`${tree}: the SKILL carries both the gate note and the reconcile step`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "Under RED-first the source modules do not exist when `delivery-planner` must judge",
      );
      expect(skill).toContain(
        "a ledger without that column supports parallel dispatch only for seams that already exist",
      );
      expect(skill).toContain(
        "diff each slice's touched paths under the production roots `catalog/structure.md` declares against its declared `Owning module`",
      );
      expect(skill).not.toContain("diff each slice's touched `src/` paths");
    });
  }
});
