import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: the resolved root then does not
// depend on the directory Vitest was launched from, so running the suite from
// the repo root and from `packages/qfai` both work.
// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

const TEMPLATE = "assistant/skills/qfai-sdd/templates/change-request.md";

describe("a Change Request is a defined artifact", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the template carries the approval-record fields`, async () => {
      const template = await read(tree, TEMPLATE);
      for (const field of [
        "- ID: `CR-YYYYMMDD-NNNN`",
        "- Status: `open`",
        "- Approved by:",
        "- Approved at:",
        "- Approved option:",
        "- Applied at:",
        "- Superseded by:",
      ]) {
        expect(template).toContain(field);
      }
      expect(template).toContain("open | approved | rejected | superseded");
    });

    it(`${tree}: Applied at separates "approved" from "carried out"`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "`Status: approved` records the operator's decision; `Applied at` records that",
      );

      const drift = await read(tree, "assistant/constitution/drift-protocol.md");
      expect(drift).toContain("fill `Resolution` and set `Applied at`");

      // The gate cites the condition from SKILL.md; the condition itself is
      // stated in the reference under the progressive-disclosure split (#414).
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(flat(skill)).toContain("`Applied at` is populated — approval alone");

      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(flat(reference)).toContain(
        "when `Status` is `approved`, `Applied at` is populated — approval alone does not release the gate",
      );
    });

    it(`${tree}: the approved CR reset is a stated exception to forward-only status`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain(
        "The only exception is an approved Change Request reset (see Status Lifecycle).",
      );
      expect(skill).toContain(
        "Completed items (`done`) are skipped on re-execution, unless an approved Change Request reset them.",
      );
      expect(skill).toContain("`references/change-request-reset.md`");

      const template = await read(tree, TEMPLATE);
      expect(template).toContain("This is the only sanctioned backward status transition");
    });

    it(`${tree}: the reset reference states its preconditions and what stays prohibited`, async () => {
      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(reference).toContain(
        "# Approved Change Request reset (the only sanctioned backward transition)",
      );
      expect(reference).toContain("may reset the rows that change invalidates back to `todo`");
      expect(reference).toContain("records that CR's ID in its `DR-ID` column");
      expect(reference).toContain("A CR at `Status: open` authorises nothing.");
      expect(reference).toContain('"Backward transition prohibited: green -> red"');
      expect(reference).toContain("An `approved` CR without\n`Applied at` is still unresolved");
    });

    it(`${tree}: the reset scope is enumerated before approval`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain("**Enumerate them here, before approval**");
      expect(template).toContain("`Resolution` must match this list");

      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(reference).toContain("**enumerates the rows**");
      expect(reference).toContain("widening the scope needs a new CR");
    });

    it(`${tree}: the DR-ID column and the reset rule agree`, async () => {
      // The ledger column table moved out of SKILL.md into this reference under
      // the progressive-disclosure budget (#414), so the column definition is
      // asserted where it now lives.
      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      // The old wording ("exception items (blank otherwise)") let the CR-ID be
      // cleared on the next transition; no validator reads DR-ID outside
      // `exception`.
      expect(ledger).not.toContain("Decision Record ID for exception items (blank otherwise)");
      expect(ledger).toContain(
        "a `DR-*` is required for `exception` rows, a `CR-*` for a row reset by an approved Change Request and is retained through that row's later statuses",
      );

      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(reference).toContain("the\n  ID is **retained** as the");
    });

    it(`${tree}: a retained CR-ID does not stand in for an exception's DR-ID`, async () => {
      // Exception handling moved alongside the column table into the ledger
      // reference (#414); assert it where it lives.
      const ledger = await read(
        tree,
        "assistant/skills/qfai-implement/references/execution-ledger.md",
      );
      expect(ledger).toContain(
        "A retained `CR-*` does not satisfy this: it records the approved reopen, not the anomaly.",
      );
      expect(ledger).toContain(
        'If the DR-ID column is empty, or holds `CR-*` references only, emit error: `"exception status requires DR-ID in DR-ID column"`',
      );

      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(reference).toContain("## A retained `CR-*` is not an exception's `DR-*`");
      expect(reference).toContain("or holds `CR-*` references only");
    });

    it(`${tree}: the CR reset sweep is a mandatory preflight, not an opportunistic step`, async () => {
      // The normal loop starts at the first `todo` row and exits on all-`done`,
      // so without a preflight an approved reset would never be reached.
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      // #371 folded the Stage-0 steering refresh into the same first phase and
      // #658 the routed `plan` phase, so the heading names all three. The
      // preflight is still first and still mandatory, which is what this case
      // is about.
      const preflightHeading = "### Phase: Stage 0 + Preflight + Plan — MANDATORY, runs first";
      expect(skill).toContain(preflightHeading);
      // The all-terminal exit bullet also carries the spec-level checkpoint
      // obligation added by #304, so assert the preflight clause rather than
      // the whole sentence.
      expect(skill).toContain(
        "**and the mandatory Change Request\n  preflight (see Required Process) reset nothing**",
      );
      expect(skill.indexOf(preflightHeading)).toBeLessThan(
        skill.indexOf("### Phase: Red (Write Failing Test)"),
      );

      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(reference).toContain("## The mandatory preflight");
      expect(reference).toContain("before the ledger is read for any other purpose");
    });

    it(`${tree}: the completion gate covers only CRs in scope for this spec`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("**in scope for this spec**");
      expect(flat(skill)).toContain("a CR confined to another spec never blocks this one");

      // What "in scope" means is defined once, in the reference.
      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(flat(reference)).toContain(
        "`Impact scope` names this spec or a shared policy it depends on, or this spec's artifacts reference it",
      );
    });

    it(`${tree}: the CR reference lands upstream only after approval`, async () => {
      // `09_delta.md` / `07_Decisions.md` are upstream SSOT, so step 2 (before
      // approval) must not write them.
      const drift = await read(tree, "assistant/constitution/drift-protocol.md");
      expect(drift).toContain(
        "Creating this file is the only write this step makes: `09_delta.md`\n   and `07_Decisions.md` are upstream SSOT",
      );
      expect(drift).toContain("written there by the owner skill in step 4, never before approval");
      // #373 made step 4 name the invocation and the rerun mode. The claim this
      // case pins — the reference lands upstream only via that rerun — is
      // unchanged, so it is asserted flattened: the wrap column is not the rule.
      expect(drift.replace(/\s+/g, " ")).toContain(
        "That rerun is what records the CR reference in `09_delta.md` / `07_Decisions.md`.",
      );
      const step2 = drift.slice(drift.indexOf("2. Create a Change Request"), drift.indexOf("3. "));
      expect(step2).not.toContain("Reference it from `09_delta.md`");
    });

    it(`${tree}: superseded requires the approval fields the gate demands`, async () => {
      const template = await read(tree, TEMPLATE);
      expect(template).toContain(
        "required whenever Status leaves `open` (approved / rejected / superseded)",
      );
    });

    it(`${tree}: the template carries the contents the protocol mandates`, async () => {
      const template = await read(tree, TEMPLATE);
      for (const heading of [
        // "Context (what conflicts)" lost its parenthetical in #378: a defect
        // -drift CR conflicts with nothing external, so the heading had to
        // stop presuming a conflict of intent.
        "## Context",
        "## Reproduction",
        "## Proposed change",
        "## Options (at least 3) and recommendation",
        "## Impact scope",
        "## Decision needed from user",
        "## Approved actions (owner skill rerun plan)",
      ]) {
        expect(template).toContain(heading);
      }
    });

    it(`${tree}: the drift protocol pins a path and an ID pattern`, async () => {
      const drift = await read(tree, "assistant/constitution/drift-protocol.md");
      expect(drift).toContain(".qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md");
      expect(drift).toContain("`CR-\\d{8}-\\d{4}`");
      expect(drift).toContain("templates/change-request.md");
    });

    it(`${tree}: DR-ID is documented as the CR carrier`, async () => {
      const rules = await read(
        tree,
        "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
      );
      expect(rules).toContain(
        "`DR-ID` carries Decision Record (`DR-*`) **and** Change Request (`CR-*`)",
      );
    });

    it(`${tree}: "unresolved" has one definition at the completion gate`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      // A single positive definition of "resolved": everything else is
      // unresolved, so a half-filled record cannot slip through. The gate cites
      // it from SKILL.md; the conditions themselves live in the reference under
      // the progressive-disclosure split (#414).
      expect(skill).toContain(
        "`references/change-request-reset.md#when-an-in-scope-cr-counts-as-resolved`",
      );
      expect(flat(skill)).toContain("**unresolved** and blocks completion");
      expect(flat(skill)).toContain(
        "`Status` is `approved`, `rejected` or `superseded` (never `open`)",
      );

      const reference = await read(
        tree,
        "assistant/skills/qfai-implement/references/change-request-reset.md",
      );
      expect(reference).toContain("## When an in-scope CR counts as resolved");
      expect(flat(reference)).toContain("is **resolved** only when every one of these holds");
      expect(flat(reference)).toContain(
        "`Status` is `approved`, `rejected` or `superseded` (never `open`)",
      );
    });
  }
});
