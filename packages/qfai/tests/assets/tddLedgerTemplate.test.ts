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

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

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
        // Seeded with `Layer`, which is where the tier derivation's inputs
        // already are. Shipping it in the header is what makes T1 reachable:
        // a tier nobody can write is a tier nobody claims.
        "Tier",
        "Test file",
        "Selector",
        "Status",
        "DR-ID",
        "Evidence",
      ]);
      expect(template.indexOf("## Ledger")).toBeLessThan(template.indexOf("## Schema"));
    });

    it(`${tree}: the template says who seeds Tier and what a blank cell means`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("`Tier` is seeded with the row");
      expect(template).toContain("never written into `Evidence`");
      expect(template).toContain("Every one but `Tier` is required");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Seed each row's `Tier` alongside its `Layer`");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("**Seed `Tier` with the\n   row**");
    });

    it(`${tree}: the ledger FORMAT SSOT carries Tier so Phase 2b cannot drop it`, async () => {
      // The template points at `spec-traceability-rules.md` for the full rules
      // and `qfai-sdd/SKILL.md` makes it required reading before any artifact
      // is written. A column absent from that list reads as non-standard, and
      // the agent that omits it un-seeds the tier the template just seeded.
      const rules = unwrap(
        await read(tree, "assistant/skills/qfai-sdd/references/spec-traceability-rules.md"),
      );
      expect(rules).toContain("Optional columns: `Tier`, `US-Refs`, `CON-API-Refs`, `Blocked-By`");
      expect(rules).toContain("Legal values `T1`, `T2`, `T3`, or `-`");
      expect(rules).toContain("raises `TDDLIST_UNKNOWN_TIER`");
      // Optionality, value range and owner — all three, in the SSOT.
      expect(rules).toContain("seeded at Phase 2b beside `Layer` and never written by");
      expect(rules).toContain("Do not drop the column as non-standard");
    });

    it(`${tree}: a raised Tier reopens the row instead of inheriting T1 evidence`, async () => {
      // Phase 2b is re-run per change request. Without this, a TC whose tier
      // is corrected upward keeps `done` and the batched T1 reviewer trail, so
      // the per-row and product-surface turns the new tier owes never run.
      const checklists = unwrap(
        await read(tree, "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md"),
      );
      expect(checklists).toContain("Re-derive `Tier` on every re-run");
      expect(checklists).toContain("it overrides the delta rule above");
      expect(checklists).toContain(
        "return `Status` to `todo`, record the driving `CR-*` in `DR-ID`, and cite that `CR-*` in `Evidence` **above the retained prior trail**",
      );
      expect(checklists).toContain("A **lowered** tier keeps `Status` and `Evidence`");

      // The reset is the upstream reset, so it obeys that rule's own contract:
      // `execution-ledger.md` makes the reset cite its approval in `Evidence`
      // and the template keeps prior `Evidence`. Wiping the cell would delete
      // the only record of the cycle the raise withdrew, and with it the
      // reviewer's way to audit that the reopen was authorised.
      expect(checklists).not.toContain("clear the now-void `Evidence`");
      expect(checklists).toContain("never as credit toward the new tier");

      // The short project_memory is what a compacted run keeps, so the
      // exception has to survive there too — otherwise that run reads the
      // unqualified delta rule and leaves the raised row `done`.
      const memory = unwrap(await read(tree, "assistant/skills/qfai-sdd/SKILL.md"));
      expect(memory).toContain(
        "a **raised** Tier (T1 -> T2/T3, T2 -> T3) is an upstream reset even for an unchanged TC",
      );
      expect(memory).toContain("keeping the prior Evidence as history");
      expect(memory).toContain("A lowered Tier keeps Status and Evidence.");
    });

    it(`${tree}: the tier derivation reads what the row touches, not only Layer`, async () => {
      // `volume-policy.md` tiers on three inputs — `Layer`, what the item
      // touches, and criticality. Naming only two of them here seeds a `Unit`
      // row over persisted schema, or a `Component` row over rendered output,
      // as T1; the validator only checks the value range, so the batched
      // ceremony would stand.
      const template = unwrap(await read(tree, TEMPLATE));
      expect(template).toContain("from its `Layer`, what the item touches");
      expect(template).toContain(
        "a `Unit` row over persisted schema and a `Component` row over rendered output are `T2` and `T3`",
      );

      const checklists = unwrap(
        await read(tree, "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md"),
      );
      expect(checklists).toContain("The tier table takes three inputs, not one");
      expect(checklists).toContain(
        "A `Unit` row over persisted schema or a `Component` row over rendered output is therefore not `T1`",
      );

      const skill = unwrap(await read(tree, "assistant/skills/qfai-sdd/SKILL.md"));
      expect(skill).toContain("**what the item touches**");
      expect(skill).toContain("`Layer` alone is not the derivation");
      // Including the compacted memory line.
      expect(skill).toContain("Tier derived from Layer + what the row touches");
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
