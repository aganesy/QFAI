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

/**
 * Padding-tolerant containment for a markdown table row. Prettier re-pads every
 * cell in a table whenever any one cell's width changes, so pinning a row with
 * its alignment spaces makes an unrelated row edit look like a rule change.
 * Collapse whitespace runs on both sides and compare the cells.
 */
const cells = (s: string): string => s.replace(/\s+/g, " ");

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
      // The "only write" claim now carries one named exception — parking this
      // CR's blocked set in the execution ledger — so it is asserted flattened
      // and paired with the bound that keeps the two SSOT files out of it.
      expect(flat(drift)).toContain(
        "Creating this file is the only write this step makes **outside the raiser's own whitelisted cells**.",
      );
      expect(flat(drift)).toContain(
        "writes nothing else: no other cell, no other file, and no row added",
      );
      expect(flat(drift)).toContain(
        "written there by the owner skill in step 4, never before approval",
      );
      // #373 made step 4 name the invocation and the rerun mode. The claim this
      // case pins — the reference lands upstream only via that rerun — is
      // unchanged, so it is asserted flattened: the wrap column is not the rule.
      expect(flat(drift)).toContain("That rerun is what records the CR reference");
      const step2 = drift.slice(drift.indexOf("2. Create a Change Request"), drift.indexOf("3. "));
      expect(step2).not.toContain("Reference it from `09_delta.md`");
    });

    it(`${tree}: every CR-reference site names the policy-layer filenames too`, async () => {
      // `_policies/` has no `07_Decisions.md` and no `09_delta.md` — there,
      // `07_` is Constraints and `09_` is Open-questions. A step that names the
      // spec-layer pair unqualified sends a policy-level CR reference either
      // into Constraints / Open-questions or into two files the layer does not
      // define, leaving the real homes (`08_`, `10_`) without the approval.
      const drift = flat(await read(tree, "assistant/constitution/drift-protocol.md"));

      // step 4 — the mandated write, per the destination table.
      expect(drift).toContain(
        "That rerun is what records the CR reference, in the destination this table names",
      );
      expect(cells(drift)).toContain(
        cells(
          "| `spec-*/**` files | `/qfai-sdd <spec-id>` | " +
            "`spec-*/09_delta.md`, plus `spec-*/07_Decisions.md` when the CR mints or amends a `DR-*`",
        ),
      );
      expect(cells(drift)).toContain(
        cells(
          "| `_policies/**` | `/qfai-sdd` (no argument) | " +
            "`_policies/10_delta.md`, plus `_policies/08_Decisions.md` when the CR mints or amends a `DR-*`",
        ),
      );
      // step 2 — the same destinations, stated as upstream SSOT.
      expect(drift).toContain(
        "`spec-*/09_delta.md` + `spec-*/07_Decisions.md` for a spec artifact, " +
          "`_policies/10_delta.md` + `_policies/08_Decisions.md` for a policy artifact, " +
          "and the referencing specs' `09_delta.md` for a contract artifact, " +
          "per the destination table in step 4 — are upstream SSOT",
      );
      // the Decision Record carve-out.
      expect(drift).toContain(
        "The entry that cites the DR — `spec-*/07_Decisions.md` + `spec-*/09_delta.md` " +
          "for a spec artifact, or `_policies/08_Decisions.md` + `_policies/10_delta.md` " +
          "for a policy artifact — stays an owner-skill write",
      );
      // the claim that the Decision Record homes are enumerated exhaustively.
      expect(drift).toContain(
        "Every upstream home for a Decision Record (`spec-*/07_Decisions.md`, " +
          "`_policies/08_Decisions.md`) is on the `#core-rule` list above",
      );
      // the core-rule list the other three sites were read out of.
      expect(drift).toContain("spec-layer files under `spec-*/`:");
      expect(drift).toContain(
        "Decisions is `_policies/08_Decisions.md` and delta is `_policies/10_delta.md`",
      );

      // The policy layer's real `07_` / `09_` must not be shadowed anywhere.
      expect(drift).not.toContain("`_policies/07_Decisions.md`");
      expect(drift).not.toContain("`_policies/09_delta.md`");
    });

    it(`${tree}: the contract layer has a CR-reference destination too`, async () => {
      // The invocation table treats `.qfai/contracts/**` as its own upstream
      // class, so an enumeration that branches only spec / policy leaves a
      // contract-only CR with nowhere to record the approval.
      const drift = flat(await read(tree, "assistant/constitution/drift-protocol.md"));
      expect(cells(drift)).toContain(
        cells(
          "| `.qfai/contracts/**` | `/qfai-sdd --contract <CON-ID-or-path>` | " +
            "the `09_delta.md` of every spec that references the contract; " +
            "`_policies/10_delta.md` when the change is cross-spec, and also when " +
            "no spec references the contract at all |",
        ),
      );
      expect(drift).toContain("**A contract CR records in the delta only.**");
      expect(drift).toContain("`--contract` runs Stage 0 + Phase 0 + Phase 4");
    });

    it(`${tree}: the mandated delta write has a field to land in`, async () => {
      // Step 4 makes the delta write unconditional, but neither delta template
      // defined a CR-reference field: `_policies/10_delta.md` carried only a
      // REQ/NFR Triage table plus an empty state, and `spec/09_delta.md` none
      // at all. `qfai-sdd`'s Critical Constraints forbid authoring a layout the
      // template does not define, so the only ways to obey step 4 were to
      // repurpose a Triage row, invent a section, or skip the reference.
      const drift = flat(await read(tree, "assistant/constitution/drift-protocol.md"));
      expect(drift).toContain("**The delta write has a defined shape.**");
      expect(drift).toContain(
        "It is one row in the `## Change Requests` table both delta templates carry — " +
          "`CR ID`, `Upstream artifact`, `Mode`, `Approved by`, `Applied at` — never a " +
          "repurposed `## Triage` row and never a section invented for the occasion.",
      );

      // Both templates define the same section, with the same columns.
      const header = "| CR ID | Upstream artifact | Mode | Approved by | Applied at |";
      for (const template of [
        "assistant/skills/qfai-sdd/templates/specs/spec/09_delta.md",
        "assistant/skills/qfai-sdd/templates/specs/_policies/10_delta.md",
      ]) {
        const delta = flat(await read(tree, template));
        expect(delta, `${template} defines no CR-reference section`).toContain(
          "## Change Requests",
        );
        expect(cells(delta), `${template} CR table columns`).toContain(header);
        expect(delta).toContain(
          "The canonical CR-reference record required by " +
            "`.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected` step 4.",
        );
        // The Triage table must not become the fallback the constraint forced.
        expect(delta).toContain("Do not record a CR as a `## Triage` row");
      }

      // Phase 4 is the step that performs the write, so it has to name the
      // destination — the protocol delegates the "where" to the owner skill.
      const skill = flat(await read(tree, "assistant/skills/qfai-sdd/SKILL.md"));
      expect(skill).toContain(
        "record it as one row in the `## Change Requests` table of the delta",
      );
      const checklists = flat(
        await read(tree, "assistant/skills/qfai-sdd/references/sdd-phase-checklists.md"),
      );
      expect(checklists).toContain(
        "add one row to that delta's `## Change Requests` table — `CR ID`, " +
          "`Upstream artifact`, `Mode`, `Approved by`, `Applied at`",
      );
    });

    it(`${tree}: a contract decision is minted at the layer its blast radius reaches`, async () => {
      // The policy Decisions file is for decisions no single spec owns, so a
      // contract that only one spec references must not have its decision
      // promoted to shared SSOT (and a whole-project rerun) to record it.
      const drift = flat(await read(tree, "assistant/constitution/drift-protocol.md"));
      expect(drift).toContain(
        "mint the `DR-*` where its blast radius lies — `spec-*/07_Decisions.md` " +
          "when exactly one spec references the contract, `_policies/08_Decisions.md` " +
          "when more than one does or none does",
      );
      expect(drift).toContain(
        "The misuse runs the other way — sending a single-spec decision to the " +
          "policy layer promotes to shared SSOT a record the owning spec already " +
          "has a home for",
      );
    });

    it(`${tree}: an unreferenced contract's decision has a policy home the templates admit`, async () => {
      // The destination table sends a contract CR with zero referencing specs
      // to `_policies/`. If those templates only admitted cross-spec entries,
      // the owner skill would have to break either the Drift Protocol or the
      // template, so both layers must state the same rule.
      const drift = flat(await read(tree, "assistant/constitution/drift-protocol.md"));
      expect(drift).toContain(
        "Zero referencing specs still lands in the policy layer: there is no " +
          "spec-level `07_Decisions.md` for such a decision to live in, so the " +
          "policy templates admit a decision no single spec owns and not only a " +
          "cross-spec one.",
      );

      const policyDecisions = flat(
        await read(tree, "assistant/skills/qfai-sdd/templates/specs/_policies/08_Decisions.md"),
      );
      expect(policyDecisions).toContain(
        "Add an entry only when the decision is not spec-local: it genuinely " +
          "crosses specs, or its subject belongs to no spec at all — a decision on " +
          "a contract that no spec references has no `07_Decisions.md` to live in " +
          "and is recorded here.",
      );
      expect(policyDecisions).toContain(
        "Shared Decision Records: decisions no single spec owns — one that crosses " +
          "specs, and one whose subject no spec owns at all.",
      );

      const policyDelta = flat(
        await read(tree, "assistant/skills/qfai-sdd/templates/specs/_policies/10_delta.md"),
      );
      expect(policyDelta).toContain(
        "Add a shared-scope row only when the change is not owned by one spec: it " +
          "is cross-spec, or its subject belongs to no spec at all (a contract no " +
          "spec references).",
      );
    });

    it(`${tree}: a CR that mints no Decision Record writes the delta only`, async () => {
      // Both Decisions templates define only a `### DR-*` block, so a
      // record-less CR entry would be a layout the owner skill invented.
      const drift = flat(await read(tree, "assistant/constitution/drift-protocol.md"));
      expect(drift).toContain("**The delta write is unconditional; the Decisions write is not.**");
      expect(drift).toContain(
        "The CR ID is recorded in a Decision Record's `Related` field, which both " +
          "Decisions templates accept, so a CR that mints no `DR-*` writes the delta only.",
      );

      // ...and "both templates accept" has to be true of the policy one, which
      // listed only specs / capabilities / contracts.
      const specDecisions = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/spec/07_Decisions.md",
      );
      expect(specDecisions).toContain(
        "- Related: the `AC-*` / `BR-*` / `TC-*` / `TDD-*` / `CR-*` this decision binds, or `-`",
      );
      const policyDecisions = await read(
        tree,
        "assistant/skills/qfai-sdd/templates/specs/_policies/08_Decisions.md",
      );
      expect(policyDecisions).toContain(
        "- Related: the specs, capabilities, contracts or `CR-*` this decision binds, or `-`",
      );
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
