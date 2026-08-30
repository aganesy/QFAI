import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { isCoverageTargetLevel, NON_COVERAGE_LAYERS } from "../../src/core/tddHelpers.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md";
const EXAMPLES_TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/05_Examples.md";
const RULES_TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/spec/04_Business-Rules.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Splits a markdown table row into trimmed cells. */
const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

describe("tdd/test-list.md has a shipped template and a named producer", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the ledger is the first table so validateTddList parses it`, async () => {
      const template = await read(tree, TEMPLATE);
      // `validateTddList` reads `parseFirstMarkdownTable`: any table above the
      // ledger is parsed as the ledger and raises eight
      // TDDLIST_REQUIRED_COLUMN_MISSING errors.
      const header = template.split(/\r?\n/).find((line) => line.trim().startsWith("|"));
      expect(header).toBeDefined();
      expect(cells(header ?? "")).toEqual([
        "TDD-ID",
        "TC-Refs",
        "BR-Ref",
        "Layer",
        "Test file",
        "Selector",
        "Status",
        "DR-ID",
        "Evidence",
      ]);
      expect(template.indexOf("## Ledger")).toBeLessThan(template.indexOf("## Schema"));
    });

    it(`${tree}: the seeded ledger carries the T1 review-group key`, async () => {
      // `/qfai-implement` opens, fills and closes a T1 review group by the row's
      // `BR-Ref`. Phase 2b is the only phase with `03`, `04` and `06` all open,
      // so a ledger seeded without the column leaves every group boundary
      // underivable downstream.
      // Compared with soft wraps collapsed: prettier owns where these sentences
      // break, and the assertion is about the rule, not the column it broke at.
      const template = (await read(tree, TEMPLATE)).replace(/\s*\n\s*/g, " ");
      expect(template).toContain("The one `BR-*` this row serves");
      expect(template).toContain("keep the **lowest-numbered** `BR-*`");
      expect(template).toContain("Write `-` when no `BR` reaches the row.");
      expect(template).toContain("`04_Business-Rules.md`");
      // The direct edge first: the AC join alone files a TC pinned through its
      // `EX` to one `BR` under a different rule that merely shares its `AC`.
      expect(template).toContain("read each TC's `EX-Ref` in `06_Test-Cases.md`");
      expect(template).toContain("Only a TC with no `EX-Ref` falls back to its `AC-Refs`");
      // An `EX` may name several `BR-*` for a cohesive rule bundle
      // (`layerCoverage.test.ts` allows it), so the tie-break has to cover the
      // whole union — restricting it to "several `TC-Refs`" leaves a
      // single-`TC` row with a multi-`BR` `EX` without a derivable key.
      expect(template).toContain("taking every `BR-*` listed there");
      expect(template).toContain("across several `TC-Refs` and across a multi-`BR` `EX` alike");
      expect(template).toContain("An empty cell reads the same as `-`");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("- Fill `BR-Ref` —");
      expect(checklists).toContain("the lowest-numbered `BR-*` of the whole union wins");
      expect(checklists).toContain("one `EX` may name several `BR-*`");
      expect(checklists).toContain("only a TC with no `EX-Ref` falls back");
    });

    it(`${tree}: the column's requiredness matches the schema SSOT`, async () => {
      // The template called `BR-Ref` a Required column while
      // `spec-traceability-rules.md` listed it in neither set and
      // `TDD_LEDGER_REQUIRED_COLUMNS` kept the original eight — so a ledger
      // seeded per the SSOT had no group key and still passed `qfai validate`.
      const template = (await read(tree, TEMPLATE)).replace(/\s*\n\s*/g, " ");
      expect(template).toContain("Every one except `BR-Ref` is required by `npx qfai validate`");
      expect(template).toContain("**optional to the validator and required for T1 batching**");

      const ssot = (
        await read(tree, "assistant/skills/qfai-sdd/references/spec-traceability-rules.md")
      ).replace(/\s*\n\s*/g, " ");
      expect(ssot).toContain("`Blocked-By`, `BR-Ref`");
      expect(ssot).toContain("`BR-Ref` is **conditionally required**");
      expect(ssot).toContain(
        "its cells are checked for shape, referent **and derivation** — at `warning`",
      );
      // "Declared" is a weaker claim than "this row's": a key resolved by some
      // other route names a real rule and still batches the row under one its
      // own `TC-Refs` never reach, so the SSOT has to say the value is
      // recomputed and compared, not merely resolved.
      expect(ssot).toContain("the value is recomputed from `TC` -> `EX` -> `BR`");
      // Empty is the same "not resolved" state the validator accepts, so the
      // SSOT must not leave `""` readable as a key rows share.
      expect(ssot).toContain('`-` for "not resolved" — an empty cell reads the same');
    });

    it(`${tree}: the Examples template permits the multi-BR cell the key derivation assumes`, async () => {
      // The key derivation takes "every `BR-*` listed there" and tie-breaks
      // over the union, which only has an input if the template an SDD agent
      // writes `05_Examples.md` from allows more than one. While it said
      // "Every EX must reference one BR" that agent collapsed or split a
      // cohesive bundle, and the union the ledger rule is written for could
      // never occur.
      const examples = (await read(tree, EXAMPLES_TEMPLATE)).replace(/\s*\n\s*/g, " ");
      expect(examples).not.toContain("Every EX must reference one BR");
      expect(examples).toContain("Every EX must reference **at least one** BR");
      expect(examples).toContain(
        "**A cohesive rule bundle may be written as several comma-separated `BR-*` in the one cell.**",
      );
      expect(examples).toContain("do not collapse such a bundle to a single `BR-*`");
      // Order-independence is what makes the lowest-numbered tie-break the
      // key rather than "whatever was written first".
      expect(examples).toContain("The cell is read as a **set**");
      expect(examples).toContain("the lowest-numbered `BR-*` of the union it reaches");

      // Over-correction pin: one `BR-*` stays the default, here and in the
      // granularity rule that argues from it.
      expect(examples).toContain("**One `BR-*` is the default.**");
      const rules = (await read(tree, RULES_TEMPLATE)).replace(/\s*\n\s*/g, " ");
      expect(rules).toContain("pins `EX` to `BR` 1:1 by default");
      expect(rules).toContain("only for a cohesive rule bundle");
    });

    it(`${tree}: the template states who produces the rows`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("## Producer");
      expect(template).toContain("one row per coverage-target TC");
      expect(template).toContain("An empty table below is valid");
    });

    it(`${tree}: the template claims no producer the shipped skills do not implement`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("`/qfai-atdd` does not write to\nthis ledger");
      expect(template).not.toContain("`Layer = E2E`");
    });

    it(`${tree}: reseeding is stated as a delta, not a regeneration`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("Reseeding is a **delta**, never a regeneration");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("**Seeding is a delta,\n   not a regeneration, in both directions**");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "Delta only: an unchanged TC's row keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`.",
      );
    });

    it(`${tree}: the delta reconciles changed and removed TCs, not only new ones`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("The delta runs in both directions.");
      expect(template).toContain("has its row retired the same way");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("changed / removed TCs are reset or retired");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Reconcile changed and removed TCs");
    });

    it(`${tree}: an empty ledger is only "nothing to do" when 06_Test-Cases.md agrees`, async () => {
      // The rule is stated in SKILL.md; the procedure behind it lives in the
      // reference, where the progressive-disclosure split (#414) put it.
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain(
        "**An empty ledger is a fault only when `06_Test-Cases.md` disagrees.**",
      );
      expect(skill).toContain("references/ledger-preconditions.md");

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("read `06_Test-Cases.md` and");
      expect(preconditions).toContain("Run the recovery above instead of exiting");
    });

    it(`${tree}: the coverage-target test matches the validator, not a level allowlist`, async () => {
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      // `isCoverageTargetLevel` excludes only the non-coverage layers;
      // everything else — including `unit`, `component` and any unrecognised
      // value — is a target, and a `06_Test-Cases.md` with no `Level` column
      // makes every TC one. Guidance naming a narrower allowlist makes a
      // header-only ledger look truthful and skips the whole implementation.
      //
      // Compared case-insensitively: the set is normalised to lower case for
      // matching, while the doc quotes the spelling the shipped
      // `06_Test-Cases.md` template uses (`L3`, not `l3`).
      const flatPreconditions = preconditions.toLowerCase();
      for (const layer of NON_COVERAGE_LAYERS) {
        expect(isCoverageTargetLevel(layer)).toBe(false);
        expect(flatPreconditions).toContain(`\`${layer}\``);
      }
      for (const target of ["unit", "component", "l1", "l2", ""]) {
        expect(isCoverageTargetLevel(target)).toBe(true);
      }
      expect(preconditions).toMatch(/no `Level` column/);
      // The removed claim: only `L1` / `L2` counted as coverage targets.
      expect(preconditions).not.toMatch(/`L1`\s*\/\s*`L2`/);
    });

    it(`${tree}: qfai-sdd owns a ledger-seeding phase in every phase-order surface`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("Phase 2b: Seed each target spec's `tdd/test-list.md`");
      expect(skill).toContain("zero selectable items");
      // The fixed order block and project_memory are what an agent follows.
      expect(skill).toContain("-> Phase 2b Seed tdd/test-list.md (per spec)");
      // #383 inserted Phase 2c between the seeding phase and Plan finalize; this
      // assertion is about Phase 2b keeping its slot after Phase 2 Slice.
      expect(skill).toContain("Phase 2 Slice → Phase 2b Seed tdd/test-list.md → Phase 2c");

      const playbook = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-execution-playbook.md",
      );
      expect(playbook).toContain("**Phase 2b - Seed `tdd/test-list.md`** (per spec)");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("## Phase 2b: Seed `tdd/test-list.md`");
      expect(checklists.indexOf("## Phase 2b")).toBeLessThan(checklists.indexOf("## Phase 3"));
    });

    it(`${tree}: qfai-implement names the producer and the recovery command`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      // SKILL.md still names the producer and forbids inventing rows — those
      // bind the agent before it opens anything else.
      expect(skill).toContain("**Producer**");
      expect(skill).toContain("do **not** invent rows that no TC backs");

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("Rerun `/qfai-sdd <spec-id>`");
    });

    it(`${tree}: an empty ledger is not routed into recovery`, async () => {
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("## Recovery when it is missing");
      expect(preconditions).toContain(
        "## An empty ledger is a fault only when `06_Test-Cases.md` disagrees",
      );
      expect(preconditions).toContain('Report\n  "nothing to do" and exit');
    });

    it(`${tree}: a spec seeded from the template passes validateTddList`, async () => {
      const template = await read(tree, TEMPLATE);
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-tpl-"));
      try {
        const specDir = path.join(root, ".qfai", "specs", "spec-0001");
        await mkdir(path.join(specDir, "tdd"), { recursive: true });
        await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
        await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
        await writeFile(path.join(specDir, "06_Test-Cases.md"), "# 06 Test Cases\n", "utf-8");
        await writeFile(path.join(specDir, "tdd", "test-list.md"), template, "utf-8");

        const issues = await validateTddList(root, defaultConfig);
        expect(issues.map((entry) => entry.code)).not.toContain("TDDLIST_REQUIRED_COLUMN_MISSING");
        // Header-only ledger is the informational, non-blocking outcome.
        expect(issues.map((entry) => entry.code)).toContain("TDDLIST_INFO");
        expect(issues.filter((entry) => entry.severity === "error")).toEqual([]);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});
