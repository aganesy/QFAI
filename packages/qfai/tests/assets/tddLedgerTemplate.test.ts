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
      // The eight required columns lead, then the two obligation columns a
      // seeded `Layer = E2E` / `Layer = API` row needs. Without them in the
      // header `validateObligationColumn` reads the absent column as "this row
      // carries no such obligation" and the seeded row is unverifiable.
      expect(cells(header ?? "")).toEqual([
        "TDD-ID",
        "TC-Refs",
        "Layer",
        "Test file",
        "Selector",
        "Status",
        "DR-ID",
        "Evidence",
        "US-Refs",
        "CON-API-Refs",
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
      // The E2E/API rows are seeded by Phase 2b and tracked here; the removed
      // claim was that `US-*` / `CON-API-*` are "**not** rows here", which left
      // the two obligation columns documented, enforced and never produced.
      expect(template).not.toContain("are **not** rows here");
      expect(template).toContain("**one `Layer = E2E` row per active `US-*`**");
      expect(template).toContain("**one `Layer = API` row per active `CON-API-*`**");
    });

    it(`${tree}: Phase 2b seeds obligation rows only for active obligations`, async () => {
      // `catalog/test-layers.md` exempts a non-UI-bearing spec's `US-*` from
      // `QFAI-ATDD-111` and a `x-qfai-status: planned` contract from
      // `QFAI-ATDD-113`. Seeding unconditionally would create a
      // completion-prohibiting `todo` row for a test that must not be written.
      for (const surface of [
        TEMPLATE,
        "assistant/skills/qfai-sdd/SKILL.md",
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      ]) {
        const text = await read(tree, surface);
        expect(text, surface).toContain("x-qfai-status: planned");
        expect(text, surface).toMatch(/QFAI-ATDD-111/);
        expect(text, surface).toMatch(/QFAI-ATDD-113/);
      }
    });

    it(`${tree}: every phase-order surface states the three seeded groups`, async () => {
      // SKILL.md, its `project_memory` block and the phase checklist all
      // described the seeding, and all three said "one row per coverage-target
      // TC" and nothing else — so no surface an agent follows produced a
      // `Layer = E2E` / `Layer = API` row.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("in **three groups**");
      const memory = skill.slice(skill.indexOf("project_memory:"));
      expect(memory, "project_memory still describes one group").toContain("three groups");
      expect(memory).toContain("`Layer = E2E` row per active `US-*`");
      expect(memory).toContain("`Layer = API` row per active `CON-API-*`");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Seed three groups of rows");
      expect(checklists).toContain("one `Layer = E2E` row per **active** `US-*`");
      expect(checklists).toContain("one `Layer = API` row per **active** `CON-API-*`");
    });

    it(`${tree}: the ledger names who writes production code for an E2E/API row`, async () => {
      // `/qfai-atdd` authors the acceptance test and has no production agent.
      // Without this stated, the E2E row reads as the sole carrier of the
      // behaviour and has no implementer at all.
      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).toContain("**Who writes the production code for an E2E/API row.**");
      expect(ledger).toContain("delivered by the same\nspec's `TC-*` rows");
      expect(ledger).toContain("**Both columns are seeded, not hand-added.**");

      // The reference the ATDD stage reads must agree: zero rows is the
      // exemption case, not "these are never rows".
      const provenance = await read(
        tree,
        "assistant/skills/qfai-atdd/references/red-provenance.md",
      );
      expect(provenance).not.toContain("are not row-producing");
      expect(provenance).toContain("Phase 2b seeds a `Layer = E2E` row per **active** `US-*`");

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).not.toContain("they never appear as rows here");
      expect(preconditions).toContain("`Layer = API` row per **active** `CON-API-*`");
    });

    it(`${tree}: the surface exemption is conditioned on surface typing being in use`, async () => {
      // `atddTraceability.ts#resolveUiBearingScope` returns "no scope" when no
      // spec declares a surface, so `QFAI-ATDD-111` stays project-wide for a
      // project that never opted in. An unconditional "skip a US-* in a spec
      // with no surface" would leave exactly those projects with zero E2E rows
      // and a gate that never clears.
      for (const surface of [
        "assistant/skills/qfai-sdd/SKILL.md",
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
        "assistant/skills/qfai-atdd/references/red-provenance.md",
      ]) {
        const text = await read(tree, surface);
        expect(text, surface).toMatch(/at least one[\s\S]{0,40}UI-bearing|some spec does declare/);
        expect(text, surface).toMatch(/project-wide|surface typing/);
      }
    });

    it(`${tree}: an API row's owning spec is resolved mechanically`, async () => {
      // `.qfai/contracts/**` has no spec owner in the model, so "the spec
      // declares" left a multi-spec project unable to decide which ledger the
      // row goes in — every ledger, or none.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("**Ownership of an API row**");
      expect(skill).toContain("**lowest-numbered**");

      const memory = skill.slice(skill.indexOf("project_memory:"));
      expect(memory, "project_memory does not state ownership").toContain("lowest-numbered");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("**Which ledger an API row goes in.**");
      expect(checklists).toContain("Never write the same `CON-API-*` row into two ledgers.");
    });

    it(`${tree}: manual recovery restores all three groups, not only the TC one`, async () => {
      // Copying the template and deriving from `06_Test-Cases.md` alone
      // reproduces the missing-acceptance-row state the recovery exists to fix.
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("must restore the **same three groups**");
      expect(preconditions).toContain('"No TC backs it" is not a reason to drop an\nE2E/API row');
      expect(preconditions).toContain("read **all three** Phase 2b sources");
    });

    it(`${tree}: the ATDD and implement primary procedures follow the new producer`, async () => {
      // Both stated the pre-#490 contract in their own body — the surface an
      // agent actually follows — so `/qfai-atdd` enumerated no rows and
      // `/qfai-implement` required none.
      const atdd = await read(tree, "assistant/skills/qfai-atdd/SKILL.md");
      expect(atdd).not.toContain("A fresh spec has none of these rows yet");
      expect(atdd).toContain("Phase 2b seeds one `Layer = E2E` row per active `US-*`");
      expect(atdd).toContain("incomplete Phase 2b");

      const implement = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(implement).not.toContain("those rows have no producer");
      expect(implement).toContain(
        "Phase 2b seeds an `E2E` /\n  `API` row per **active** obligation",
      );
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
      // `06_Test-Cases.md` is one of the three Phase 2b sources, not the only
      // one: with the E2E/API groups seeded, a ledger can be header-only
      // because its acceptance rows are missing rather than unowed.
      expect(preconditions).toContain("`06_Test-Cases.md` declares no coverage-target TC");
      expect(preconditions).toContain("`02_User-stories.md` declares no active `US-*`");
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
