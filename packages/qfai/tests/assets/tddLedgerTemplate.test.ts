import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveAtddHomeKind } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import {
  classifyCoverageLevel,
  isCoverageTargetLevel,
  NON_COVERAGE_LAYERS,
} from "../../src/core/tddHelpers.js";
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
      // The eight required columns lead, then the two obligation columns a
      // seeded `Layer = E2E` / `Layer = API` row needs. Without them in the
      // header `validateObligationColumn` reads the absent column as "this row
      // carries no such obligation" and the seeded row is unverifiable.
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
        "US-Refs",
        "CON-API-Refs",
        // Optional, but only `/qfai-sdd` can author it: see
        // `tests/assets/parallelSeamDeclaration.test.ts`.
        "Owning module",
      ]);
      expect(template.indexOf("## Ledger")).toBeLessThan(template.indexOf("## Schema"));
    });

    it(`${tree}: the template says who seeds Tier and what a blank cell means`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("`Tier` is seeded with the row");
      expect(template).toContain("never written into `Evidence`");
      // The template used to restate the schema and this line read it there.
      // main moved the schema into the rules file and told the template not to
      // restate it, so optionality is asserted where the schema now lives: the
      // required list is closed and `Tier` is not in it.
      const schema = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(schema).toContain(
        "- Required columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence",
      );
      expect(schema).toMatch(/- Optional columns:[^.]*`Tier`/);

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
      // Membership, not position: the case that owns `Owning module` pins this
      // list from its opening, so `Tier` joins the end of it.
      expect(rules).toMatch(/Optional columns:[^.]*`Tier`/);
      expect(rules).toContain("Legal values `T1`, `T2`, `T3`, or `-`");
      expect(rules).toContain("raises `QFAI-TDDLIST-010`");
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

    it(`${tree}: every phase-order surface states the four seeded groups`, async () => {
      // SKILL.md, its `project_memory` block and the phase checklist all
      // described the seeding, and all three said "one row per coverage-target
      // TC" and nothing else — so no surface an agent follows produced a
      // `Layer = E2E` / `Layer = API` row.
      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("in **four groups**");
      const memory = skill.slice(skill.indexOf("project_memory:"));
      expect(memory, "project_memory still describes one group").toContain("four groups");
      expect(memory).toContain("`Layer = E2E` row per active `US-*`");
      expect(memory).toContain("`Layer = API` row per active `CON-API-*`");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Seed four groups of rows");
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
      // The seeding rule moved with the obligation-column topic; the ledger points at it.
      const columns = await read(
        tree,
        "assistant/skills/qfai-implement/references/obligation-columns.md",
      );
      expect(columns).toContain("**Both columns are seeded, not hand-added.**");

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
        "assistant/skills/qfai-implement/references/obligation-columns.md",
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
        "assistant/skills/qfai-implement/references/obligation-columns.md",
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
      // The phase list is one sentence now: this route also runs Phase 2c to
      // reconcile the obligations the in-scope specs already hold (#580), so the
      // owner-resolution clause reads as part of that step rather than beside it.
      expect(bullet).toContain(
        "the step that names an owner for a contract that delta finds none for",
      );
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
        "assistant/skills/qfai-implement/references/obligation-columns.md",
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
        "assistant/skills/qfai-implement/references/obligation-columns.md",
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
        "assistant/skills/qfai-implement/references/obligation-columns.md",
      );
      expect(ledger).toContain("**A legacy ledger needs a reader rule, not only that waiver.**");
      expect(ledger).toMatch(/read a non-`TC-\*` obligation token in\s+`TC-Refs`/);

      const implement = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(implement).toContain("On a legacy eight-column ledger that column does not exist");
    });

    it(`${tree}: manual recovery restores all four groups, not only the TC one`, async () => {
      // Copying the template and deriving from `06_Test-Cases.md` alone
      // reproduces the missing-acceptance-row state the recovery exists to fix.
      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("must restore the **same four groups**");
      expect(preconditions).toContain('"No TC backs it" is not a reason to drop an\nE2E / API row');
      expect(preconditions).toContain("read **all four** Phase 2b sources");
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
        "- **one `Layer = Integration` row per integration-level TC** from the same file\n  — every `Level` whose ATDD annotation routes to `tests/integration/**`",
      );

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("**one `Layer = Integration` row per integration-level TC**");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain(
        "**one `Layer = Integration` row per integration-level TC** from the same file\n   (every `Level` whose ATDD annotation routes to",
      );

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "- one `Layer = Integration` row per integration-level TC from the same file, obligation in `TC-Refs`;",
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
        "**A fresh spec may already carry `Layer = Integration` rows, and this stage cannot create those either.**",
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
      // A blank `Level` is not a coverage target — `QFAI-ATDD-112` routes that
      // TC to `tests/integration/**` and that stage writes its test. What it
      // must still get is the `Integration` row, so ATDD has something to hand
      // over; seeding it in the coverage-target group instead would have the
      // test written twice.
      expect(isCoverageTargetLevel("")).toBe(false);

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("**Read each TC's `Level` once and route it to exactly one");
      expect(preconditions).toContain(
        "**every** `Level`\n  whose ATDD annotation routes to `tests/integration/**`:",
      );
      expect(preconditions).toContain(
        "**A blank _or unrecognised_ `Level` belongs to the integration group**",
      );

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("The two TC groups are exclusive, and membership is decided by");

      const testCases = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/spec/06_Test-Cases.md",
      );
      expect(testCases).toContain(
        "**Leave the cell blank — or spell it something these five codes do not name —\nand the TC is routed as `L3`**",
      );
    });

    it(`${tree}: an unrecognised Level is routed to the Integration group, not to both`, async () => {
      // `isCoverageTargetLevel` treats an unrecognised spelling as a coverage
      // target, while `resolveAtddHomeKind` falls it back to the integration
      // home — so `QFAI-ATDD-112` has `/qfai-atdd` write the same TC's test.
      // Seeding it in the first group as well is the double ownership the
      // exclusivity rule above forbids, and `TDDLIST_UNKNOWN_LEVEL` is a
      // waivable warning, so the input is not guaranteed to be stopped first.
      expect(isCoverageTargetLevel("smoke")).toBe(true);
      expect(resolveAtddHomeKind("smoke")).toBe("integration");
      expect(resolveAtddHomeKind("")).toBe("integration");

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      // The first group is an allowlist of recognised coverage levels, so an
      // unrecognised one cannot fall into it.
      expect(preconditions).toContain(
        "- **one row per coverage-target TC that declares a `Level` the layer vocabulary\n  recognises**",
      );
      expect(preconditions).not.toContain("unrecognised ones included");
      expect(preconditions).toContain("`TDDLIST_UNKNOWN_LEVEL` is a\n`warning` and waivable");
      expect(preconditions).toContain(
        "**No validator asks for the integration group** — with two exceptions, the blank\nand the unrecognised `Level` above",
      );

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("A TC whose\n`Level` is blank **or unrecognised**");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain(
        "every Level whose ATDD annotation routes to the tests/integration tree",
      );

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "declares a `Level` the layer vocabulary recognises (`L1` / `L2` / `unit` / `component`)",
      );
    });

    it(`${tree}: the implement skill names Integration in every ATDD-ownership rule`, async () => {
      // Phase 2b now produces `Layer = Integration` rows, and step 3b plus
      // gate item 10 already treat them as handed over. Non-goals, Phase Red
      // step 3 and the Orchestrator Protocol still enumerated `E2E` / `API`
      // only, so an agent reading them wrote the integration test itself
      // (double authoring) or anchored its evidence at
      // `implement-<spec-id>.md`, which item 10 rejects.
      const implement = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(implement).toContain(
        "`Layer = E2E` / `Layer = API` / `Layer = Integration` ledger rows are tracked here",
      );
      expect(implement).toContain("**All three, including `Integration`**");
      expect(implement).toContain(
        "An `E2E`, `API` **or `Integration`** row's test is authored by `/qfai-atdd` (Non-goals)",
      );
      expect(implement).not.toContain("An `E2E` or `API` row's test is authored");
      expect(implement).not.toContain(
        "`.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` row, whose RED was produced",
      );
      expect(implement).toContain(
        "`.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` / `Integration` row, whose RED was produced",
      );
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
      expect(checklists).toContain('- "One row" is a floor in both TC groups');

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
        "`06_Test-Cases.md` declares no integration-level TC either, which no validator\njudges at all, so read the `Level` cells yourself",
      );
      expect(preconditions).toContain("- **Only ATDD-owned obligations are declared**");

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "no coverage-target TC, no integration-level TC **and** no active",
      );
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

    it(`${tree}: the delta reconciles per boundary, not only per TC`, async () => {
      // A matrix-shaped TC is seeded one row per boundary, so its row set can
      // shrink while the TC itself stays declared and stays `L3`. Keyed on the
      // TC alone, no retirement rule fires for the dropped boundary and the
      // changed-TC reset hands its row back as selectable work for behaviour
      // the spec no longer states.
      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain("Reconcile **per boundary, not only per TC**");
      expect(checklists).toContain("append a row at `todo` for a boundary the TC has gained");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**Within a TC it is keyed on the boundary.**");
      expect(template).toContain("a boundary the TC\nhas gained is appended at `todo`");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain("**per boundary within a matrix-shaped TC**");
    });

    it(`${tree}: the boundary reconciliation is not keyed on the mutable Selector`, async () => {
      // `drift-protocol.md` authorises the executing stage to fill a
      // placeholder selector and repair an unresolvable one, so a row seeded
      // with a descriptive selector carries the test's real title once its
      // cycle runs. Matching the spec's boundaries against that cell reports
      // every implemented boundary as deleted, and retiring on it discards a
      // `done` row's `TDD-ID`, `Status` and `Evidence` for behaviour that never
      // changed.
      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).not.toContain("match the existing rows to it by `Selector`");
      expect(checklists).toContain(
        "**`Selector` is not the key, and a row past `todo` is never retired by a string comparison.**",
      );
      // Retirement survives, but only where the row cannot have been rewritten.
      expect(checklists).toContain("only a row still at `Status = todo` whose seeded selector");
      // And the ambiguous case goes to the change record rather than to a diff.
      expect(checklists).toContain("**stop and raise a `CR-*`**");

      const template = await read(tree, TEMPLATE);
      expect(template).not.toContain("match the\nexisting rows to it by `Selector`");
      expect(template).toContain("**`Selector` is not that key.**");
      expect(template).toContain(
        "`TDD-ID` is the\nonly identity on these rows that nothing downstream rewrites",
      );
    });

    it(`${tree}: system and acceptance are routed to the Integration group`, async () => {
      // Both are IN the TDD level vocabulary, so neither is "unrecognised",
      // and neither is a coverage target — a rule worded on spelling put them
      // in no group at all. `resolveAtddHomeKind` routes both to
      // `tests/integration/**`, so `/qfai-atdd` writes their tests while
      // nothing seeded the handoff row Phase Red step 3b reads.
      expect(isCoverageTargetLevel("system")).toBe(false);
      expect(isCoverageTargetLevel("acceptance")).toBe(false);
      expect(resolveAtddHomeKind("system")).toBe("integration");
      expect(resolveAtddHomeKind("acceptance")).toBe("integration");
      // The gap only exists because they are not unrecognised: an
      // unrecognised-spelling rule would have caught them otherwise.
      expect(classifyCoverageLevel("system")).toBe("non-coverage");
      expect(classifyCoverageLevel("acceptance")).toBe("non-coverage");

      for (const [file, needle] of [
        [
          "assistant/skills/qfai-implement/references/ledger-preconditions.md",
          "**and `system` / `acceptance`**",
        ],
        [
          "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
          "**and `system` / `acceptance`**",
        ],
        ["assistant/skills/qfai-sdd/SKILL.md", "and `system` / `acceptance`"],
        [
          "assistant/skills/qfai-implement/references/execution-ledger.md",
          "and `system` /\n`acceptance`",
        ],
        ["assistant/skills/qfai-atdd/references/red-provenance.md", "and\n`system` / `acceptance`"],
        [
          "assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md",
          "and `system` / `acceptance`",
        ],
        // The CONSUMER side. The producer seeds an `Integration` row for these
        // two, but this skill's own routing summary listed `L3` / `integration`
        // / blank / unrecognised — and `system` / `acceptance` are none of
        // those — so the stage that owes the test and the RED provenance did
        // not know the row was its work, and Phase Red step 3b found no handoff.
        ["assistant/skills/qfai-atdd/SKILL.md", "and `system` / `acceptance`"],
      ] as const) {
        expect(await read(tree, file), `${file} does not route system / acceptance`).toContain(
          needle,
        );
      }
    });

    // The routing summary is not the only place the ATDD skill enumerates which
    // TCs it owes work for: its reviewer gate and its Success Criteria each
    // carry their own list, and both were phrased `L3`/`L4`/`L5`/blank. A stage
    // whose gate does not count a row it seeded cannot report it as outstanding.
    it(`${tree}: the ATDD gate and Success Criteria route by destination, not by spelling`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-atdd/SKILL.md");
      expect(skill, "the reviewer gate still enumerates spellings").not.toContain(
        "**that declares `L3`/`L4`/`L5` or no `Level`**",
      );
      expect(skill).toContain("**whose `Level` routes to an ATDD home**");
      expect(skill, "Success Criteria still enumerates spellings").not.toContain(
        "Each TC declaring L3/L4/L5, or no Level, is covered",
      );
      expect(skill).toContain("Each TC whose Level routes to an ATDD home is covered");
      expect(skill).toContain("system / acceptance");
      // And the coverage-obligation list must no longer treat "unreadable" as
      // the whole of the integration group.
      expect(skill).not.toContain(
        "A `Level` this list cannot\n    read — blank, or an unrecognised spelling — routes to `tests/integration/**`.",
      );
    });

    // Both `L1`/`L2` and `L3` are seeded, so a Level crossing between them
    // retires nothing and only the changed-TC reset fires — and that reset
    // writes `Status` and `DR-ID`, never `Layer`, `Test file`, `Selector` or the
    // evidence home. The row then waits on a handoff nothing sends, or two
    // skills author one TC's test.
    it(`${tree}: a Level moving between the two TC groups reclassifies the row`, async () => {
      for (const [file, needles] of [
        [
          "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
          [
            "crosses between the two TC groups reclassifies the row",
            "retires nothing (both layers are seeded here)",
            "retire it and seed a fresh row in the new group",
            "**stop and raise a `CR-*`**",
            "`implement-<spec-id>.md` vs `atdd-<spec-id>.md`",
          ],
        ],
        [
          "assistant/skills/qfai-sdd/templates/specs/spec/tdd/test-list.md",
          [
            "A move between the two seeded groups is a reclassification, not a reset.",
            "retired and re-seeded in\nthe new group",
            "stops for a `CR-*`",
          ],
        ],
      ] as const) {
        const content = await read(tree, file);
        for (const needle of needles) {
          expect(content, `${file} does not handle the group crossing`).toContain(needle);
        }
      }
    });

    it(`${tree}: a cross-spec entry on an Integration row goes to the ATDD file`, async () => {
      // The same split gate item 10 resolves the row's anchor against. Named
      // as `E2E` / `API` only, one row's record lands in two files: the open
      // obligation is written where the gate does not read it, so it stops
      // being a completion prohibition.
      const ownership = await read(
        tree,
        "assistant/skills/qfai-implement/references/cross-spec-ownership.md",
      );
      expect(ownership).not.toContain(
        "`.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` row)",
      );
      expect(ownership).toContain(
        "`.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API` / `Integration` row",
      );
      expect(ownership).toContain("**all three**");
    });

    it(`${tree}: the checkpoint writer sends an Integration row to the ATDD file`, async () => {
      // Gate items 10 and 12 read the checkpoint fields out of the file the
      // row's `Layer` owns, which for an `Integration` row is
      // `atdd-<spec-id>.md`. The checkpoint writer named `E2E` / `API` only, so
      // a seeded Integration row had its result and seal written where the gate
      // does not look and could not reach `done`.
      const checkpoint = await read(
        tree,
        "assistant/skills/qfai-implement/references/checkpoint-verification.md",
      );
      expect(checkpoint).not.toContain(
        "`.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API`\nrow",
      );
      expect(checkpoint).toContain(
        "`.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API`\n/ `Integration` row",
      );
      // The spec-level boundary picks its file by the same enumeration.
      expect(checkpoint).toContain(
        "row is `E2E` / `API` / `Integration`, where the implement file",
      );

      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).not.toContain("`## Ledger rows advanced` for the E2E/API rows");
      expect(ledger).toContain(
        "`## Ledger rows advanced` for the `E2E` / `API` /\n  `Integration` rows",
      );
    });

    it(`${tree}: the shared falsifiability exception covers an Integration row`, async () => {
      // `red-provenance.md` and `qa-gatekeeper.md` already accept a production
      // path+symbol as `Satisfied-by` on an Integration row. The shared rule
      // sent the same handoff to a blocking `exception`, so one correct RED
      // resolved two ways depending on which file the agent opened.
      const shared = await read(
        tree,
        "assistant/skills/qfai-implement/references/red-not-observable.md",
      );
      expect(shared).toContain(
        "**is accepted only on a `Layer = E2E` / `Layer = API` / `Layer = Integration`\n   row handed over by `/qfai-atdd`**",
      );
      expect(shared).toContain("On a `Unit` / `Component` row it is\n   **not** accepted");
      expect(shared).toContain(
        "**`Integration` sits\n   with `E2E` and `API`, not with `Unit` and `Component`**",
      );
      // The removed claim: the exception was E2E/API only and an Integration
      // row was named beside Unit/Component as excluded from it.
      expect(shared).not.toContain(
        "On a `Unit` / `Component` /\n   `Integration` row it is **not** accepted",
      );
      expect(shared).not.toContain(
        "which is not true of\n  a `Unit` / `Component` / `Integration` row",
      );

      // The two files it has to agree with.
      const provenance = await read(
        tree,
        "assistant/skills/qfai-atdd/references/red-provenance.md",
      );
      expect(provenance).toContain("`Layer = Integration` rows are tracked there");
      const gatekeeper = await read(tree, "assistant/agents/qa-gatekeeper.md");
      expect(gatekeeper).toContain(
        "On an `E2E` / `API` / `Integration` row, `Satisfied-by` need not be a sibling `TDD-NNNN`",
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
      // Among declared values `isCoverageTargetLevel` excludes only the
      // non-coverage layers; everything else — including `unit`, `component`
      // and any unrecognised value — is a target. Guidance naming a narrower
      // allowlist makes a header-only ledger look truthful and skips the whole
      // implementation.
      //
      // An **undeclared** `Level` is the one exception, and the doc has to say
      // so: `QFAI-ATDD-112` already routes such a TC to `tests/integration/**`
      // at `error`, so a row seeded here too would make one TC answer to two
      // owners, two test trees and two evidence files — with no `Layer` the
      // spec supports, which is what the completion gate selects the evidence
      // file by.
      //
      // Compared case-insensitively: the set is normalised to lower case for
      // matching, while the doc quotes the spelling the shipped
      // `06_Test-Cases.md` template uses (`L3`, not `l3`).
      const flatPreconditions = preconditions.toLowerCase();
      for (const layer of NON_COVERAGE_LAYERS) {
        expect(isCoverageTargetLevel(layer)).toBe(false);
        expect(flatPreconditions).toContain(`\`${layer}\``);
      }
      for (const target of ["unit", "component", "l1", "l2"]) {
        expect(isCoverageTargetLevel(target)).toBe(true);
      }
      expect(isCoverageTargetLevel("")).toBe(false);
      expect(preconditions).toContain("A TC with no declared `Level` is not a target here");
      // Not "do not seed a row for it" any more: the four-group rule seeds the
      // `Integration` row for such a TC, which is what gives ATDD something to
      // hand over. What stays forbidden is the coverage-target row.
      expect(preconditions).toContain(
        "What must\nnever be seeded for it is a **coverage-target** row",
      );
      // Gate item 10 reads a row's `Layer` to pick its evidence file, so the
      // producer has to state which `Layer` it writes.
      expect(preconditions).toContain("The `Layer` a seeded row carries");
      expect(preconditions).toContain(".qfai/evidence/implement-<spec-id>.md");
      expect(preconditions).toMatch(/no `Level` column/);
      // The removed claim: only `L1` / `L2` counted as coverage targets.
      //
      // Scoped to the section that answers "what does the gate demand a row
      // for", not the whole file: the **Producer** routing above legitimately
      // names `L1` / `L2` as the first group's allowlist, because every other
      // spelling — unrecognised ones included — is seeded a
      // `Layer = Integration` row instead rather than being skipped. It is
      // this section, which drives the exit decision, that must stay an
      // exclusion list.
      const gateStart = preconditions.indexOf("### What counts as a coverage target");
      const gateEnd = preconditions.indexOf("### The outcomes");
      expect(gateStart).toBeGreaterThan(-1);
      expect(gateEnd).toBeGreaterThan(gateStart);
      expect(preconditions.slice(gateStart, gateEnd)).not.toMatch(/`L1`\s*\/\s*`L2`/);
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
