# SDD Phase Checklists

Use these checklists as the detailed operational guide for `/qfai-sdd`.

## Stage 1: Triage

- Active spec summaries collected; non-active specs filtered out.
- **Append-first applied**: every REQ/NFR is checked against existing
  active specs first; CREATE is reserved for zero subject-token overlap.
- Each REQ/NFR has a classified Operation (one of the 8).
- UPDATE rows declare an explicit Sub-op (APPEND / MODIFY / REMOVE).
- **Impact cascade enumerated**: companion specs whose AC/BR reference
  the changed concept have their own MODIFY/REMOVE rows with the same
  `Source` ID.
- CREATE rows cite a `CAP-NNNN` in Rationale and the CAP exists in
  `_policies/03_Capabilities.md` (`QFAI-TRIAGE-006`).
- Approval-required rows (CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE) carry a recorded `Approved By`.
- Triage table written to `<spec>/09_delta.md` (per-spec) and `_policies/10_delta.md` (cross-spec / policy).
- Stop entry to Phase 0 until the Triage table is complete.

## Phase 0: Contracts-first

- Confirm impacted contract kinds: API, DB, UI.
- Create or update declared contract files.
- Ensure each contract has `QFAI-CONTRACT-ID`.
- Refresh `_policies/05_Contracts.md` Contract Index.
- Stop if an indexed contract file is missing.

## Phase 1: Outline

- Refresh `_policies/01..11`.
- Keep Mermaid inside fenced code blocks only.
- Mirror every unresolved shared issue into `_policies/09_Open-questions.md`.
- Record `0 items` explicitly when decisions or delta are empty.

## Phase 2: Slice

- Create or update `<spec-id>/01..08`.
- Check `US -> AC -> BR -> EX -> TC`.
- Ensure `01_Spec.md` remains the execution Primary SSOT.
- Stop if slice gate fails.

## Phase 2b: Seed `tdd/test-list.md`

- Copy `templates/specs/spec/tdd/test-list.md` when `<spec-id>/tdd/test-list.md` does not exist.
- Seed three groups of rows, all at `Status = todo`:
  - one row per coverage-target TC from `06_Test-Cases.md` (obligation in `TC-Refs`);
  - one `Layer = E2E` row per **active** `US-*` from `02_User-stories.md` (obligation in `US-Refs`, `TC-Refs` = `-`);
  - one `Layer = API` row per **active** `CON-API-*` the spec **owns** (obligation in `CON-API-Refs`, `TC-Refs` = `-`).
