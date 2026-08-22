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
        "Layer",
        "Test file",
        "Selector",
        "Status",
        "DR-ID",
        "Evidence",
      ]);
      expect(template.indexOf("## Ledger")).toBeLessThan(template.indexOf("## Schema"));
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

    it(`${tree}: the Integration group of rows has a named producer`, async () => {
      // `Layer = Integration` is a legal ledger row with a documented owner,
      // evidence file and gate branch, but `isCoverageTargetLevel("l3")` is
      // `false` — so "one row per coverage-target TC" was the whole seeding
      // rule and it produced none of them. The rows existed in consuming
      // projects anyway, created outside any documented path.
      expect(isCoverageTargetLevel("l3")).toBe(false);
      expect(isCoverageTargetLevel("integration")).toBe(false);

      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "plus **one `Layer = Integration` row per integration-level (`L3`, `integration`,\nor no declared `Level`) TC**",
      );

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("**one `Layer = Integration` row per integration-level TC**");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain(
        "**and one `Layer = Integration` row per\n   integration-level (`L3`, `integration`, or no declared `Level`) TC**",
      );

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "- Add one `Layer = Integration` row per integration-level (`L3`, `integration`, or **no declared `Level`**) TC as well",
      );

      // The consumer of those rows names the same producer, so an agent
      // reading either file alone reaches the same answer.
      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).toContain("**Who seeds them.** `/qfai-sdd` Phase 2b");
    });

    it(`${tree}: the ATDD side no longer says a fresh spec has none of these rows`, async () => {
      // Phase 2b now seeds `Layer = Integration` rows, so "a fresh spec has
      // none of these rows yet" sent `/qfai-atdd` past rows it owns: it
      // recorded zero and produced no RED provenance, and `/qfai-implement`
      // Phase Red step 3b leaves a row with no handoff at `todo` — the
      // producer path this change adds never completes.
      const atdd = await read(tree, "assistant/skills/qfai-atdd/SKILL.md");
      expect(atdd).not.toContain("A fresh spec has none of these rows yet");
      expect(atdd).toContain(
        "**A fresh spec already carries its `Layer = Integration` rows and no `E2E` / `API` row",
      );
      expect(atdd).toContain("enumerating them at P1b is this run's work");

      const provenance = await read(
        tree,
        "assistant/skills/qfai-atdd/references/red-provenance.md",
      );
      expect(provenance).toContain(
        "**The `Integration` rows are a different case: they are already there.**",
      );
    });

    it(`${tree}: a TC with no declared Level is routed to exactly one group`, async () => {
      // `classifyCoverageLevel("")` is a coverage target, while
      // `QFAI-ATDD-112` routes the same TC to `tests/integration/**`. Left in
      // the first group it is implemented twice — or, read the other way, gets
      // no `Integration` row for ATDD to hand over.
      expect(isCoverageTargetLevel("")).toBe(true);

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("**Read each TC's `Level` once and route it to exactly one");
      expect(preconditions).toContain("`Level` is `L3`, the word `integration`, **or is blank**");
      expect(preconditions).toContain("**A blank `Level` belongs to the second group**");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("The two groups are exclusive.");

      const testCases = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md",
      );
      expect(testCases).toContain("**Leave the cell blank and the TC is routed as `L3`**");
    });

    it(`${tree}: the producer rule allows one row per boundary, not exactly one per TC`, async () => {
      // `selector-granularity.md` requires a matrix-shaped TC to be split
      // before RED, and `/qfai-atdd` may not write this ledger — so if Phase
      // 2b, its only producer, may emit exactly one `Integration` row, nobody
      // downstream can perform the split the RED depends on.
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain(
        "**One row per independently observable boundary, and at least one per TC.**",
      );
      expect(preconditions).toContain("`/qfai-atdd` never writes this\nledger");

      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).toContain("**at least** one `Layer = Integration`");
      expect(ledger).toContain("one row per independently observable boundary");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain('- "One row" is a floor in both groups');

      const template = await read(tree, TEMPLATE);
      expect(template).toContain('**"One row" is a floor, not a cap.**');
    });

    it(`${tree}: an integration-level TC alone does not make a header-only ledger truthful`, async () => {
      // `TDDLIST_TC_NOT_COVERED` skips `L3`, so a spec whose obligations are
      // all integration-level validates clean with an empty ledger. Exiting on
      // that reads a silent gate as "nothing to do".
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain(
        "confirm it declares **neither** a\ncoverage-target TC **nor** an integration-level TC",
      );
      expect(preconditions).toContain("- **Only integration-level TCs are declared**");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("no coverage-target TC **and** no integration-level TC");
    });

    it(`${tree}: the delta does not retire a row whose TC is still declared at L3`, async () => {
      // "retire the row of a TC ... no longer a coverage target" reads as an
      // instruction to delete every seeded `Layer = Integration` row on the
      // next reseed, evidence and all — the TC is present, it is simply not a
      // target.
      const template = await read(tree, TEMPLATE);
      expect(template).not.toContain("or no longer a\ncoverage target");
      expect(template).toContain("Retirement is keyed on the TC, not on coverage-target status.");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).not.toContain("deleted upstream or no longer a coverage target");
      expect(checklists).toContain("A row whose TC is still declared at `L3` is not stale");
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
