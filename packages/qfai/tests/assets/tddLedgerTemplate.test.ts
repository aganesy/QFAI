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
        // The template is copied into every spec that has no ledger yet, so a
        // Phase 2b recovery reads its Producer section rather than SKILL.md.
        // An unqualified exemption there drops every E2E row in a project that
        // never opted into surface typing.
        TEMPLATE,
        "assistant/skills/qfai-sdd/SKILL.md",
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
        "assistant/skills/qfai-atdd/references/red-provenance.md",
        // `/qfai-implement` reads this one for what a seeded obligation row
        // means. An unqualified exemption here has the consumer treat a
        // missing E2E row as legitimate in a project that never opted in, so
        // the ATDD gate fails with nothing left to restore the row.
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      ]) {
        const text = await read(tree, surface);
        expect(text, surface).toMatch(/at least one[\s\S]{0,40}UI-bearing|some spec does declare/);
        expect(text, surface).toMatch(/project-wide|surface typing/);
      }
    });

    it(`${tree}: the API-row expectation is limited to contracts the spec owns`, async () => {
      // One `CON-API-*` gets exactly one row, in the lowest-numbered spec that
      // names it. A surface that demands a row for *any* active contract
      // reports a correctly seeded non-owner spec as an incomplete Phase 2b and
      // sends it back for a row that must not exist.
      for (const surface of [
        "assistant/skills/qfai-atdd/SKILL.md",
        "assistant/skills/qfai-atdd/references/red-provenance.md",
        "assistant/skills/qfai-implement/references/execution-ledger.md",
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      ]) {
        const text = await read(tree, surface);
        expect(text, surface).toMatch(/`CON-API-\*`[\s\S]{0,20}the spec owns/);
      }

      // Zero owned rows must read as legitimate, not as a defect to report.
      const skill = await read(tree, "assistant/skills/qfai-atdd/SKILL.md");
      expect(skill).toContain("owned by another spec");
      expect(skill).toMatch(/obligation this spec owns is an incomplete Phase 2b/);

      const provenance = await read(
        tree,
        "assistant/skills/qfai-atdd/references/red-provenance.md",
      );
      expect(provenance).toContain("the row exists once, in the owner's ledger");
      expect(provenance).toMatch(/obligation \*\*this spec owns\*\* is\s+an incomplete/);
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

      // The copied template is the surface a Phase 2b recovery follows. "The
      // spec declares" there put the same `CON-API-*` row in every declaring
      // spec's ledger, duplicating the `todo` row and its evidence.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**Which ledger an API row goes in.**");
      expect(template).toContain("**lowest-numbered**");
      expect(template).toMatch(/Never write the same `CON-API-\*` row into two\s+ledgers\./);
      expect(template).not.toContain("`CON-API-*`** the spec declares");
    });

    it(`${tree}: an owner resolved after Phase 2b still gets its API row`, async () => {
      // Phase 2b runs once and before Phase 2c, and Phase 2c is the step that
      // names each BR/AC's realizing contract — so a `CON-API-*` no spec named
      // yet acquires its owner only after the only seeding pass had run.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toMatch(
        /\*\*Close the phase by re-running the Phase 2b API-row delta over the\s+contracts this phase touched\.\*\*/,
      );
      // The Phase 2b text must defer the unowned contract, not drop it.
      expect(skill).not.toContain("raise it in Phase 2c instead of guessing a ledger");
      expect(skill).toContain("deferred rather than dropped");

      const memory = skill.slice(skill.indexOf("project_memory:"));
      expect(memory, "project_memory does not state the Phase 2c re-run").toContain(
        "re-run twice more",
      );

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "**Close the phase by re-running the Phase 2b API-row delta over the contracts this phase touched.**",
      );
      expect(checklists.indexOf("## Phase 2c")).toBeLessThan(
        checklists.indexOf("**Close the phase by re-running"),
      );
    });

    it(`${tree}: the --contract route runs the Phase 2b delta too`, async () => {
      // A contract-only Change Request that flips `x-qfai-status` owes a new
      // `Layer = API` row (planned -> active) or the retirement of a stale one
      // (active -> planned). The route ran Stage 0 + Phase 0 + Phase 4 only, so
      // neither ever happened and the gate and the ledger diverged for good.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      const route = skill.slice(skill.indexOf("- Contract-scoped (`/qfai-sdd --contract"));
      const bullet = route.slice(0, route.indexOf("\n-"));
      expect(bullet).toContain("**Phase 2b API-row delta**");
      expect(bullet).toContain("x-qfai-status: planned");
      expect(bullet).not.toMatch(/Phase 0 \(Contracts-first\) \+ Phase 4/);
    });

    it(`${tree}: the --contract route resolves an owner or leaves the contract planned`, async () => {
      // Phase 2b defers an unowned `CON-API-*` to Phase 2c, and this route ran
      // no Phase 2c — so activating a contract no spec names left the repo-wide
      // `QFAI-ATDD-113` firing with no ledger to hold the row and no later step
      // that would ever resolve one.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      const route = skill.slice(skill.indexOf("- Contract-scoped (`/qfai-sdd --contract"));
      const bullet = route.slice(0, route.indexOf("\n-"));
      expect(bullet).toContain("**Phase 2c for a contract that delta finds no owner for**");
      expect(bullet).toContain(
        "**An activation this route cannot give an owner does not go through.**",
      );
      expect(bullet).toContain("**leave the contract at `x-qfai-status: planned`**");
      // The phase list must no longer end at the delta: that shape is what
      // skipped the only step able to name an owner.
      expect(bullet).not.toMatch(/\*\*Phase 2b API-row delta\*\* \+ Phase 4/);

      const memory = skill.slice(skill.indexOf("project_memory:"));
      expect(memory, "project_memory does not state the unowned-activation stop").toContain(
        "leaves the contract at `x-qfai-status: planned` when even that names none",
      );
    });

    it(`${tree}: a surface-typing flip re-runs the E2E delta over every spec`, async () => {
      // The exemption's precondition is project-wide, but Phase 2b applies its
      // delta to the target spec only. Adding the project's first surface
      // signal (or removing its last) therefore moved every other spec's `US-*`
      // across the active/exempt line with no pass that would reconcile them.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("**A surface-typing flip re-runs the E2E delta over every spec.**");
      expect(skill).toMatch(/apply\s+the E2E-row delta to \*\*every\*\* spec's ledger/);

      const memory = skill.slice(skill.indexOf("project_memory:"));
      expect(memory, "project_memory does not state the project-wide re-run").toContain(
        "re-runs the E2E-row delta over every spec's ledger",
      );

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "**A surface-typing flip re-runs the E2E delta over every spec.**",
      );

      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).toMatch(/re-runs\s+the E2E-row delta over every spec's ledger/);
    });

    it(`${tree}: a seeded acceptance row names the writer of Test file and Selector`, async () => {
      // Phase 2b seeds the row before the test exists, `/qfai-atdd` authors the
      // test but never writes this ledger, and the RED handoff needs the row
      // identity — so with no writer named the two cells stayed `-` for good.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toMatch(
        /seeded E2E\/API row leaves `Test file` and `Selector` at `-`, and\s+`\/qfai-implement` is what fills them/,
      );

      const memory = skill.slice(skill.indexOf("project_memory:"));
      expect(memory, "project_memory does not name the writer").toContain(
        "`/qfai-implement` Phase Red step 3b writes both cells",
      );

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "**`Test file` and `Selector` are seeded as `-` on an E2E/API row, and `/qfai-implement` fills them.**",
      );

      // The template is what a Phase 2b recovery copies, so it must carry the
      // same contract.
      const template = await read(tree, TEMPLATE);
      expect(template).toMatch(
        /`Test file` and `Selector` start at `-`, and\s+`\/qfai-implement` fills them/,
      );

      // The writer itself, and the identity copy the reviewers hash.
      const implement = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(implement).toContain("this step is the writer that fills them");
      expect(implement).toContain(
        "on a Phase 2b-seeded acceptance row those two cells are still `-` there",
      );

      // The producer of the values: the authored test, not a copy of the `-`.
      const atdd = await read(tree, "assistant/skills/qfai-atdd/SKILL.md");
      expect(atdd).toContain("record the path and selector of the test **this run authored**");

      const provenance = await read(
        tree,
        "assistant/skills/qfai-atdd/references/red-provenance.md",
      );
      expect(provenance).toMatch(
        /the identity comes from the authored test, not from\s+the ledger/,
      );

      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).toMatch(
        /\*\*A seeded acceptance row's `Test file` and `Selector` are `-` until Phase Red\s+step 3b writes them\.\*\*/,
      );

      // A manual recovery must not invent a path the handoff will contradict.
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toMatch(
        /Leave `Test file` and `Selector` at `-` on a restored acceptance row/,
      );
    });

    it(`${tree}: an eight-column ledger is migrated, not only waived`, async () => {
      // The empty-obligation-cell check fires only where the column exists, so
      // a legacy ledger validates. Its E2E/API rows kept the obligation in
      // `TC-Refs`, which no consumer reads for that layer — so waiving the
      // validator alone leaves the row selectable and unusable at the handoff.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toMatch(/\*\*An eight-column ledger is migrated\s+in the same pass\*\*/);

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("**Migrate an eight-column ledger in the same pass.**");

      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).toContain("**A legacy ledger needs a reader rule, not only that waiver.**");
      expect(ledger).toMatch(/read a non-`TC-\*` obligation token in\s+`TC-Refs`/);

      const implement = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(implement).toContain("On a legacy eight-column ledger that column does not exist");
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

    it(`${tree}: the template points at the schema instead of restating it`, async () => {
      const template = await read(tree, TEMPLATE);
      // The inline `## Schema` table drifted five cells behind the reference it
      // linked two lines below itself, and the `Evidence` row told the author to
      // paste command output into a one-line GFM cell — which truncates the
      // ledger or misaligns every column after it, silently. A copy has nothing
      // keeping it honest, so the template now carries exactly one table (the
      // ledger) and a pointer.
      const tableLines = template.split(/\r?\n/).filter((line) => line.trim().startsWith("|"));
      expect(tableLines).toHaveLength(2);

      expect(template).toContain("references/spec-traceability-rules.md#tdd-execution-ledger");
      expect(template).toContain("Do not restate it here.");

      // The three descriptions the reference had already superseded.
      expect(template).not.toContain("RED/GREEN command+result pairs proving the TDD cycle");
      expect(template).not.toContain("Decision Record ID for exception rows");
      expect(template).not.toMatch(/`todo`\s*\/\s*`red`\s*\/\s*`green`/);

      // The pointer must resolve: the heading the anchor is built from, and the
      // rules it promises are there.
      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain("## TDD Execution Ledger");
      expect(rules).toContain(
        "Optional columns: `US-Refs`, `CON-API-Refs`, `Blocked-By`, `Owning module`",
      );
      expect(rules).toContain("`Evidence` is a **pointer**");
      expect(rules).toContain(
        "Legal `Status` values: `todo`, `blocked`, `red`, `green`, `refactor`, `review-fix`,",
      );
    });

    it(`${tree}: the schema pointer carries the parallel-dispatch seam column`, async () => {
      // `Owning module` is filled at Phase 2b like any other cell, and
      // `parallelization-policy.md` cannot evaluate a single allow condition
      // when the ledger has no such column. An author who reads only the
      // template and the reference it points at must still learn the column
      // exists, or every new ledger is born serial-only.
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("`Owning module`");

      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      const ledgerSection = rules.slice(
        rules.indexOf("## TDD Execution Ledger"),
        rules.indexOf("## Traceability Ledger"),
      );
      expect(ledgerSection).toContain("`Owning module`");

      const seam = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(seam).toContain("| Owning module |");
      const policy = await read(
        tree,
        "assistant/skills/qfai-implement/references/parallelization-policy.md",
      );
      expect(policy).toContain("If the ledger carries no `Owning module` column");
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