- **Active** is the `.qfai/assistant/catalog/test-layers.md` exemption, not "every declared ID": a spec that declares no user-facing surface owes no `US-*` E2E row (`QFAI-ATDD-111` does not fire for it), and a contract declaring `x-qfai-status: planned` is excluded from `QFAI-ATDD-113`. Seeding an exempt obligation parks a completion-prohibiting `todo` row on a test that must not be written.
- **The surface exemption needs surface typing to be in use.** `test-layers.md` scopes `QFAI-ATDD-111` by surface type **only when at least one spec in the project declares a UI-bearing surface**; a project that never declared one has not opted in and the obligation stays project-wide (`atddTraceability.ts` returns "no scope" for it). So check the project first: with no UI-bearing spec anywhere, **every** `US-*` is active and gets an E2E row. Reading the exemption as unconditional leaves a legacy project with zero E2E rows and a `QFAI-ATDD-111` gate that never clears.
- **A surface-typing flip re-runs the E2E delta over every spec.** The precondition above is a property of the project, not of the target, so a run that adds the project's **first** surface signal — or removes its **last** — moves every other spec's `US-*` across the active/exempt line, while this phase otherwise touches the target spec alone. Apply the E2E-row delta to **every** ledger on such a run: losing the last signal returns `QFAI-ATDD-111` to project-wide and each non-target spec then owes E2E rows it has none of; gaining the first one exempts the specs with no surface signal, whose existing E2E rows must be retired. Applied to the target alone, the flip leaves every other spec with either a gate nothing can clear or a `todo` row on a test that must not be written.
- **`Test file` and `Selector` are seeded as `-` on an E2E/API row, and `/qfai-implement` fills them.** The acceptance test does not exist yet, so do not invent a path here. `/qfai-atdd` authors it and never writes this ledger; it records that test's own path and selector as the row identity in its handoff entry, and `/qfai-implement` Phase Red step 3b writes both cells from that entry in the same edit that moves the row out of `todo`. With no writer named, both cells stayed `-` — past the `green` existence check with no test to run, and past gate item 10 with no identity to compare.
- **Which ledger an API row goes in.** `.qfai/contracts/**` has no spec owner in the model, so ownership is resolved mechanically here rather than left to "the spec declares": a spec **owns** a `CON-API-*` that its own `spec-*/01..10` or `16_*` files name, and when several do, the **lowest-numbered** owning spec holds the single row while the others record it as a cross-spec obligation. Never write the same `CON-API-*` row into two ledgers. A `CON-API-*` that no spec names has no owner and gets no row — surface it in Phase 2c instead.
- Without the E2E and API rows the ledger cannot hold a `US-*` / `CON-API-*` obligation at all, so an all-`done` ledger reports complete beside a `QFAI-ATDD-111` / `QFAI-ATDD-113` gate at 0%.
- Delta only: an unchanged TC's row keeps its `TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`. The same holds for an unchanged `US-*` / `CON-API-*` row.
- Reconcile changed and removed TCs: return a changed TC's row to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*` in `DR-ID`), and retire the row of a TC deleted upstream or no longer a coverage target. Never leave a stale `done` row nor a selectable row for a TC that no longer exists.
- Reconcile the obligation rows the same way: append a row for a newly active `US-*` / `CON-API-*`, reset a row whose obligation text changed, and retire the row of one deleted upstream or newly exempt.
- **Migrate an eight-column ledger in the same pass.** Add `US-Refs` and `CON-API-Refs` to its header and move the `US-*` / `CON-API-*` its existing `E2E` / `API` rows recorded in `TC-Refs` — the only cell those rows had before the columns shipped — into the column the row's `Layer` owns, leaving `TC-Refs` at `-`. It is a cell move: `Status`, `DR-ID` and `Evidence` survive. Left unmigrated the row validates (the empty-cell check fires only where the column exists) and then reaches `/qfai-implement` with no obligation in the column it reads.
- Keep the ledger table the first markdown table in the file, and keep the `US-Refs` / `CON-API-Refs` columns in its header — a row of that layer with no column to hold its obligation is unverifiable.
- An empty table is a valid outcome when the spec declares no coverage-target TC and no active `US-*` / `CON-API-*`.

## Phase 2c: Obligation reconciliation

- For every `BR` / `AC` this run produced, name the contract under `.qfai/contracts/**` that realizes it.
- Resolve every persisted attribute the obligation names to a column, field or enum member in that contract.
- When the attribute lives in another relation, state the join that reaches it. No join reaching it means the obligation is unrealizable, however valid both contracts are.
- Fix the contract or the obligation in this phase — both are owned by `/qfai-sdd`, and a mismatch carried downstream reaches an implementer who can fix neither.
- Record the outcome per obligation, not per spec.
- **Close the phase by re-running the Phase 2b API-row delta over the contracts this phase touched.** Naming a realizing contract here is what makes a spec name it, so a `CON-API-*` that had no owner when Phase 2b ran — or whose owner moved to a lower-numbered spec — acquires one only now, and Phase 2b already ran. Append the missing `Layer = API` row at `todo` on the owner ledger and retire a row whose owner moved; otherwise the contract keeps its `QFAI-ATDD-113` obligation with no ledger row anywhere.
- Full rule: `contract-artifact-rules.md#obligation-reconciliation-must--phase-2c`.

## Phase 3: Plan finalize

- Create or update `<spec-id>/10_Plan.md`.
- Keep the file How-only.
- Do not finalize the plan before at least one slice gate passes.

## Phase 4: Delta update

- Update `09_delta.md` or `*_delta.md`.
- A re-run appends to the existing `## Triage`; never open a second `## Triage` H2.
  Add one `### DELTA-NNNN (YYYY-MM-DD)` sub-section per run and put that run's rows
  in it. The same holds for `## Change Summary`: append an entry, do not duplicate
  the heading. `QFAI-TRIAGE-*` reads the first `## Triage` heading only, so rows
  under a dated duplicate heading go unchecked.
- Record adoption and rejection rationale.
- When rejections exist, include `DO NOT` and `Temptation`.
