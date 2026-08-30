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

const SDD = "assistant/skills/qfai-sdd";
const SDD_SKILL = `${SDD}/SKILL.md`;
const SDD_RULES = `${SDD}/references/spec-traceability-rules.md`;
const SDD_CHECKLISTS = `${SDD}/references/sdd-phase-checklists.md`;
const SDD_TEMPLATE = `${SDD}/templates/specs/spec/tdd/test-list.md`;

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

    it(`${tree}: the SKILL carries both the gate note and the reconcile step`, async () => {
      const skill = flat(await read(tree, SKILL));

      expect(skill).toContain(
        "Under RED-first the source modules do not exist when `delivery-planner` must judge",
      );
      expect(skill).toContain(
        "a ledger without that column supports parallel dispatch only for seams that already exist",
      );
      expect(skill).toContain(
        "diff each slice's touched `src/` paths against its declared `Owning module`",
      );
    });
  }
});

/**
 * The declaring half of #391 shipped without its producing half: every column
 * the policy adjudicates on is authored by `/qfai-sdd` Phase 2b, and that
 * skill had never heard of `Owning module`. A seeded ledger therefore hit
 * "the allow conditions cannot be evaluated at all" in every project the
 * tooling creates, silently — the column is optional, so nothing warns.
 */
describe("declared seam has a producer", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the seeded ledger header carries the column`, async () => {
      const template = await read(tree, SDD_TEMPLATE);
      const header = template.split(/\r?\n/).find((line) => line.trim().startsWith("|"));

      expect(header).toContain("| Owning module |");
      // Documented in the same file, so a seeded `-` is readable as a decision.
      expect(flat(template)).toContain(
        "| Owning module | The production module this row will write",
      );
      expect(flat(template)).toContain(
        "Fill it from the TC's parent `BR`, which already names the behaviour's home.",
      );
    });

    it(`${tree}: Phase 2b is told to fill it, from the source the schema names`, async () => {
      const skill = flat(await read(tree, SDD_SKILL));
      const checklists = flat(await read(tree, SDD_CHECKLISTS));

      expect(skill).toContain("Fill each row's optional `Owning module` from the TC's parent `BR`");
      expect(checklists).toContain("Declare each row's `Owning module` from the TC's parent `BR`");
    });

    // "The TC's parent BR" is not a lookup any single table answers, and the
    // two routes are not interchangeable: a normal-case TC names an `EX`, and
    // `05_Examples.md` pins `EX -> BR` 1:1, so that route is exact. `AC-Refs`
    // is the fallback, and it is ambiguous whenever one AC decomposes into
    // several BRs. Naming only the fallback would strand exactly resolvable
    // rows at `-`.
    it(`${tree}: the route from a TC to its parent BR prefers EX-Ref`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const template = flat(await read(tree, SDD_TEMPLATE));

      for (const text of [checklists, template]) {
        expect(text).toContain("`AC-Refs`");
        expect(text).toContain("04_Business-Rules.md");
        expect(text).toContain("`BR-Ref`");
        expect(text).toContain("05_Examples.md");
        expect(text).toMatch(/`EX-Ref` first/);
        // The claim this replaces: EX-Ref does select the parent, exactly.
        expect(text).not.toContain("`EX-Ref` never selects it");
      }
    });

    // The fallback condition is "no `EX` is named", not "the cell holds one
    // specific dash". `layerCoverage.ts` reports a TC (`QFAI-COV-206`) only
    // when `AC-Refs` and `EX-Ref` are *both* empty, so a blank `EX-Ref` beside
    // a filled `AC-Refs` is valid spec that reaches its parent through `AC`.
    // Keying on `—` alone drops that TC out of the AC route and parks a
    // resolvable row at `-`, making it needlessly serial.
    it(`${tree}: an EX-Ref naming no EX falls back, blank as well as em-dash`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const template = flat(await read(tree, SDD_TEMPLATE));
      const skill = flat(await read(tree, SDD_SKILL));
      const rules = flat(await read(tree, SDD_RULES));

      for (const text of [checklists, template, skill, rules]) {
        expect(text).toContain("whenever the `EX-Ref` cell names no `EX`");
        expect(text).toMatch(/empty cell/);
        // The narrow condition this replaces, in either file's wording.
        expect(text).not.toMatch(/only when `EX-Ref` is `—`/);
        expect(text).not.toMatch(/only when `EX-Ref`\s*is `—`/);
      }
      for (const text of [checklists, template]) {
        expect(text).toContain('`—` and `-` all mean "none"');
      }
      expect(checklists).toContain("QFAI-COV-206");
    });

    // Phase 2b copies the template only when the ledger is absent and is a
    // delta otherwise, so a project seeded before this column existed would
    // keep its 8-column header forever without an explicit migration step.
    // `/qfai-implement` appends a `## CHG-*` ledger table per change request
    // (`tests/core/tddLedgerLaterTableChecks.test.ts`), so migrating only the
    // leading table can leave every real row without the column.
    it(`${tree}: every ledger table in a pre-existing file is migrated`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const skill = flat(await read(tree, SDD_SKILL));
      const rules = flat(await read(tree, SDD_RULES));

      expect(checklists).toContain("Migrate a pre-existing ledger in place");
      expect(checklists).toContain("**every** schema-shaped ledger table in the file");
      expect(checklists).toContain("each `## CHG-*` table");
      expect(skill).toContain("A ledger whose header predates the column is migrated here");
      expect(skill).toContain("every ledger table in the file, each `## CHG-*` one included");
      expect(rules).toContain("gains it at the next Phase 2b");
      expect(rules).toContain("`## CHG-*` tables included");
    });

    // A ledger can be mixed: the leading table predating the column while a
    // later `## CHG-*` table already carries it. An unconditional "append to
    // every table" hands that second table a duplicate header cell, and
    // `cell()` in `src/core/validators/tddList.ts` resolves a column with
    // `headers.indexOf` — the FIRST match. The stale `-` stays authoritative
    // and the freshly written module name is never read, so the very row the
    // migration was for remains ineligible for parallel dispatch.
    it(`${tree}: migration is per table — add where missing, fill in place`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const skill = flat(await read(tree, SDD_SKILL));
      const rules = flat(await read(tree, SDD_RULES));

      expect(checklists).toContain("deciding per table");
      expect(checklists).toContain("A table whose own header lacks `Owning module` gains it");
      expect(checklists).toContain(
        "A table that already carries the column is filled in place with its header untouched",
      );
      expect(checklists).toContain("never append a second `Owning module`");
      // The reason, so the rule survives a rewrite that keeps only the prose.
      expect(checklists).toContain("`headers.indexOf`");
      expect(checklists).toMatch(/reads the \*\*first\*\* column of that name/);
      expect(checklists).toContain("Mixed files are the normal case");

      expect(skill).toContain("gains the column only where its own header lacks it");
      expect(skill).toContain("never given a duplicate");

      expect(rules).toContain("added to the header of each ledger table that lacks it");
      expect(rules).toContain(
        "A table already carrying the column is filled in place, never given a second one",
      );
      expect(rules).toMatch(/resolves the \*\*first\*\* column of that name/);
    });

    // The column answers one question — what will this row write in
    // production, before RED makes it observable. It is a necessary input to
    // `delivery-planner`, not the verdict: the test-module, write/read,
    // fixture, schema, external-resource and worktree gates in
    // `parallelization-policy.md` all still have to hold.
    it(`${tree}: the column is not stated as the whole parallel gate`, async () => {
      const checklists = flat(await read(tree, SDD_CHECKLISTS));
      const template = flat(await read(tree, SDD_TEMPLATE));
      const rules = flat(await read(tree, SDD_RULES));
      const skill = flat(await read(tree, SDD_SKILL));

      for (const text of [checklists, template, rules, skill]) {
        expect(text).toContain("parallelization-policy.md");
      }
      expect(checklists).toContain("It is not by itself a parallel verdict");
      expect(template).toContain("never a sufficient one");
      expect(rules).toContain("necessary for parallel dispatch, never sufficient");
      expect(skill).toContain("not the whole gate");
    });

    it(`${tree}: the traceability rules list it among the optional columns`, async () => {
      const rules = flat(await read(tree, SDD_RULES));

      expect(rules).toContain(
        "Optional columns: `US-Refs`, `CON-API-Refs`, `Blocked-By`, `Owning module`",
      );
      expect(rules).toContain(
        "Optional columns detail: `Owning module` — the production module the row will write",
      );
    });
  }
});
