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
        "plus **one `Layer = Integration` row per integration-level TC** — every `Level`\nwhose ATDD annotation routes to `tests/integration/**`",
      );

      const preconditions = await read(
        tree,
        "assistant/skills/qfai-implement/references/ledger-preconditions.md",
      );
      expect(preconditions).toContain("**one `Layer = Integration` row per integration-level TC**");

      const skill = await read(tree, "assistant/skills/qfai-sdd/SKILL.md");
      expect(skill).toContain(
        "**and one `Layer = Integration` row per\n   integration-level TC** (every `Level` whose ATDD annotation routes to",
      );

      const checklists = await read(
        tree,
        "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
      );
      expect(checklists).toContain(
        "- Add one `Layer = Integration` row per integration-level TC as well, `Status = todo`. Integration-level means **every** `Level` whose ATDD annotation routes to `tests/integration/**`:",
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
      expect(preconditions).toContain(
        "**every** `Level`\n  whose ATDD annotation routes to `tests/integration/**`:",
      );
      expect(preconditions).toContain(
        "**A blank _or unrecognised_ `Level` belongs to the second group**",
      );

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("The two groups are exclusive, and membership is decided by");

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
        "**No validator asks for the second group** — with two exceptions, the blank and\nthe unrecognised `Level` above",
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
    it(`${tree}: a Level moving between the two seeded groups reclassifies the row`, async () => {
      for (const [file, needles] of [
        [
          "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md",
          [
            "crosses between the two seeded groups reclassifies the row",
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
