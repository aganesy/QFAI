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
        // Optional ninth column: the split row's stable identity. Appended
        // after the required eight so "in the order used above" still holds
        // for the schema table, and tolerated by `validateTddList`, which
        // checks that the required columns are present, not that no others are.
        "Boundary",
      ]);
      expect(template.indexOf("## Ledger")).toBeLessThan(template.indexOf("## Schema"));
    });

    it(`${tree}: the template states who produces the rows`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("## Producer");
      expect(template).toContain("one row per independently observable boundary");
      expect(template).toContain("coverage-target TC");
      expect(template).toContain("An empty table below is valid");
    });

    it(`${tree}: the seeding phase splits a matrix-shaped TC before RED`, async () => {
      // `spec-traceability-rules.md` requires the split "before RED begins",
      // and Phase 2b is the only phase that writes rows before RED. A
      // checklist that says only "one row per TC" makes the rule unenforceable
      // by construction: every matrix TC reaches `/qfai-implement` unsplit.
      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      const phase2b = checklists.slice(
        checklists.indexOf("## Phase 2b"),
        checklists.indexOf("## Phase 2c"),
      );
      expect(phase2b).toContain("more than one independently observable boundary");
      expect(phase2b).toContain("one row per boundary");
      // `06_Test-Cases.md` keeps Steps / Expected / Notes in separate columns,
      // so an input matrix can sit in `Steps` under a single summarising
      // `Expected`. A criterion scoped to the expected outcome alone leaves
      // that TC whole and its RED still stops at the first failing assert.
      expect(phase2b).toContain(
        "**Count the boundaries over the whole TC row, not over `Expected` alone.**",
      );
      expect(phase2b).toContain("`Steps`, `Expected` and `Notes` in separate columns");
      expect(phase2b).toContain("`EX-Ref` and `AC-Refs`");
      // Without this the seeded shape reads as a TC-coverage violation.
      expect(phase2b).toContain("`TC-Refs` is many-to-many");
      expect(phase2b).toContain("spec-traceability-rules.md");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("MUST be split across multiple TDD rows before RED begins");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("one row per independently observable boundary");
      expect(template).toContain("`TC-Refs` is many-to-many");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("one row per independently observable boundary");
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
        "Delta only, per boundary: a row whose (`TC-*`, boundary) pair is unchanged keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`.",
      );
    });

    it(`${tree}: a split row is identified by its boundary, not by its TC`, async () => {
      // Sibling rows of one matrix TC all carry the same `TC-*`, so a delta
      // matched on `TC-Refs` cannot tell an added, changed or dropped boundary
      // from an unchanged one — it would keep a retired boundary selectable.
      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      const phase2b = checklists.slice(
        checklists.indexOf("## Phase 2b"),
        checklists.indexOf("## Phase 2c"),
      );
      expect(phase2b).toContain("Name the boundary in a `Boundary` cell on every row");
      expect(phase2b).toContain("The unit of the delta is the boundary, not the `TC-*`");
      expect(phase2b).toContain("Reconcile changed and removed TCs per boundary");
      expect(phase2b).toContain("retire the row of a boundary dropped from its TC");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("identified by the (`TC-Refs`, `Boundary`) pair");
      // A slug is unique inside its own TC and nowhere wider, so `Boundary`
      // alone is not a ledger-wide key: a generic slug (`not-found`) recurs
      // across TCs and would match a sibling of the wrong one.
      expect(rules).toContain("`Boundary` on its own is not a ledger-wide key");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("identified by its `Boundary` cell");
      expect(template).toContain("matches on the (`TC-Refs`, `Boundary`) pair");
      expect(template).toContain(
        "A boundary dropped from a surviving TC has its row retired the same way",
      );
    });

    it(`${tree}: the boundary identity is a cell /qfai-implement never rewrites`, async () => {
      // `/qfai-implement` writes a renamed `Selector` back to the ledger when a
      // review-fix handback replaces the test (Red step 3b). Keyed on
      // `Selector`, a reseed reads that rename as one boundary dropped and
      // another added, and retires a row whose Status/Evidence are still valid.
      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      const phase2b = checklists.slice(
        checklists.indexOf("## Phase 2b"),
        checklists.indexOf("## Phase 2c"),
      );
      expect(phase2b).toContain(
        "a reseed matches rows on the (`TC-*`, `Boundary`) pair and on nothing else",
      );
      expect(phase2b).toContain("The pair, not the slug");
      expect(phase2b).toContain("it is the runtime test name");
      expect(phase2b).toContain("is written only here, and is never rewritten downstream");

      // The claim above is only true while the handback path really is
      // Selector-only, so pin the sentence it rests on.
      const implement = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(implement).toContain("A handback naming a new `Selector` or `Test file`");

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("`Boundary` is seed-owned");
      expect(preconditions.replace(/\s+/g, " ")).toContain(
        "handback rewrites `Selector` and `Test file`, never `Boundary`",
      );

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("`Boundary` is an optional column");
      expect(rules).toContain("never rewritten by `/qfai-implement`");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "`Boundary` is written by `/qfai-sdd` Phase 2b and by nothing else",
      );
    });

    it(`${tree}: a legacy one-row aggregate is re-split, not preserved as unchanged`, async () => {
      // The preserve rule ("an unchanged row keeps its Status and Evidence")
      // would otherwise pin every ledger seeded under the old one-row-per-TC
      // wording, so the split would only ever reach brand-new ledgers.
      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      const phase2b = checklists.slice(
        checklists.indexOf("## Phase 2b"),
        checklists.indexOf("## Phase 2c"),
      );
      expect(phase2b).toContain("Migrate legacy aggregate rows before applying the delta");
      expect(phase2b).toContain("the preserve rule above does not protect it");
      // The disposal is per-row and asymmetric: a row that maps to exactly one
      // boundary may be kept and reset, one that maps to none must be retired.
      // A reset row with no `Boundary` stays selectable, so `/qfai-implement`
      // would run the whole matrix as one RED ahead of the split rows — the
      // shape the migration exists to remove.
      expect(phase2b).toContain("When its `Selector` names **exactly one** boundary, keep the row");
      expect(phase2b).toContain("When it names none, or names several, **retire it**");
      expect(phase2b).toContain("A reset is not an option there");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "Such a legacy aggregate row is not unchanged and the delta does not preserve it",
      );

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain(
        "legacy one-row aggregate for a matrix TC does **not** count as unchanged",
      );
    });

    it(`${tree}: the legacy re-split resets a progressed row only under an approved CR`, async () => {
      // `change-request-reset.md` makes an approved CR enumerating the rows the
      // only sanctioned backward transition. The migration is triggered by the
      // seeding rule changing, not by an edit to `06_Test-Cases.md`, so no such
      // CR exists yet — a checklist that just says "reset it" asks the agent
      // either to break that rule or to abandon the split.
      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      const phase2b = checklists.slice(
        checklists.indexOf("## Phase 2b"),
        checklists.indexOf("## Phase 2c"),
      );
      expect(phase2b).toContain("Gate the whole migration on one approved `CR-*`");
      expect(phase2b).toContain("qfai-implement/references/change-request-reset.md");
      expect(phase2b).toContain("constitution/drift-protocol.md");
      expect(phase2b).toContain("listing the aggregate rows by `TDD-ID`");
      // The append is not the free half. `drift-protocol.md` puts adding,
      // removing and re-scoping ledger rows on the upstream path, and landing
      // the appends alone would leave the aggregate row and its N replacements
      // both selectable if the CR were then rejected or stalled.
      expect(phase2b).toContain("it lands whole or not at all");
      expect(phase2b).toContain("not the appended rows, not the `Boundary` column");
      expect(phase2b).toContain("must leave the ledger exactly as it was, not half re-split");
      expect(phase2b).not.toContain("need no approval");

      const reset = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(reset).toContain("**enumerates the rows**");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "That migration is a\nsingle re-scope and lands whole or not at all",
      );
      expect(template).toContain("until approval change nothing here");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain(
        "the whole migration (appended rows included) waits on an\n   approved `CR-*` that enumerates the aggregate rows",
      );
      expect(skill).toContain("maps to no single boundary is retired, never reset");
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

    it(`${tree}: every surface that tells you how to seed says "per boundary"`, async () => {
      // The recovery advice a missing ledger prints, and the ATDD note on a
      // spec with no ATDD-owned rows, both still said "one row per
      // coverage-target TC". Follow either and a matrix TC comes back as a
      // single aggregate row — the shape this rule exists to prevent — so the
      // in-repo guidance has to agree with the checklist.
      const provenance = await read(
        tree,
        "assistant/skills/qfai-atdd/references/red-provenance.md",
      );
      expect(provenance.replace(/\s+/g, " ")).toContain(
        "seeds ledger rows per **coverage-target** `TC-*` — one per independently observable boundary",
      );
      expect(provenance).not.toContain("seeds one row\nper coverage-target `TC-*`");

      // The runtime advice lives in the validator, not the shipped tree, so it
      // is read from source once rather than per tree.
      const validator = await readFile(
        path.join(repoRoot, "packages/qfai/src/core/validators/tddList.ts"),
        "utf-8",
      );
      expect(validator).not.toContain("with one row per coverage-target TC");
      expect(validator).toContain(
        "with one row per independently observable boundary of a coverage-target TC",
      );
    });

    it(`${tree}: the Boundary invariant names the rule that enforces it`, async () => {
      // A rule stated only in prose is a rule with no reader: sibling rows
      // could leave `Boundary` empty, or spend one slug twice, and validate
      // clean. Both surfaces name the codes so an operator can connect the
      // finding to the rule.
      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("QFAI-TDD-003");
      expect(rules).toContain("QFAI-TDD-004");
      // The severities are not interchangeable: a legacy ledger cannot be
      // migrated before its CR is approved, so the missing slug must not fail
      // `--fail-on error`; a duplicate can only come from a Phase 2b that
      // already writes the column.
      expect(rules).toContain("(`warning`, since a legacy ledger cannot be migrated");
      expect(rules).toContain("(`error`, since only a Phase 2b that already writes the column");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("QFAI-TDD-003");
      expect(template).toContain("QFAI-TDD-004");
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
